import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { displayName, type ClientProfile } from "./clients";
import { decryptJson, decryptString } from "./crypto";
import { needLabel } from "./options";
import { decryptPlanBody } from "./plan";

// One to-do list per staff member, combining:
//   - unfinished plan steps (To do / Referred / Connected) for clients assigned to them
//   - each client's latest follow-up date from the contact log
//   - their own tasks
// Items are grouped by priority (Urgent, High, Medium). Within a group the order is theirs to arrange
// (todo_state.position); new items go below arranged ones by due date.

import { PRIORITIES, type Priority } from "./priorities";
export { PRIORITIES, type Priority };

export type TodoItem = {
  key: string;
  kind: "task" | "plan" | "followup";
  text: string;
  priority: Priority;
  clientId?: string;
  clientName?: string;
  clientCode?: string;
  need?: string;
  /** Plan steps only: where the step stands. */
  status?: "todo" | "referred" | "connected";
  dueDate?: string;
  urgent?: boolean;
};

/** Plan step statuses that still belong on the to-do list. */
export const OPEN_PLAN_STATUSES = ["todo", "referred", "connected"] as const;

export const TODO_KEY_PATTERN = /^(task:[0-9a-f-]{36}|plan:[0-9a-f-]{36}|followup:[0-9a-f-]{36}:\d{4}-\d{2}-\d{2})$/;

/** The to-do list for one staff member (also used, read-only, when a supervisor views it). */
export async function todoItemsFor(user: { id: string }): Promise<TodoItem[]> {
  const myClients = await db
    .select({ id: schema.clients.id, code: schema.clients.clientCode, urgent: schema.clients.urgent, profileEnc: schema.clients.profileEnc })
    .from(schema.clients)
    .where(and(eq(schema.clients.assignedToId, user.id), eq(schema.clients.status, "active")));
  const clientById = new Map(
    myClients.map((c) => [c.id, { ...c, name: displayName(decryptJson<ClientProfile>(c.profileEnc)) }]),
  );
  const clientIds = myClients.map((c) => c.id);

  type Draft = Omit<TodoItem, "priority"> & { createdAt: number };
  const items: Draft[] = [];

  if (clientIds.length > 0) {
    const plan = await db
      .select()
      .from(schema.planItems)
      .where(and(inArray(schema.planItems.clientId, clientIds), inArray(schema.planItems.status, [...OPEN_PLAN_STATUSES])));
    for (const p of plan) {
      const c = clientById.get(p.clientId)!;
      items.push({
        key: `plan:${p.id}`,
        kind: "plan",
        text: decryptPlanBody(p.bodyEnc).title,
        clientId: c.id,
        clientName: c.name,
        clientCode: c.code,
        need: needLabel(p.need),
        status: p.status as TodoItem["status"],
        dueDate: p.dueDate ?? undefined,
        urgent: c.urgent,
        createdAt: p.createdAt.getTime(),
      });
    }

    // Latest follow-up date per client (from the most recent note that set one).
    const notes = await db
      .select({ clientId: schema.notes.clientId, followUpDate: schema.notes.followUpDate, createdAt: schema.notes.createdAt })
      .from(schema.notes)
      .where(and(inArray(schema.notes.clientId, clientIds), isNotNull(schema.notes.followUpDate)));
    const latest = new Map<string, { date: string; at: number }>();
    for (const n of notes) {
      const prev = latest.get(n.clientId);
      if (!prev || n.createdAt.getTime() > prev.at) latest.set(n.clientId, { date: n.followUpDate!, at: n.createdAt.getTime() });
    }
    for (const [clientId, f] of latest) {
      const c = clientById.get(clientId)!;
      items.push({
        key: `followup:${clientId}:${f.date}`,
        kind: "followup",
        text: `Follow up with ${c.name}`,
        clientId,
        clientName: c.name,
        clientCode: c.code,
        dueDate: f.date,
        urgent: c.urgent,
        createdAt: f.at,
      });
    }
  }

  const tasks = await db
    .select({ task: schema.tasks, code: schema.clients.clientCode, profileEnc: schema.clients.profileEnc })
    .from(schema.tasks)
    .leftJoin(schema.clients, eq(schema.tasks.clientId, schema.clients.id))
    .where(and(eq(schema.tasks.userId, user.id), isNull(schema.tasks.doneAt)));
  for (const { task, code, profileEnc } of tasks) {
    items.push({
      key: `task:${task.id}`,
      kind: "task",
      text: decryptString(task.textEnc),
      clientId: task.clientId ?? undefined,
      clientName: profileEnc ? displayName(decryptJson<ClientProfile>(profileEnc)) : undefined,
      clientCode: code ?? undefined,
      dueDate: task.dueDate ?? undefined,
      createdAt: task.createdAt.getTime(),
    });
  }

  const state = await db.select().from(schema.todoState).where(eq(schema.todoState.userId, user.id));
  const position = new Map(state.filter((s) => s.position !== null).map((s) => [s.itemKey, s.position!]));
  const done = new Set(state.filter((s) => s.doneAt).map((s) => s.itemKey));
  const chosen = new Map(state.filter((s) => s.priority).map((s) => [s.itemKey, s.priority as Priority]));

  const withPriority = items
    .filter((i) => !done.has(i.key))
    .map((i) => ({ ...i, priority: chosen.get(i.key) ?? (i.urgent ? "urgent" : "medium") }) as TodoItem & { createdAt: number });
  return orderTodos(withPriority, position).map(({ createdAt: _c, ...rest }) => rest);
}

/** Urgent, then High, then Medium. Within each: arranged items (by position), then by due date, then oldest first. */
export function orderTodos<T extends { key: string; priority: Priority; dueDate?: string; createdAt: number }>(
  items: T[],
  position: Map<string, number>,
): T[] {
  return [...items].sort((a, b) => {
    const rank = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    if (rank !== 0) return rank;
    const pa = position.get(a.key);
    const pb = position.get(b.key);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    const da = a.dueDate ?? "9999-12-31";
    const dbb = b.dueDate ?? "9999-12-31";
    return da.localeCompare(dbb) || a.createdAt - b.createdAt;
  });
}
