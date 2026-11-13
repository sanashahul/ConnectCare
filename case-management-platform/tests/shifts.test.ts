import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { canAccessClient, canOpenShift } from "../src/lib/access";
import {
  formatShiftCode,
  generateShiftCode,
  matchSite,
  normalizeShiftCode,
  parseSchedule,
  SHIFT_CODE_PATTERN,
  shiftIsOpen,
  shiftMessage,
  splitSite,
} from "../src/lib/shift-utils";

// Rows as they come out of the outreach schedule sheet (tab separated).
const SHEET = [
  "Saturday, November 14, 2026\tMeet at LKSC at 7:15 am, return to LKSC at 10:30 am\tHope's Corner: 748 Mercy St, Mountain View, CA 94041",
  "Saturday, November 14, 2026\tMeet at LKSC at 7:45 am, return to LKSC at 10:45 am\tNeighborhood Hands on 500 Coleman Ave in San Jose, CA 95110",
  "Sunday, November 15, 2026\tMeet at LKSC at 9:40 am, return to LKSC at 1:15 pm\tHope for the Unhoused: 1432 S Main St, Milpitas, CA 95035",
  "Saturday, November 28, 2026\tMeet at LKSC at 11:00 am, return to LKSC at 1:30 pm\tHelping Hands: Sunnyvale Public Library on 665 W Olive Ave, Sunnyvale, CA",
  "Tuesday, December 8, 2026\tMeet at LKSC at 5:15 pm, return to LKSC at 7:45 pm\tWeHOPE: 1854 Bay Road, East Palo Alto, CA 94303",
  "",
  "Notes for drivers",
].join("\n");

test("schedule rows pasted from the sheet become shifts", () => {
  const { shifts, skipped } = parseSchedule(SHEET);
  assert.equal(shifts.length, 5);
  assert.deepEqual(skipped, ["Notes for drivers"]);
  assert.deepEqual(shifts[0], {
    date: "2026-11-14",
    meetTime: "7:15 am",
    returnTime: "10:30 am",
    siteName: "Hope's Corner",
    address: "748 Mercy St, Mountain View, CA 94041",
  });
  assert.equal(shifts[1].siteName, "Neighborhood Hands");
  assert.equal(shifts[1].address, "500 Coleman Ave, San Jose, CA 95110");
  assert.equal(shifts[3].siteName, "Helping Hands");
  assert.equal(shifts[4].date, "2026-12-08");
  assert.equal(shifts[4].meetTime, "5:15 pm");
  assert.equal(shifts[4].returnTime, "7:45 pm");
});

test("schedule rows with other separators and date formats", () => {
  const { shifts } = parseSchedule("11/28/2026 | 7:45am - 10:45am | Neighborhood Hands\n2026-12-12 | WeHOPE");
  assert.equal(shifts.length, 2);
  assert.deepEqual(shifts[0], { date: "2026-11-28", meetTime: "7:45 am", returnTime: "10:45 am", siteName: "Neighborhood Hands", address: undefined });
  assert.deepEqual(shifts[1], { date: "2026-12-12", meetTime: undefined, returnTime: undefined, siteName: "WeHOPE", address: undefined });
  assert.deepEqual(splitSite("Hope's Corner"), { name: "Hope's Corner" });
});

test("place last seen fills in the matching site", () => {
  const sites = [{ name: "Hope's Corner" }, { name: "Neighborhood Hands" }, { name: "Helping Hands" }, { name: "WeHOPE" }];
  assert.equal(matchSite("Outside Hope’s Corner, by the side door", sites)?.name, "Hope's Corner");
  assert.equal(matchSite("hopes corner", sites)?.name, "Hope's Corner");
  assert.equal(matchSite("Neighborhood Hands line", sites)?.name, "Neighborhood Hands");
  assert.equal(matchSite("wehope shelter", sites)?.name, "WeHOPE");
  assert.equal(matchSite("St. James Park", sites), undefined);
  assert.equal(matchSite("", sites), undefined);
  assert.equal(matchSite(undefined, sites), undefined);
  // Whole words only: "Hands" alone is not enough.
  assert.equal(matchSite("hands", sites), undefined);
});

test("shift codes are easy to read and only open on the shift date", () => {
  for (let i = 0; i < 200; i++) assert.match(generateShiftCode(), SHIFT_CODE_PATTERN);
  assert.equal(normalizeShiftCode(" 7k3-pmq "), "7K3PMQ");
  assert.equal(formatShiftCode("7K3PMQ"), "7K3-PMQ");
  assert.equal(shiftIsOpen("2026-11-14", "2026-11-14"), true);
  assert.equal(shiftIsOpen("2026-11-14", "2026-11-15"), false);
  assert.equal(shiftIsOpen("2026-11-14", "2026-11-13"), false);
  const msg = shiftMessage({ siteName: "Hope's Corner", shiftDate: "2026-11-14", meetTime: "7:15 am", code: "7K3PMQ" }, "https://cc.example.org");
  assert.match(msg, /Hope's Corner \(Sat, Nov 14, 7:15 am\): 7K3-PMQ/);
  assert.match(msg, /https:\/\/cc\.example\.org\/shift/);
});

test("clinical managers can't open client records; they open shift lists", () => {
  const cm = { id: "u1", role: "clinical_manager" };
  assert.equal(canAccessClient(cm, { assignedToId: "u1" }), false);
  assert.equal(canAccessClient(cm, { assignedToId: null }), false);
  assert.equal(canOpenShift(cm), true);
  assert.equal(canOpenShift({ id: "s", role: "supervisor" }), true);
  assert.equal(canOpenShift({ id: "c", role: "case_manager" }), false);
});

test("every staff page and action except the shift and password pages keeps clinical managers out", () => {
  // requireUser() sends clinical managers to /shift unless a page opts in with allowClinicalManager.
  const root = join(__dirname, "../src/app/(staff)");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(root);
  const allowed = files.filter((f) => readFileSync(f, "utf8").includes("allowClinicalManager"));
  const rel = allowed.map((f) => f.slice(root.length + 1)).sort();
  assert.deepEqual(rel, ["account/password/actions.ts", "account/password/page.tsx", "layout.tsx"]);
});
