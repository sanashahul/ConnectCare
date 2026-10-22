import assert from "node:assert/strict";
import { test } from "node:test";
import { daysNotReached } from "../src/lib/contacts";

const client = { assignedAt: new Date("2026-10-01T18:00:00Z"), createdAt: new Date("2026-09-28T18:00:00Z") };

test("a guest met recently is not flagged", () => {
  assert.equal(daysNotReached(client, { lastMet: "2026-10-20", missesSinceMet: 0 }, "2026-10-22"), null);
});

test("a guest not met in 14 days is flagged with the day count", () => {
  assert.equal(daysNotReached(client, { lastMet: "2026-10-08", missesSinceMet: 2 }, "2026-10-22"), 14);
  assert.equal(daysNotReached(client, { lastMet: "2026-10-09", missesSinceMet: 0 }, "2026-10-22"), null);
});

test("a guest never met counts from when they were assigned", () => {
  assert.equal(daysNotReached(client, { missesSinceMet: 0 }, "2026-10-14"), null);
  assert.equal(daysNotReached(client, { missesSinceMet: 0 }, "2026-10-15"), 14);
  assert.equal(daysNotReached({ ...client, assignedAt: null }, undefined, "2026-10-12"), 14);
});
