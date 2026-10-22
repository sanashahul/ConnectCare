"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { aiEnabled, draftPlanWithAi, type AiProfile, type AiResult } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { requireSupervisor, requireUser } from "@/lib/auth";
import { displayName, encryptProfile, getClientForUser, insertClient, matchingNeeds } from "@/lib/clients";
import { encryptString } from "@/lib/crypto";
import { readIntakeForm, toClientColumns } from "@/lib/intake";
import { CONTACT_TYPES, NEED_KEYS, NEEDS, NOTE_KINDS, PLAN_STATUSES, type NoteKind } from "@/lib/options";
import { encryptPlanBody, decryptPlanBody, type AiSuggestion, type CustomResource } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { redactIdentifiers } from "@/lib/redact";
import { matchResources } from "@/lib/resource-match";
import { getActiveResources, getResource, insertDirectoryResource } from "@/lib/resources";

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

async function clientOr404(id: string) {
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  return { user, client };
}

async function touch(clientId: string) {
  await db.update(schema.clients).set({ updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
}

const dateOrNull = z
  .string()
  .optional()
  .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));

// ---------- Clients ----------

export async function createClient(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get("consent") !== "on") return { error: "Confirm that the client agreed before saving." };
  const parsed = readIntakeForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const cols = toClientColumns({ ...parsed.data, filledOutBy: "staff" });
  // Case managers own the clients they add. Supervisors' new clients go to the intake queue.
  const assignToSelf = user.role === "case_manager";
  const row = await insertClient({
    source: "staff",
    status: assignToSelf ? "active" : "new",
    assignedToId: assignToSelf ? user.id : null,
    assignedAt: assignToSelf ? new Date() : null,
    // Staff entered the needs themselves, so there is nothing to confirm.
    needsConfirmedAt: new Date(),
    county: cols.county,
    city: cols.city,
    needs: cols.needs,
    urgent: cols.urgent,
    profileEnc: encryptProfile({ ...cols.profile, consentAt: new Date().toISOString() }),
  });
  await audit({ userId: user.id, action: "client.created", clientId: row.id, detail: { consent: true } });
  redirect(`/clients/${row.id}`);
}

export async function updateClient(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, client } = await clientOr404(id);
  const parsed = readIntakeForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const cols = toClientColumns({ ...parsed.data, filledOutBy: client.profile.filledOutBy ?? "staff" });
  await db
    .update(schema.clients)
    .set({
      county: cols.county,
      city: cols.city,
      needs: cols.needs,
      urgent: cols.urgent,
      profileEnc: encryptProfile({ ...cols.profile, consentAt: client.profile.consentAt }),
      needsConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, id));
  await audit({ userId: user.id, action: "client.updated", clientId: id });
  redirect(`/clients/${id}`);
}

/** "Getting started" step 2: the case manager checked the need categories with the guest. */
export async function confirmNeeds(form: FormData) {
  const id = String(form.get("clientId") ?? "");
  const { user } = await clientOr404(id);
  await db.update(schema.clients).set({ needsConfirmedAt: new Date(), updatedAt: new Date() }).where(eq(schema.clients.id, id));
  await audit({ userId: user.id, action: "client.needs_confirmed", clientId: id });
  for (const path of [`/clients/${id}`, "/dashboard"]) revalidatePath(path);
}

export type AssignClientState = { ok?: boolean; error?: string; assigneeId?: string; assigneeName?: string } | undefined;

