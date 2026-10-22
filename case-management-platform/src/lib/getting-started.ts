import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

// A short checklist for each newly assigned client, so a new case manager knows where to start.

export const GETTING_STARTED_STEPS = [
  { key: "met", label: "Contact them and log a first contact" },
  { key: "needs", label: "Confirm their needs" },
  { key: "plan", label: "Add 1 to 3 plan steps" },
  { key: "printed", label: "Print their resource sheet" },
] as const;
export type GettingStartedKey = (typeof GETTING_STARTED_STEPS)[number]["key"];

/** Shown for this long after a client is assigned; older clients don't get the checklist. */
export const GETTING_STARTED_DAYS = 30;

export type GettingStarted = { done: Record<GettingStartedKey, boolean>; count: number; next?: GettingStartedKey };

export function summarize(done: Record<GettingStartedKey, boolean>): GettingStarted {
  const count = GETTING_STARTED_STEPS.filter((s) => done[s.key]).length;
  return { done, count, next: GETTING_STARTED_STEPS.find((s) => !done[s.key])?.key };
}

/** Whether a client should show the checklist: recently assigned and not finished. */
export function showGettingStarted(client: { assignedAt: Date | null }, g: GettingStarted | undefined, now = new Date()): boolean {
  if (!g || g.count === GETTING_STARTED_STEPS.length || !client.assignedAt) return false;
  return now.getTime() - client.assignedAt.getTime() < GETTING_STARTED_DAYS * 86_400_000;
}

export async function gettingStartedFor(
  clients: { id: string; needsConfirmedAt: Date | null }[],
): Promise<Map<string, GettingStarted>> {
  const out = new Map<string, GettingStarted>();
  if (clients.length === 0) return out;
  const ids = clients.map((c) => c.id);
  const [met, plan, printed] = await Promise.all([
    db
      .selectDistinct({ id: schema.notes.clientId })
      .from(schema.notes)
      .where(and(inArray(schema.notes.clientId, ids), eq(schema.notes.kind, "met"))),
    db.selectDistinct({ id: schema.planItems.clientId }).from(schema.planItems).where(inArray(schema.planItems.clientId, ids)),
    db
      .selectDistinct({ id: schema.auditLog.clientId })
      .from(schema.auditLog)
      .where(and(inArray(schema.auditLog.clientId, ids), eq(schema.auditLog.action, "client.printed"))),
  ]);
  const has = (rows: { id: string | null }[]) => new Set(rows.map((r) => r.id));
  const [metSet, planSet, printedSet] = [has(met), has(plan), has(printed)];
  for (const c of clients) {
    out.set(
      c.id,
      summarize({ met: metSet.has(c.id), needs: !!c.needsConfirmedAt, plan: planSet.has(c.id), printed: printedSet.has(c.id) }),
    );
  }
  return out;
}
