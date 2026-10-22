"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireSupervisor, requireUser } from "@/lib/auth";
import { RESOURCE_CATEGORIES, type Resource } from "@/lib/resource-types";
import { getResource, insertDirectoryResource } from "@/lib/resources";
import { todayIso } from "@/lib/followups";

export type ResourceFormState = { error?: string; ok?: boolean } | undefined;

export async function flagResource(resourceId: string, _: ResourceFormState, form: FormData): Promise<ResourceFormState> {
  const user = await requireUser();
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);
  if (!message) return { error: "Describe the problem." };
  if (!(await getResource(resourceId))) notFound();
  await db.insert(schema.resourceFlags).values({ resourceId, reportedById: user.id, message });
  await audit({ userId: user.id, action: "resource.flagged", detail: { resourceId } });
  revalidatePath(`/resources/${resourceId}`);
  return { ok: true };
}

export async function resolveFlag(form: FormData) {
  const user = await requireSupervisor();
  const flagId = String(form.get("flagId"));
  const [flag] = await db
    .update(schema.resourceFlags)
    .set({ resolved: true, resolvedById: user.id })
    .where(eq(schema.resourceFlags.id, flagId))
    .returning();
  if (flag) revalidatePath(`/resources/${flag.resourceId}`);
}

export async function markVerified(form: FormData) {
  const user = await requireSupervisor();
  const id = String(form.get("resourceId"));
  await db.update(schema.resources).set({ lastVerified: todayIso(), updatedAt: new Date(), updatedById: user.id }).where(eq(schema.resources.id, id));
  await audit({ userId: user.id, action: "resource.verified", detail: { resourceId: id } });
  revalidatePath(`/resources/${id}`);
}

export async function setResourceActive(form: FormData) {
  const user = await requireSupervisor();
  const id = String(form.get("resourceId"));
  const active = form.get("active") === "true";
  await db.update(schema.resources).set({ active, updatedAt: new Date(), updatedById: user.id }).where(eq(schema.resources.id, id));
  await audit({ userId: user.id, action: active ? "resource.activated" : "resource.archived", detail: { resourceId: id } });
  revalidatePath(`/resources/${id}`);
}

const ResourceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categories: z.array(z.enum(RESOURCE_CATEGORIES.map((c) => c.key) as [string, ...string[]])).min(1, "Pick at least one category."),
  description: z.string().trim().min(1).max(2000),
  county: z.enum(["Santa Clara", "San Mateo", "Multi-county"]),
  city: z.string().trim().max(100),
  address: z.string().trim().max(300),
  phones: z.string().max(1000),
  web: z.string().trim().max(300),
  hours: z.string().trim().max(500),
  walkIn: z.enum(["yes", "no", ""]),
  cost: z.enum(["free", "sliding_scale", "low_cost", "varies", ""]),
  acceptsMediCal: z.boolean(),
  languages: z.string().max(300),
  eligibility: z.string().trim().max(500),
  isHotline: z.boolean(),
  notes: z.string().trim().max(1000),
  clearConflicts: z.boolean(),
});

function parseResourceForm(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "");
  return ResourceSchema.safeParse({
    name: s("name"),
    categories: form.getAll("categories").map(String),
    description: s("description"),
    county: s("county"),
    city: s("city"),
    address: s("address"),
    phones: s("phones"),
    web: s("web"),
    hours: s("hours"),
    walkIn: s("walkIn"),
    cost: s("cost"),
    acceptsMediCal: form.get("acceptsMediCal") === "on",
    languages: s("languages"),
    eligibility: s("eligibility"),
    isHotline: form.get("isHotline") === "on",
    notes: s("notes"),
    clearConflicts: form.get("clearConflicts") === "on",
  });
}

function toResourceData(id: string, d: z.infer<typeof ResourceSchema>, prev?: Resource): Resource {
  const phones = d.phones
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?):\s*(.+)$/);
      return m ? { label: m[1].trim(), number: m[2].trim() } : { label: "Main", number: l };
    });
  return {
    id,
    name: d.name,
    categories: d.categories,
    description: d.description,
    county: d.county,
    city: d.city || null,
    address: d.address || null,
    phones,
    web: d.web || null,
    hours: d.hours || null,
    walkIn: d.walkIn === "yes" ? true : d.walkIn === "no" ? false : null,
    cost: d.cost || null,
    acceptsMediCal: d.acceptsMediCal ? true : null,
    languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean),
    eligibility: d.eligibility || null,
    isHotline: d.isHotline,
    sources: prev?.sources ?? ["Added by staff"],
    lastVerified: todayIso(),
    conflicts: d.clearConflicts ? [] : prev?.conflicts ?? [],
    notes: d.notes || null,
  };
}

// Anyone on the team can add a resource; editing existing ones is for supervisors.
export async function saveResource(existingId: string | null, _: ResourceFormState, form: FormData): Promise<ResourceFormState> {
  const user = existingId ? await requireSupervisor() : await requireUser();
  const parsed = parseResourceForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (existingId) {
    const prev = await getResource(existingId);
    if (!prev) notFound();
    const data = toResourceData(existingId, parsed.data, prev);
    await db
      .update(schema.resources)
      .set({ data, lastVerified: data.lastVerified, updatedAt: new Date(), updatedById: user.id })
      .where(eq(schema.resources.id, existingId));
    await audit({ userId: user.id, action: "resource.updated", detail: { resourceId: existingId } });
    redirect(`/resources/${existingId}`);
  }
  const { id: _id, ...data } = toResourceData("", parsed.data);
  data.sources = [`Added by ${user.name}`];
  const id = await insertDirectoryResource(data, user.id);
  await audit({ userId: user.id, action: "resource.created", detail: { resourceId: id } });
  redirect(`/resources/${id}`);
}
