import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CurrentUser } from "./auth";
import { decryptString } from "./crypto";
import { needLabel } from "./options";
import { decryptPlanBody } from "./plan";

// One to-do list per staff member, combining:
//   - open plan steps (To do / Referred) for clients assigned to them
//   - each client's latest follow-up date from the contact log
//   - their own tasks
// The order is theirs to arrange (todo_state.position); new items go below arranged ones by due date.

export type TodoItem = {
  key: string;
  kind: "task" | "plan" | "followup";
  text: string;
  clientId?: string;
  clientCode?: string;
  need?: string;
  dueDate?: string;
  urgent?: boolean;
};

export const TODO_KEY_PATTERN = /^(task:[0-9a-f-]{36}|plan:[0-9a-f-]{36}|followup:[0-9a-f-]{36}:\d{4}-\d{2}-\d{2})$/;

export async function todoItemsFor(user: CurrentUser): Promise<TodoItem[]> {
  const myClients = await db
    .select({ id: schema.clients.id, code: schema.clients.clientCode, urgent: schema.clients.urgent })
    .from(schema.clients)
    .where(and(eq(schema.clients.assignedToId, user.id), eq(schema.clients.status, "active")));
  const clientById = new Map(myClients.map((c) => [c.id, c]));
  const clientIds = myClients.map((c) => c.id);

  const items: (TodoItem & { createdAt: number })[] = [];

  if (clientIds.length > 0) {
    const plan = await db
      .select()
      .from(schema.planItems)
      .where(and(inArray(schema.planItems.clientId, clientIds), inArray(schema.planItems.status, ["todo", "referred"])));
    for (const p of plan) {
      const c = clientById.get(p.clientId)!;
      items.push({
        key: `plan:${p.id}`,
        kind: "plan",
        text: decryptPlanBody(p.bodyEnc).title,
        clientId: c.id,
        clientCode: c.code,
        need: needLabel(p.need),
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
        text: `Follow up with ${c.code}`,
        clientId,
        clientCode: c.code,
        dueDate: f.date,
        urgent: c.urgent,
        createdAt: f.at,
      });
    }
  }

  const tasks = await db
    .select({ task: schema.tasks, code: schema.clients.clientCode })
    .from(schema.tasks)
    .leftJoin(schema.clients, eq(schema.tasks.clientId, schema.clients.id))
    .where(and(eq(schema.tasks.userId, user.id), isNull(schema.tasks.doneAt)));
  for (const { task, code } of tasks) {
    items.push({
      key: `task:${task.id}`,
      kind: "task",
      text: decryptString(task.textEnc),
      clientId: task.clientId ?? undefined,
      clientCode: code ?? undefined,
      dueDate: task.dueDate ?? undefined,
      createdAt: task.createdAt.getTime(),
    });
  }

  const state = await db.select().from(schema.todoState).where(eq(schema.todoState.userId, user.id));
  const position = new Map(state.filter((s) => s.position !== null).map((s) => [s.itemKey, s.position!]));
  const done = new Set(state.filter((s) => s.doneAt).map((s) => s.itemKey));

  return orderTodos(items.filter((i) => !done.has(i.key)), position).map(({ createdAt: _c, ...rest }) => rest);
}

/** Arranged items first (by position), then the rest by due date, then oldest first. */
export function orderTodos<T extends { key: string; dueDate?: string; createdAt: number }>(
  items: T[],
  position: Map<string, number>,
): T[] {
  return [...items].sort((a, b) => {
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
