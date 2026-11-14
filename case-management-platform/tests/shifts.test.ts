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
  SHIFT_CODE_PATTERN,
  shiftIsOpen,
  shiftMessage,
} from "../src/lib/shift-utils";

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
  assert.match(msg, /https:\/\/cc\.example\.org\/shift-code/);
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

test("the shared shift-code account can't set a password", () => {
  for (const f of ["account/password/actions.ts", "account/password/page.tsx"]) {
    const src = readFileSync(join(__dirname, "../src/app/(staff)", f), "utf8");
    assert.match(src, /if \(isShiftGuest\(user\)\) redirect/);
  }
});
