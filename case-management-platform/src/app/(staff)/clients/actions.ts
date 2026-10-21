"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { aiEnabled, draftPlanWithAi, type AiProfile, type AiResult } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { requireSupervisor, requireUser } from "@/lib/auth";
import { displayName, encryptProfile, getClientForUser } from "@/lib/clients";
import { encryptString } from "@/lib/crypto";
import { readIntakeForm, toClientColumns } from "@/lib/intake";
import { CONTACT_TYPES, NEED_KEYS, PLAN_STATUSES } from "@/lib/options";
import { encryptPlanBody, decryptPlanBody, type AiSuggestion } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { redactIdentifiers } from "@/lib/redact";
import { matchResources } from "@/lib/resource-match";
import { getActiveResources, getResource } from "@/lib/resources";

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
  const parsed = readIntakeForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const cols = toClientColumns({ ...parsed.data, filledOutBy: "staff" });
  // Case managers own the clients they add. Supervisors' new clients go to the intake queue.
  const assignToSelf = user.role === "case_manager";
  const [row] = await db
    .insert(schema.clients)
    .values({
      source: "staff",
      status: assignToSelf ? "active" : "new",
      assignedToId: assignToSelf ? user.id : null,
      assignedAt: assignToSelf ? new Date() : null,
      county: cols.county,
      city: cols.city,
      needs: cols.needs,
      urgent: cols.urgent,
      profileEnc: encryptProfile(cols.profile),
    })
    .returning({ id: schema.clients.id });
  await audit({ userId: user.id, action: "client.created", clientId: row.id });
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
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, id));
  await audit({ userId: user.id, action: "client.updated", clientId: id });
  redirect(`/clients/${id}`);
}

export async function assignClient(form: FormData) {
  const user = await requireSupervisor();
  const clientId = String(form.get("clientId"));
  const assigneeId = String(form.get("assigneeId") ?? "");
  const client = await getClientForUser(user, clientId);
  if (!client) notFound();
  const assignee = assigneeId
    ? await db.query.users.findFirst({ where: and(eq(schema.users.id, assigneeId), eq(schema.users.active, true)) })
    : null;
  if (assigneeId && !assignee) return;
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
  revalidatePath("/intake-queue");
  revalidatePath(`/clients/${clientId}`);
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

const NoteSchema = z.object({
  contactDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  contactType: z.enum(CONTACT_TYPES.map((c) => c.key) as [string, ...string[]]),
  body: z.string().trim().min(1, "Write a short note.").max(10_000),
  needsAddressed: z.array(z.enum(NEED_KEYS as [string, ...string[]])),
  followUpDate: dateOrNull,
});

export async function addNote(clientId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await clientOr404(clientId);
  const parsed = NoteSchema.safeParse({
    contactDate: form.get("contactDate"),
    contactType: form.get("contactType"),
    body: form.get("body"),
    needsAddressed: form.getAll("needsAddressed").map(String),
    followUpDate: form.get("followUpDate") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  await db.insert(schema.notes).values({
    clientId,
    authorId: user.id,
    contactDate: d.contactDate,
    contactType: d.contactType as (typeof schema.notes.$inferInsert)["contactType"],
    needsAddressed: d.needsAddressed,
    bodyEnc: encryptString(d.body),
    followUpDate: d.followUpDate,
  });
  await touch(clientId);
  await audit({ userId: user.id, action: "note.created", clientId });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

// ---------- Care plan ----------

const PlanSchema = z.object({
  need: z.enum(NEED_KEYS as [string, ...string[]]),
  title: z.string().trim().min(1, "Describe the step.").max(500),
  details: z.string().trim().max(2000).optional(),
  resourceId: z.string().optional().transform((v) => v || null),
  dueDate: dateOrNull,
});

export async function addPlanItem(clientId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await clientOr404(clientId);
  const parsed = PlanSchema.safeParse({
    need: form.get("need"),
    title: form.get("title"),
    details: form.get("details") ?? undefined,
    resourceId: form.get("resourceId") ?? undefined,
    dueDate: form.get("dueDate") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  if (d.resourceId && !(await getResource(d.resourceId))) return { error: "That resource no longer exists." };
  await db.insert(schema.planItems).values({
    clientId,
    createdById: user.id,
    need: d.need,
    resourceId: d.resourceId,
    bodyEnc: encryptPlanBody({ title: d.title, details: d.details || undefined }),
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
      .set({ status: status as typeof item.status, updatedAt: new Date() })
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
  revalidatePath(`/clients/${item.clientId}`);
  revalidatePath(`/clients/${item.clientId}/plan`);
}

// ---------- AI ----------

export async function runAiPlanner(clientId: string, question: string): Promise<AiResult> {
  const { user, client } = await clientOr404(clientId);
  if (!aiEnabled()) return { ok: false, error: "The AI assistant is turned off for this site." };
  if (!rateLimit(`ai:${user.id}`, 20, 60 * 60_000)) return { ok: false, error: "AI limit reached for this hour." };
  if (client.needs.length === 0) return { ok: false, error: "Add at least one need to the client profile first." };

  const p = client.profile;
  const profile: AiProfile = {
    county: client.county,
    needs: client.needs,
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