/** Supervisors assign (or reassign / unassign) a client. Returns a result so the form can confirm the save. */
export async function assignClient(_prev: AssignClientState, form: FormData): Promise<AssignClientState> {
  const user = await requireSupervisor();
  const clientId = String(form.get("clientId") ?? "");
  const assigneeId = String(form.get("assigneeId") ?? "");
  const fromQueue = form.get("from") === "queue";
  if (!z.string().uuid().safeParse(clientId).success) return { error: "This client could not be found. Refresh the page and try again." };
  const client = await getClientForUser(user, clientId);
  if (!client) return { error: "This client could not be found. They may have been deleted." };
  if (fromQueue && !assigneeId) return { error: "Choose a case manager first." };
  const assignee = assigneeId
    ? await db.query.users.findFirst({
        where: and(eq(schema.users.id, assigneeId), eq(schema.users.active, true), eq(schema.users.role, "case_manager")),
      })
    : null;
  if (assigneeId && !assignee) return { error: "That case manager's account is no longer active. Refresh the page and pick someone else." };

  if ((assignee?.id ?? null) !== client.assignedToId) {
    await db
      .update(schema.clients)
      .set({
        assignedToId: assignee?.id ?? null,
        assignedAt: assignee ? new Date() : null,
        status: assignee ? (client.status === "closed" ? "closed" : "active") : "new",
        updatedAt: new Date(),
      })
      .where(eq(schema.clients.id, clientId));
    await audit({ userId: user.id, action: "client.assigned", clientId, detail: { assigneeId: assignee?.id ?? null } });
  }
  for (const path of ["/intake-queue", `/clients/${clientId}`, "/clients", "/dashboard", "/team"]) revalidatePath(path);
  if (fromQueue) redirect(`/intake-queue?assigned=${clientId}`);
  return { ok: true, assigneeId: assignee?.id ?? "", assigneeName: assignee?.name };
}

export async function setClientStatus(form: FormData) {
  const id = String(form.get("clientId"));
  const status = String(form.get("status"));
  const { user, client } = await clientOr404(id);
  if (status !== "closed" && status !== "active") return;
  if (status === "active" && !client.assignedToId) return;
  await db
    .update(schema.clients)
    .set({ status, closedAt: status === "closed" ? new Date() : null, updatedAt: new Date() })
    .where(eq(schema.clients.id, id));
  await audit({ userId: user.id, action: status === "closed" ? "client.closed" : "client.reopened", clientId: id });
  revalidatePath(`/clients/${id}`);
}

/** Permanently deletes a client and all notes and plan items (e.g. at the client's request). */
export async function deleteClient(form: FormData) {
  const user = await requireSupervisor();
  const id = String(form.get("clientId"));
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return;
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  await db.delete(schema.clients).where(eq(schema.clients.id, id));
  await audit({ userId: user.id, action: "client.deleted", clientId: id });
  redirect("/clients");
}

// ---------- Contact log ----------

const NoteSchema = z
  .object({
    kind: z.enum(NOTE_KINDS.map((k) => k.key) as [NoteKind, ...NoteKind[]]),
    contactDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    contactType: z.enum(CONTACT_TYPES.map((c) => c.key) as [string, ...string[]]),
    where: z.string().trim().max(300).optional().transform((v) => v || undefined),
    body: z.string().trim().max(10_000),
    needsAddressed: z.array(z.enum(NEED_KEYS as [string, ...string[]])),
    followUpDate: dateOrNull,
  })
  .refine((d) => d.kind === "not_found" || d.body.length > 0, { message: "Write a short note.", path: ["body"] });

