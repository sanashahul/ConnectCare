"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { encryptString } from "@/lib/crypto";
import { PRIORITIES, TODO_KEY_PATTERN, type Priority } from "@/lib/todos";

export type TaskState = { error?: string; ok?: boolean } | undefined;

const TaskSchema = z.object({
  text: z.string().trim().min(1, "Write the task.").max(500),
  dueDate: z.string().optional().transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  clientId: z.string().optional().transform((v) => v || null),
});

export async function addTask(_: TaskState, form: FormData): Promise<TaskState> {
  const user = await requireUser();
  const parsed = TaskSchema.safeParse({ text: form.get("text"), dueDate: form.get("dueDate") ?? undefined, clientId: form.get("clientId") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.clientId && !(await getClientForUser(user, d.clientId))) return { error: "That client isn't one of yours." };
  await db.insert(schema.tasks).values({ userId: user.id, textEnc: encryptString(d.text), dueDate: d.dueDate, clientId: d.clientId });
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { ok: true };
}

/** Ticks an item off: finishes a task, marks a plan step Done, or dismisses a follow-up date. */
export async function completeTodo(key: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!TODO_KEY_PATTERN.test(key)) return { ok: false };
  const [kind, id] = key.split(":");
  if (kind === "task") {
    await db.update(schema.tasks).set({ doneAt: new Date() }).where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.id)));
  } else if (kind === "plan") {
    const item = await db.query.planItems.findFirst({ where: eq(schema.planItems.id, id) });
    if (!item || !(await getClientForUser(user, item.clientId))) return { ok: false };
    await db.update(schema.planItems).set({ status: "done", updatedAt: new Date() }).where(eq(schema.planItems.id, id));
    await audit({ userId: user.id, action: "plan.status", clientId: item.clientId, detail: { status: "done", from: "todo" } });
  } else {
    if (!(await getClientForUser(user, id))) return { ok: false };
    await db
      .insert(schema.todoState)
      .values({ userId: user.id, itemKey: key, doneAt: new Date() })
      .onConflictDoUpdate({ target: [schema.todoState.userId, schema.todoState.itemKey], set: { doneAt: new Date() } });
  }
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { ok: true };
}

/** Moves a plan step along To do → Referred → Connected → Done from the dashboard. */
export async function setPlanStatus(key: string, status: "todo" | "referred" | "connected" | "done"): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!/^plan:[0-9a-f-]{36}$/.test(key) || !["todo", "referred", "connected", "done"].includes(status)) return { ok: false };
  const id = key.slice("plan:".length);
  const item = await db.query.planItems.findFirst({ where: eq(schema.planItems.id, id) });
  if (!item || !(await getClientForUser(user, item.clientId))) return { ok: false };
  await db.update(schema.planItems).set({ status, updatedAt: new Date() }).where(eq(schema.planItems.id, id));
  await audit({ userId: user.id, action: "plan.status", clientId: item.clientId, detail: { status, from: "todo_list" } });
  revalidatePath(`/clients/${item.clientId}`);
  return { ok: true };
}

export async function deleteTask(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db.delete(schema.tasks).where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.id)));
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function setTodoPriority(key: string, priority: Priority): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!TODO_KEY_PATTERN.test(key) || !PRIORITIES.includes(priority)) return { ok: false };
  await db
    .insert(schema.todoState)
    .values({ userId: user.id, itemKey: key, priority })
    .onConflictDoUpdate({ target: [schema.todoState.userId, schema.todoState.itemKey], set: { priority } });
  return { ok: true };
}

/** Saves the order the person arranged their list in. */
export async function saveTodoOrder(keys: string[]): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!Array.isArray(keys) || keys.length > 500 || !keys.every((k) => typeof k === "string" && TODO_KEY_PATTERN.test(k))) {
    return { ok: false };
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.todoState).set({ position: null }).where(eq(schema.todoState.userId, user.id));
    if (keys.length === 0) return;
    await tx
      .insert(schema.todoState)
      .values(keys.map((itemKey, position) => ({ userId: user.id, itemKey, position })))
      .onConflictDoUpdate({
        target: [schema.todoState.userId, schema.todoState.itemKey],
        set: { position: sql`excluded.position` },
      });
  });
  return { ok: true };
}
