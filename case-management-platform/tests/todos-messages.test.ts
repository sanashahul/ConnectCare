import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessThread } from "../src/lib/messages";
import { orderTodos, TODO_KEY_PATTERN } from "../src/lib/todos";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("arranged items keep their order; new items follow by due date", () => {
  const items = [
    { key: "a", dueDate: "2026-11-05", createdAt: 1 },
    { key: "b", dueDate: "2026-11-01", createdAt: 2 },
    { key: "c", createdAt: 3 },
    { key: "d", dueDate: "2026-10-30", createdAt: 4 },
  ];
  const order = orderTodos(items, new Map([["c", 0], ["a", 1]])).map((i) => i.key);
  assert.deepEqual(order, ["c", "a", "d", "b"]);
});

test("to-do keys are validated", () => {
  assert.ok(TODO_KEY_PATTERN.test(`task:${uuid(1)}`));
  assert.ok(TODO_KEY_PATTERN.test(`plan:${uuid(2)}`));
  assert.ok(TODO_KEY_PATTERN.test(`followup:${uuid(3)}:2026-11-01`));
  assert.ok(!TODO_KEY_PATTERN.test("task:1; drop table"));
  assert.ok(!TODO_KEY_PATTERN.test(`followup:${uuid(3)}`));
});

test("case managers see only their own message threads; supervisors see all", () => {
  const thread = { caseManagerId: "cm-1" };
  assert.equal(canAccessThread({ id: "cm-1", role: "case_manager" }, thread), true);
  assert.equal(canAccessThread({ id: "cm-2", role: "case_manager" }, thread), false);
  assert.equal(canAccessThread({ id: "sup", role: "supervisor" }, thread), true);
});
