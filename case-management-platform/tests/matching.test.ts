import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { emergencyNumbers, matchResources } from "../src/lib/resource-match";
import { IntakeSchema, readIntakeForm } from "../src/lib/intake";
import { NEEDS } from "../src/lib/options";
import { RESOURCE_CATEGORIES, type Resource } from "../src/lib/resource-types";

const resources = JSON.parse(readFileSync(new URL("../data/resources.json", import.meta.url), "utf8")) as Resource[];

test("resource data is well formed", () => {
  const ids = new Set<string>();
  const cats = new Set(RESOURCE_CATEGORIES.map((c) => c.key));
  for (const r of resources) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.categories.length > 0 && r.categories.every((c) => cats.has(c)), `bad categories on ${r.id}`);
    assert.ok(["Santa Clara", "San Mateo", "Multi-county"].includes(r.county), `bad county on ${r.id}`);
  }
});

test("every need maps to at least one resource category in the data", () => {
  for (const n of NEEDS) {
    if (n.key === "legal" || n.key === "pets" || n.key === "employment") continue;
    assert.ok(resources.some((r) => r.categories.some((c) => (n.resourceCategories as readonly string[]).includes(c))), n.key);
  }
});

test("matching stays inside the client's county", () => {
  const [mh] = matchResources(resources, { city: "East Palo Alto", county: "San Mateo", needs: ["mental_health"] });
  assert.ok(mh.matches.length > 0);
  for (const m of mh.matches) assert.ok(["San Mateo", "Multi-county"].includes(m.resource.county), m.resource.name);
});

test("same-city resources rank first", () => {
  const [food] = matchResources(resources, { city: "Sunnyvale", county: "Santa Clara", needs: ["food"] });
  assert.equal(food.matches[0].resource.city, "Sunnyvale");
});

test("gaps are reported when language is not served", () => {
  const [m] = matchResources(resources, { city: "Milpitas", county: "Santa Clara", needs: ["legal"], language: "Tagalog" });
  assert.ok(m.gaps.length > 0);
});

test("youth-only programs are excluded for older adults", () => {
  const [m] = matchResources(resources, { city: "Palo Alto", county: "Santa Clara", needs: ["mental_health"], ageRange: "45-54" }, 50);
  assert.ok(m.matches.every((x) => !x.resource.categories.includes("youth")));
});

test("printout header numbers exist for each county", () => {
  for (const county of ["Santa Clara", "San Mateo", null]) {
    const nums = emergencyNumbers(resources, county);
    assert.ok(nums.some((r) => r.phones.some((p) => p.number === "988")), String(county));
    assert.ok(nums.every((r) => r.county === "Multi-county" || !county || r.county === county), String(county));
  }
  assert.equal(emergencyNumbers(resources, "Santa Clara").length, 4);
  assert.equal(emergencyNumbers(resources, "San Mateo").length, 3);
});

test("intake requires a first name and validates needs", () => {
  const f = new FormData();
  f.append("needs", "food");
  f.append("needs", "not-a-need");
  const res = readIntakeForm(f);
  assert.equal(res.success, false);
  const ok = IntakeSchema.safeParse({
    firstName: "Sam", needs: ["food"], urgent: false, filledOutBy: "self", hasVehicle: false, hasPets: false, hasChildren: false,
  });
  assert.equal(ok.success, true);
});
