import assert from "node:assert/strict";
import { test } from "node:test";
import { sortUpNext } from "../src/lib/plan-order";
import { buildTaskList } from "../src/lib/task-list";
import type { TodoItem } from "../src/lib/todos";

const today = "2026-10-22";
const step = (id: string, clientId: string, extra: Partial<{ status: string; dueDate: string | null; position: number | null; createdAt: number }> = {}) => ({
  id,
  clientId,
  title: id,
  status: "todo",
  dueDate: null,
  position: null,
  createdAt: 1,
  ...extra,
});
const client = (id: string, extra: Partial<{ urgent: boolean; notReached: number | null; notMetYet: boolean }> = {}) => ({
  id,
  name: id,
  urgent: false,
  notReached: null,
  notMetYet: false,
  ...extra,
});
const todo = (clientId: string, extra: Partial<TodoItem>): TodoItem => ({ key: `x:${clientId}`, kind: "followup", text: "", priority: "medium", clientId, ...extra });

test("Up next follows the case manager's order; unplaced steps follow by due date", () => {
  const order = sortUpNext([
    step("c", "A", { dueDate: "2026-10-23" }),
    step("a", "A", { position: 1 }),
    step("b", "A", { position: 0 }),
    step("d", "A", { dueDate: "2026-10-21" }),
  ]).map((s) => s.id);
  assert.deepEqual(order, ["b", "a", "d", "c"]);
});

test("each client's line is the top of their Up next, even when another step is due sooner", () => {
  const lines = buildTaskList({
    clients: [client("Ana")],
    steps: [step("call shelter", "Ana", { position: 0 }), step("apply calfresh", "Ana", { dueDate: "2026-10-25" })],
    todos: [],
    today,
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, "call shelter");
  assert.equal(lines[0].advance?.label, "Mark referred →");
});

test("overdue, due today and urgent clients come first; then not reached and new; nobody is left out", () => {
  const lines = buildTaskList({
    clients: [
      client("Plain"),
      client("Late"),
      client("Today"),
      client("Hurry", { urgent: true }),
      client("Lost", { notReached: 18 }),
      client("Fresh", { notMetYet: true }),
      client("Empty"),
    ],
    steps: [step("p", "Plain"), step("l", "Late"), step("t", "Today"), step("h", "Hurry"), step("x", "Lost")],
    todos: [todo("Late", { dueDate: "2026-10-01" }), todo("Today", { dueDate: today })],
    today,
  });
  assert.deepEqual(lines.map((l) => l.clientName), ["Late", "Today", "Hurry", "Lost", "Fresh", "Plain", "Empty"]);
  assert.equal(lines[0].overdue, 1, "the overdue flag stays even though the line shows their top step");
  assert.equal(lines[3].kind, "contact");
  assert.equal(lines[3].text, "Contact Lost and check in");
  assert.equal(lines[4].text, "Contact Fresh for the first time");
  assert.equal(lines[6].kind, "choose");
});

test("with nothing left to do, the open referral due soonest is the line", () => {
  const [line] = buildTaskList({
    clients: [client("Jo")],
    steps: [step("done one", "Jo", { status: "done" }), step("waiting", "Jo", { status: "referred" })],
    todos: [],
    today,
  });
  assert.equal(line.text, "waiting");
  assert.equal(line.advance?.label, "Mark connected →");
});
