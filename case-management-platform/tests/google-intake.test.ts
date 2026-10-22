import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { GooglePayloadSchema, inferNeeds, mapGooglePayload, signPayload, verifySignature } from "../src/lib/google-intake";
import { CITIES, INTAKE_NEEDS, LANGUAGES } from "../src/lib/options";
import { CONSENT_TEXT } from "../src/lib/intake";

const SECRET = "x".repeat(40);

test("signatures verify, and tampering or old timestamps are rejected", () => {
  const now = Math.floor(Date.now() / 1000);
  const ts = String(now);
  const body = '{"a":1}';
  const sig = signPayload(SECRET, ts, body);
  assert.equal(verifySignature(SECRET, ts, body, sig, now), true);
  assert.equal(verifySignature(SECRET, ts, '{"a":2}', sig, now), false);
  assert.equal(verifySignature("y".repeat(40), ts, body, sig, now), false);
  assert.equal(verifySignature(SECRET, ts, body, sig, now + 3600), false, "replayed an hour later");
  assert.equal(verifySignature(SECRET, null, body, sig, now), false);
});

test("free-text urgent needs map to need categories", () => {
  assert.deepEqual(inferNeeds("I need a bed tonight and some food").sort(), ["food", "shelter"]);
  assert.ok(inferNeeds("ran out of my meds").includes("medical"));
  assert.deepEqual(inferNeeds("hello"), []);
});

test("Google payload maps to a client", () => {
  const payload = GooglePayloadSchema.parse({
    responseId: "r1",
    submittedAt: "2026-10-21T17:00:00.000Z",
    answers: {
      name: "Maria de la Cruz",
      email: "maria@example.com",
      contact: "Hope's Corner, Thursday mornings",
      urgentNeed: "Need a shelter bed tonight",
      helpToday: "Yes",
      needs: ["Food", "Not a real option"],
      area: "Sunnyvale",
      consent: true,
    },
  });
  const m = mapGooglePayload(payload);
  assert.equal(m.profile.firstName, "Maria");
  assert.equal(m.profile.lastName, "de la Cruz");
  assert.equal(m.profile.howToReach, "Hope's Corner, Thursday mornings");
  assert.equal(m.city, "Sunnyvale");
  assert.equal(m.county, "Santa Clara");
  assert.equal(m.urgent, true);
  assert.deepEqual(m.needs.sort(), ["food", "shelter"]);
});

test("pronouns, language, and LGBTQ+ care map from the form", () => {
  const base = { name: "Sam", contact: "x", urgentNeed: "food", consent: true };
  const a = mapGooglePayload(GooglePayloadSchema.parse({ responseId: "r", answers: { ...base, pronouns: "they/them", language: "Spanish", lgbtqCare: "Yes" } }));
  assert.equal(a.profile.pronouns, "they/them");
  assert.equal(a.profile.language, "Spanish");
  assert.equal(a.profile.lgbtqCare, true);
  const d = mapGooglePayload(GooglePayloadSchema.parse({ responseId: "r", answers: { ...base, otherInfo: "I have a service dog." } }));
  assert.equal(d.profile.otherInfo, "I have a service dog.");
  const b = mapGooglePayload(GooglePayloadSchema.parse({ responseId: "r", answers: { ...base, language: "Amharic", lgbtqCare: "No" } }));
  assert.equal(b.profile.language, "Other");
  assert.equal(b.profile.languageOther, "Amharic");
  assert.equal(b.profile.lgbtqCare, false);
  // Older copies of the script don't send the new fields at all.
  const c = mapGooglePayload(GooglePayloadSchema.parse({ responseId: "r", answers: base }));
  assert.equal(c.profile.pronouns, undefined);
  assert.equal(c.profile.lgbtqCare, false);
  assert.ok(!c.needs.includes("lgbtq"), "LGBTQ+ care never goes in the plaintext needs list");
});

test("Apps Script choices and consent match the app", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  assert.deepEqual([...(ctx.NEED_CHOICES as string[])], INTAKE_NEEDS.map((n) => n.label));
  assert.deepEqual([...(ctx.LANGUAGE_CHOICES as string[])], LANGUAGES.filter((l) => l !== "Other"));
  assert.deepEqual([...(ctx.AREA_CHOICES as string[])], CITIES.map((c) => c.city));
  assert.equal(ctx.CONSENT_TEXT, CONSENT_TEXT);
});
