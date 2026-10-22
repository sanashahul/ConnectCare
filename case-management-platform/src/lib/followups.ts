import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";

/** Most recent follow-up date per client (from the latest note that set one), plus open plan item due dates. */
export async function followUpsFor(clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ clientId: schema.notes.clientId, followUpDate: schema.notes.followUpDate, createdAt: schema.notes.createdAt })
    .from(schema.notes)
    .where(and(inArray(schema.notes.clientId, clientIds), isNotNull(schema.notes.followUpDate)));
  const latest = new Map<string, { date: string; at: number }>();
  for (const r of rows) {
    const prev = latest.get(r.clientId);
    if (!prev || r.createdAt.getTime() > prev.at) latest.set(r.clientId, { date: r.followUpDate!, at: r.createdAt.getTime() });
  }
  const items = await db
    .select({ clientId: schema.planItems.clientId, dueDate: schema.planItems.dueDate })
    .from(schema.planItems)
    .where(
      and(
        inArray(schema.planItems.clientId, clientIds),
        isNotNull(schema.planItems.dueDate),
        ne(schema.planItems.status, "done"),
        ne(schema.planItems.status, "unable"),
      ),
    );
  const result = new Map<string, string>();
  for (const [id, v] of latest) result.set(id, v.date);
  for (const i of items) {
    const cur = result.get(i.clientId);
    if (!cur || i.dueDate! < cur) result.set(i.clientId, i.dueDate!);
  }
  return result;
}

export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export async function caseManagers() {
  return db.query.users.findMany({
    where: and(eq(schema.users.role, "case_manager"), eq(schema.users.active, true)),
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

/** Active case managers with how many active clients each has, for assignment dropdowns. */
export async function caseManagerOptions() {
  const [cms, active] = await Promise.all([
    caseManagers(),
    db.select({ a: schema.clients.assignedToId }).from(schema.clients).where(eq(schema.clients.status, "active")),
  ]);
  const load = new Map<string, number>();
  for (const r of active) if (r.a) load.set(r.a, (load.get(r.a) ?? 0) + 1);
  return cms.map((cm) => ({ id: cm.id, name: cm.name, load: load.get(cm.id) ?? 0 }));
}
