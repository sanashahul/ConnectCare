import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { GooglePayloadSchema, inferNeeds, mapGooglePayload, signPayload, verifySignature } from "../src/lib/google-intake";
import { CITIES, DISABILITY_ANSWERS, INTAKE_NEEDS, LANGUAGES } from "../src/lib/options";
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
  const e = mapGooglePayload(GooglePayloadSchema.parse({ responseId: "r", answers: { ...base, disability: "Yes", accessNeeds: "Wheelchair access" } }));
  assert.equal(e.profile.disability, "Yes");
  assert.equal(e.profile.accessNeeds, "Wheelchair access");
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
  assert.deepEqual([...(ctx.DISABILITY_CHOICES as string[])], [...DISABILITY_ANSWERS]);
  assert.deepEqual([...(ctx.AREA_CHOICES as string[])], CITIES.map((c) => c.city));
  assert.equal(ctx.CONSENT_TEXT, CONSENT_TEXT);
});

test("Spanish and Vietnamese form choices line up with the English ones", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const strings = ctx.strings_ as (lang: string) => { q: Record<string, string>; choices: Record<string, string[]> };
  const en = strings("en");
  for (const lang of ["es", "vi"]) {
    const s = strings(lang);
    assert.deepEqual(Object.keys(s.q).sort(), Object.keys(en.q).sort(), `${lang} has every question`);
    for (const key of Object.keys(en.choices)) assert.equal(s.choices[key].length, en.choices[key].length, `${lang} ${key} choices`);
    // Titles must be unique across languages so each answer maps to one question.
    for (const t of Object.values(s.q)) assert.ok(!Object.values(en.q).includes(t), `${lang} title "${t}" differs from English`);
  }
});

test("needs are picked up from Spanish and Vietnamese written answers", () => {
  assert.deepEqual(inferNeeds("Necesito una cama esta noche y comida").sort(), ["food", "shelter"]);
  assert.deepEqual(inferNeeds("Tôi cần chỗ ngủ và thuốc").sort(), ["medical", "shelter"]);
  const m = mapGooglePayload(
    GooglePayloadSchema.parse({ responseId: "r", answers: { name: "Ana", contact: "x", urgentNeed: "comida", consent: true, language: "Spanish", formLanguage: "Spanish" } }),
  );
  assert.equal(m.profile.formLanguage, "Spanish");
  assert.equal(m.profile.language, "Spanish");
});

test("the live form's separate phone, where, time and volunteer questions reach the app", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const toPayload = ctx.toPayload_ as (r: unknown) => unknown;
  const response = (answers: Record<string, unknown>) => ({
    getId: () => "r-live",
    getTimestamp: () => new Date("2026-11-12T19:00:00Z"),
    getItemResponses: () =>
      Object.entries(answers).map(([title, value]) => ({ getItem: () => ({ getTitle: () => title }), getResponse: () => value })),
  });

  // Question titles copied from the live form, which no longer has "Best place or way to contact you".
  const en = GooglePayloadSchema.parse(
    toPayload(
      response({
        "Language / Idioma / Ngôn ngữ": "English",
        "Your name": "Test Person",
        "Phone number": "408-555-0100",
        "Where is the best place to find you": "Hope's Corner",
        "What time frame works best for a case manager to contact you": "Thursday mornings",
        "Which SMOP volunteer helped you fill out this form": "Alex",
        "What do you need most urgently?": "food",
        Consent: ["I agree"],
      }),
    ),
  );
  const m = mapGooglePayload(en);
  assert.equal(m.profile.phone, "408-555-0100");
  assert.equal(m.profile.howToReach, "Hope's Corner\nBest time to contact: Thursday mornings");
  assert.equal(m.profile.filledOutBy, "helper");
  assert.equal(m.profile.helperName, "Alex");

  // Nothing about how to reach them: still accepted (the form doesn't require it).
  const bare = GooglePayloadSchema.parse(
    toPayload(response({ "Your name": "Sam", "What do you need most urgently?": "food", Consent: ["I agree"] })),
  );
  assert.equal(mapGooglePayload(bare).profile.filledOutBy, "self");

  // The Spanish volunteer question has a trailing line break in the live form.
  const es = GooglePayloadSchema.parse(
    toPayload(
      response({
        "Language / Idioma / Ngôn ngữ": "Español",
        "Su nombre": "Prueba",
        "¿Qué es lo que más necesita con urgencia?": "comida",
        "¿Qué voluntario de SMOP te ayudó a completar este formulario?\n": "Maria",
        Consentimiento: ["Acepto"],
      }),
    ),
  );
  assert.equal(mapGooglePayload(es).profile.helperName, "Maria");
});

test("the script sends plain-ASCII JSON so accented and Vietnamese answers are signed correctly", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const asciiJson = ctx.asciiJson_ as (v: unknown) => string;
  const value = { name: "José Nguyễn", note: "can’t sleep 😢", plain: "ok" };
  const out = asciiJson(value);
  assert.match(out, /^[\x00-\x7e]*$/);
  assert.deepEqual(JSON.parse(out), value);
});

