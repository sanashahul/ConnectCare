import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMonthlyReport, pacificDate, shiftMonth, type ReportInput } from "../src/lib/report";

const client = (id: string, created: string, extra: Partial<ReportInput["clients"][number]> = {}): ReportInput["clients"][number] => ({
  id,
  createdAt: new Date(created),
  assignedAt: null,
  closedAt: null,
  status: "new",
  source: "google_form",
  urgent: false,
  needs: [],
  ...extra,
});

test("months are counted in Pacific time", () => {
  // 3 am UTC on Nov 1 is still Oct 31 in California.
  assert.equal(pacificDate(new Date("2026-11-01T03:00:00Z")), "2026-10-31");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("monthly report counts requests, first contact, needs, steps and couldn't-find", () => {
  const input: ReportInput = {
    clients: [
      client("a", "2026-10-02T17:00:00Z", { urgent: true, needs: ["shelter", "food"], assignedAt: new Date("2026-10-02T21:00:00Z"), status: "active" }),
      client("b", "2026-10-05T17:00:00Z", { needs: ["shelter"], source: "staff", assignedAt: new Date("2026-10-06T17:00:00Z"), status: "active" }),
      client("c", "2026-10-20T17:00:00Z", { needs: ["medical"] }),
      client("old", "2026-09-10T17:00:00Z", { needs: ["food"], assignedAt: new Date("2026-09-11T17:00:00Z"), status: "active" }),
    ],
    notes: [
      { clientId: "a", kind: "met", contactDate: "2026-10-04" },
      { clientId: "a", kind: "met", contactDate: "2026-10-10" },
      { clientId: "b", kind: "not_found", contactDate: "2026-10-07" },
      { clientId: "b", kind: "met", contactDate: "2026-10-15" },
      { clientId: "old", kind: "not_found", contactDate: "2026-10-12" },
      { clientId: "old", kind: "update", contactDate: "2026-10-13" },
    ],
    planItems: [
      { status: "connected", statusChangedAt: new Date("2026-10-08T18:00:00Z") },
      { status: "done", statusChangedAt: new Date("2026-10-21T18:00:00Z") },
      { status: "done", statusChangedAt: new Date("2026-09-21T18:00:00Z") },
      { status: "todo", statusChangedAt: null },
    ],
  };
  const r = buildMonthlyReport(input, "2026-10");
  assert.equal(r.requests.total, 3);
  assert.equal(r.requests.urgent, 1);
  assert.deepEqual(r.requests.bySource, { google_form: 2, staff: 1 });
  assert.equal(r.assignment.assigned, 2);
  assert.equal(r.assignment.medianHours, 14); // 4 h and 24 h
  assert.equal(r.firstContact.met, 2);
  assert.equal(r.firstContact.notYet, 1);
  assert.equal(r.firstContact.averageDays, 6); // 2 days and 10 days
  assert.equal(r.firstContact.within7Days, 1);
  assert.deepEqual(r.topNeeds[0], { need: "shelter", count: 2 });
  assert.deepEqual(r.planSteps, { connected: 1, done: 1 });
  // Tried to reach a, b and old; couldn't find b and old.
  assert.equal(r.couldntFind.guestsTried, 3);
  assert.equal(r.couldntFind.guestsNotFound, 2);
  assert.equal(r.activity.updates, 1);
  assert.equal(r.activity.activeAtEnd, 3);
});