export async function addNote(clientId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await clientOr404(clientId);
  const parsed = NoteSchema.safeParse({
    kind: form.get("kind") ?? "met",
    contactDate: form.get("contactDate"),
    // An update is work done without the guest, so how it happened doesn't apply.
    contactType: form.get("kind") === "update" ? "other" : form.get("contactType"),
    where: form.get("kind") === "update" ? undefined : (form.get("where") ?? undefined),
    body: form.get("body") ?? "",
    needsAddressed: form.getAll("needsAddressed").map(String),
    followUpDate: form.get("followUpDate") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  await db.insert(schema.notes).values({
    clientId,
    authorId: user.id,
    kind: d.kind,
    contactDate: d.contactDate,
    contactType: d.contactType as (typeof schema.notes.$inferInsert)["contactType"],
    whereEnc: d.where ? encryptString(d.where) : null,
    needsAddressed: d.needsAddressed,
    bodyEnc: encryptString(d.body),
    followUpDate: d.followUpDate,
  });
  await touch(clientId);
  await audit({ userId: user.id, action: "note.created", clientId, detail: { kind: d.kind } });
  for (const path of [`/clients/${clientId}`, "/dashboard", "/clients"]) revalidatePath(path);
  return { ok: true };
}

// ---------- Care plan ----------

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

const PlanSchema = z.object({
  need: z.enum(NEED_KEYS as [string, ...string[]]),
  title: optionalText(500),
  details: optionalText(2000),
  // "" = no resource, "__custom" = typed in below, anything else = a directory resource id
  resourceId: z.string().optional().transform((v) => v || null),
  dueDate: dateOrNull,
  customName: optionalText(200),
  customPhone: optionalText(100),
  customAddress: optionalText(300),
  customHours: optionalText(300),
  customNotes: optionalText(1000),
  addToDirectory: z.boolean(),
});

export async function addPlanItem(clientId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, client } = await clientOr404(clientId);
  const parsed = PlanSchema.safeParse({
    need: form.get("need"),
    title: form.get("title") ?? undefined,
    details: form.get("details") ?? undefined,
    resourceId: form.get("resourceId") ?? undefined,
    dueDate: form.get("dueDate") ?? undefined,
    customName: form.get("customName") ?? undefined,
    customPhone: form.get("customPhone") ?? undefined,
    customAddress: form.get("customAddress") ?? undefined,
    customHours: form.get("customHours") ?? undefined,
    customNotes: form.get("customNotes") ?? undefined,
    addToDirectory: form.get("addToDirectory") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  let resourceId: string | null = null;
  let resourceName: string | undefined;
  let custom: CustomResource | undefined;
  if (d.resourceId === "__custom") {
    if (!d.customName) return { error: "Type the resource's name." };
    if (d.addToDirectory) {
      // Save to the shared directory so the whole team can find it, and link this step to it.
      const categories = [...(NEEDS.find((n) => n.key === d.need)?.resourceCategories.slice(0, 1) ?? ["other"])];
      const city = client.city && !client.city.startsWith("Other") ? client.city : null;
      resourceId = await insertDirectoryResource(
        {
          name: d.customName,
          categories,
          description: d.customNotes ?? "",
          county: client.county ?? "Multi-county",
          city,
          address: d.customAddress ?? null,
          phones: d.customPhone ? [{ label: "Main", number: d.customPhone }] : [],
          web: null,
          hours: d.customHours ?? null,
          walkIn: null,
          cost: null,
          acceptsMediCal: null,
          languages: [],
          eligibility: null,
          isHotline: false,
          sources: [`Added by ${user.name}`],
          lastVerified: new Date().toISOString().slice(0, 10),
          conflicts: [],
          notes: null,
        },
        user.id,
      );
      await audit({ userId: user.id, action: "resource.created", detail: { resourceId, fromPlan: true } });
    } else {
      custom = {
        name: d.customName,
        phone: d.customPhone,
        address: d.customAddress,
        hours: d.customHours,
        notes: d.customNotes,
      };
    }
    resourceName = d.customName;
  } else if (d.resourceId) {
    const r = await getResource(d.resourceId);
    if (!r) return { error: "That resource no longer exists." };
    resourceId = r.id;
    resourceName = r.name;
  }

  const title = d.title ?? (resourceName ? `Connect with ${resourceName}` : undefined);
  if (!title) return { error: "Describe the step, or pick or type a resource." };
  await db.insert(schema.planItems).values({
    clientId,
    createdById: user.id,
    need: d.need,
    resourceId,
    bodyEnc: encryptPlanBody({ title, details: d.details, custom }),
    dueDate: d.dueDate,
  });
  await touch(clientId);
  await audit({ userId: user.id, action: "plan.created", clientId });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

/** Adds a step drafted by the AI. Vetted-directory steps are verified; outside suggestions are not. */
export async function addAiPlanItem(
  clientId: string,
  item: { need: string; title: string; resourceId?: string | null; suggestion?: AiSuggestion },
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await clientOr404(clientId);
  if (!NEED_KEYS.includes(item.need as (typeof NEED_KEYS)[number])) return { ok: false, error: "Unknown need." };
  const resourceId = item.resourceId && (await getResource(item.resourceId)) ? item.resourceId : null;
  const suggestion = item.suggestion
    ? {
        name: String(item.suggestion.name).slice(0, 200),
        offers: String(item.suggestion.offers).slice(0, 1000),
        contact: String(item.suggestion.contact).slice(0, 300),
        location: String(item.suggestion.location).slice(0, 300),
        sourceUrl: /^https?:\/\//.test(item.suggestion.sourceUrl ?? "") ? String(item.suggestion.sourceUrl).slice(0, 500) : undefined,
        why: String(item.suggestion.why).slice(0, 1000),
      }
    : undefined;
  await db.insert(schema.planItems).values({
    clientId,
    createdById: user.id,
    need: item.need,
    resourceId,
    bodyEnc: encryptPlanBody({ title: String(item.title).slice(0, 500), suggestion }),
    aiSuggested: true,
    verified: !suggestion,
  });
  await touch(clientId);
  await audit({ userId: user.id, action: "plan.created_from_ai", clientId, detail: { verified: !suggestion } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/plan`);
  return { ok: true };
}

export async function updatePlanItem(form: FormData) {
  const itemId = String(form.get("itemId"));
  const item = await db.query.planItems.findFirst({ where: eq(schema.planItems.id, itemId) });
  if (!item) notFound();
  const { user } = await clientOr404(item.clientId);
  const intent = String(form.get("intent"));
  if (intent === "status") {
    const status = String(form.get("status"));
    if (!PLAN_STATUSES.some((s) => s.key === status)) return;
    await db
      .update(schema.planItems)
      .set({ status: status as typeof item.status, statusChangedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.planItems.id, itemId));
  } else if (intent === "verify") {
    // Case manager confirms they checked an AI suggestion (called, visited the site, etc.).
    const body = decryptPlanBody(item.bodyEnc);
    const note = String(form.get("verifyNote") ?? "").trim().slice(0, 500);
    await db
      .update(schema.planItems)
      .set({
        verified: true,
        bodyEnc: encryptPlanBody({ ...body, details: [body.details, note && `Verified: ${note}`].filter(Boolean).join("\n") || undefined }),
        updatedAt: new Date(),
      })
      .where(eq(schema.planItems.id, itemId));
  } else if (intent === "delete") {
    await db.delete(schema.planItems).where(eq(schema.planItems.id, itemId));
  } else return;
  await touch(item.clientId);
  await audit({ userId: user.id, action: `plan.${intent}`, clientId: item.clientId });
  for (const path of [`/clients/${item.clientId}`, `/clients/${item.clientId}/plan`, "/dashboard", "/tasks"]) revalidatePath(path);
}

// ---------- AI ----------

export async function runAiPlanner(clientId: string, question: string): Promise<AiResult> {
  const { user, client } = await clientOr404(clientId);
  if (!aiEnabled()) return { ok: false, error: "The AI assistant is turned off for this site." };
  if (!(await rateLimit(`ai:${user.id}`, 20, 60 * 60_000))) return { ok: false, error: "AI limit reached for this hour." };
  if (matchingNeeds(client).length === 0) return { ok: false, error: "Add at least one need to the client profile first." };

  const p = client.profile;
  const profile: AiProfile = {
    county: client.county,
    needs: matchingNeeds(client),
    ageRange: p.ageRange ?? null,
    language: p.language ?? null,
    insurance: p.insurance ?? null,
    sleeping: p.sleeping ?? null,
    urgent: client.urgent,
    hasVehicle: !!p.hasVehicle,
    hasPets: !!p.hasPets,
    hasChildren: !!p.hasChildren,
  };
  const resources = await getActiveResources();
  const matches = matchResources(resources, { ...profile, city: client.city, ageRange: p.ageRange, language: p.language, insurance: p.insurance });
  const directory = resources.filter(
    (r) => !client.county || r.county === client.county || r.county === "Multi-county",
  );
  const cleanQuestion = redactIdentifiers(question.slice(0, 600), [p.firstName, p.lastName ?? "", displayName(p)]);

  // Audit what kind of data left the system, never the values themselves.
  await audit({
    userId: user.id,
    action: "ai.plan_requested",
    clientId,
    detail: { fields: Object.keys(profile), questionChars: cleanQuestion.length },
  });
  return draftPlanWithAi({ profile, matches, directory, question: cleanQuestion || undefined });
}
