import assert from "node:assert/strict";
import { test } from "node:test";
import { pickDoFirst } from "../src/lib/do-first";
import type { TodoItem } from "../src/lib/todos";

const today = "2026-10-22";
const todo = (key: string, clientId: string | undefined, extra: Partial<TodoItem> = {}): TodoItem => ({
  key,
  kind: "plan",
  status: "todo",
  text: key,
  priority: "medium",
  clientId,
  clientName: clientId,
  ...extra,
});

test("at most one item per client, most pressing first", () => {
  const { items } = pickDoFirst({
    todos: [
      todo("a1", "Ana", { dueDate: "2026-10-20" }),
      todo("a2", "Ana", { dueDate: "2026-10-18" }),
      todo("a3", "Ana", { priority: "urgent" }),
      todo("a4", "Ana", { dueDate: today }),
      todo("b1", "Ben", { dueDate: today }),
      todo("c1", "Cy", { priority: "urgent" }),
    ],
    clients: [],
    today,
  });
  assert.deepEqual(items.map((i) => i.key), ["a2", "b1", "c1"]);
  assert.equal(items[0].reason, "overdue");
  assert.equal(items[0].action, "advance");
  assert.equal(items[0].advance?.status, "referred");
});

test("not-reached and new guests appear when nothing more pressing is due, and the list stops at 5", () => {
  const { items, more } = pickDoFirst({
    todos: [todo("d1", "Dee", { dueDate: today }), todo("own", undefined, { kind: "task", dueDate: "2026-10-01" })],
    clients: [
      { id: "Dee", name: "Dee", notReached: 20, notMetYet: false },
      { id: "Eli", name: "Eli", notReached: 16, notMetYet: false },
      { id: "Fay", name: "Fay", notReached: null, notMetYet: true },
      { id: "Gus", name: "Gus", notReached: null, notMetYet: true },
      { id: "Hal", name: "Hal", notReached: null, notMetYet: true },
      { id: "Ivy", name: "Ivy", notReached: null, notMetYet: false },
    ],
    today,
  });
  assert.deepEqual(items.map((i) => i.key), ["d1", "reach:Eli", "meet:Fay", "meet:Gus", "meet:Hal"]);
  assert.equal(items[1].action, "log");
  assert.equal(more, 0);
  assert.ok(!items.some((i) => i.key === "own"), "personal tasks stay in My own to-dos");
  const capped = pickDoFirst({ todos: [], clients: "ABCDEFG".split("").map((id) => ({ id, name: id, notReached: 15, notMetYet: false })), today });
  assert.equal(capped.items.length, 5);
  assert.equal(capped.more, 2);
});

test("follow-ups and tasks are ticked off rather than advanced", () => {
  const { items } = pickDoFirst({ todos: [todo("f", "Jo", { kind: "followup", status: undefined, dueDate: today })], clients: [], today });
  assert.equal(items[0].action, "done");
});