test("the PCP question is added after accommodations in each language and saved to the profile", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const strings = ctx.strings_ as (lang: string) => { q: Record<string, string> };

  // A tiny stand-in for a Google Form, laid out like the live form's three sections.
  type Item = { title: string; getTitle: () => string; getIndex: () => number };
  const items: Item[] = [];
  const make = (title: string): Item => {
    const it: Item & Record<string, unknown> = { title, getTitle: () => it.title, getIndex: () => items.indexOf(it) };
    const chain = () => it;
    Object.assign(it, { setTitle: (t: string) => ((it.title = t), it), setHelpText: chain, setRequired: chain, setIncludesYear: chain });
    return it;
  };
  for (const lang of ["en", "es", "vi"]) {
    const q = strings(lang).q;
    for (const key of ["name", "disability", "accessNeeds", "area", "consent"]) items.push(make(q[key]));
  }
  for (const t of [(ctx.Q as Record<string, string>).pronouns, (ctx.Q as Record<string, string>).lgbtqCare, (ctx.Q as Record<string, string>).otherInfo])
    items.push(make(t));
  const form = {
    getItems: () => [...items],
    addParagraphTextItem: () => {
      const it = make("");
      items.push(it);
      return it;
    },
    addDateItem: () => {
      const it = make("");
      items.push(it);
      return it;
    },
    moveItem: (from: number, to: number) => {
      const [it] = items.splice(from, 1);
      items.splice(to, 0, it);
    },
  };
  (ctx.addMissingQuestions_ as (f: unknown) => void)(form);
  const titles = items.map((i) => i.title);
  for (const lang of ["en", "es", "vi"]) {
    const q = strings(lang).q;
    assert.equal(titles.filter((t) => t === q.pcp).length, 1, `${lang} PCP question added once`);
    assert.equal(titles.indexOf(q.pcp), titles.indexOf(q.accessNeeds) + 1, `${lang} PCP right after accommodations`);
  }
  const Q = ctx.Q as Record<string, string>;
  assert.equal(titles.indexOf(Q.dob), titles.indexOf(Q.pronouns) + 1, "date of birth right after pronouns");
  (ctx.addMissingQuestions_ as (f: unknown) => void)(form);
  assert.equal(items.length, titles.length, "running setup again adds nothing");

  const p = GooglePayloadSchema.parse({
    responseId: "r",
    answers: { name: "Sam", urgentNeed: "food", consent: true, pcp: "Dr. Lee, Valley Health Center, 408-555-0111" },
  });
  assert.equal(mapGooglePayload(p).profile.primaryCare, "Dr. Lee, Valley Health Center, 408-555-0111");
});

test("a client from the Google Form can always be edited and saved", async () => {
  const { intakeErrorSummary, intakeFieldErrors, readIntakeForm } = await import("../src/lib/intake");
  // Every written answer at the longest the Google Form endpoint accepts.
  const p = GooglePayloadSchema.parse({
    responseId: "r-max",
    answers: {
      name: `Maria ${"x".repeat(114)}`,
      pronouns: "x".repeat(40),
      email: `${"a".repeat(180)}@example.org`,
      contact: "x".repeat(800),
      phone: "4".repeat(40),
      urgentNeed: "x".repeat(2000),
      accessNeeds: "x".repeat(1000),
      pcp: "x".repeat(1000),
      otherInfo: "x".repeat(1500),
      language: "Other",
      consent: true,
    },
  });
  const form = new FormData();
  for (const [k, v] of Object.entries(mapGooglePayload(p).profile)) if (typeof v === "string") form.set(k, v);
  const r = readIntakeForm(form);
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));

  // Anything wrong is named in the message at the top of the form.
  form.set("phone", "4".repeat(41));
  const bad = readIntakeForm(form);
  assert.equal(bad.success, false);
  if (!bad.success) assert.equal(intakeErrorSummary(intakeFieldErrors(bad.error.issues)), "Please fix: Phone is too long (40 characters max).");
});

test("date of birth comes through from the Google Form and the staff form", async () => {
  const { readIntakeForm } = await import("../src/lib/intake");
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const toPayload = ctx.toPayload_ as (r: unknown, boxMode?: boolean) => unknown;
  const response = (answers: Record<string, unknown>) => ({
    getId: () => "r-dob",
    getTimestamp: () => new Date("2026-11-12T19:00:00Z"),
    getItemResponses: () =>
      Object.entries(answers).map(([title, value]) => ({ getItem: () => ({ getTitle: () => title }), getResponse: () => value })),
  });
  const base = { "Your name": "Sam", "What do you need most urgently?": "food", Consent: ["I agree"] };
  const en = GooglePayloadSchema.parse(toPayload(response({ ...base, "Date of birth": "1980-02-29" })));
  assert.equal(mapGooglePayload(en).profile.dateOfBirth, "1980-02-29");
  const es = GooglePayloadSchema.parse(toPayload(response({ "Su nombre": "Ana", "¿Qué es lo que más necesita con urgencia?": "comida", Consentimiento: ["Acepto"], "Fecha de nacimiento": "1975-06-01" })));
  assert.equal(mapGooglePayload(es).profile.dateOfBirth, "1975-06-01");
  for (const bad of ["1981-02-29", "2999-01-01", "1800-01-01", "June 1"]) {
    assert.equal(mapGooglePayload(GooglePayloadSchema.parse(toPayload(response({ ...base, "Date of birth": bad })))).profile.dateOfBirth, undefined, bad);
  }
  // Box mode keeps it in Google Forms.
  assert.ok(!JSON.stringify(toPayload(response({ ...base, "Date of birth": "1980-02-29" }), true)).includes("1980"));

  const form = new FormData();
  form.set("firstName", "Sam");
  form.set("dateOfBirth", "1990-12-31");
  const ok = readIntakeForm(form);
  assert.ok(ok.success && ok.data.dateOfBirth === "1990-12-31");
  form.set("dateOfBirth", "2999-01-01");
  assert.equal(readIntakeForm(form).success, false);
});
