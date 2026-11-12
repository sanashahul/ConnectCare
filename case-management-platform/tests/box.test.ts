import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { hasIdentifying, parseBoxUrl, phiInBox, stripIdentifying } from "../src/lib/box";
import { displayName, encryptProfile, type ClientProfile } from "../src/lib/clients";
import { decryptJson } from "../src/lib/crypto";
import { GooglePayloadSchema, mapGooglePayload } from "../src/lib/google-intake";

process.env.DATA_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");

const FULL: ClientProfile = {
  firstName: "Test",
  lastName: "Person",
  pronouns: "they/them",
  ageRange: "25-34",
  phone: "408-555-0100",
  email: "t@example.org",
  howToReach: "Hope's Corner, mornings",
  sleeping: "Outside",
  language: "Other",
  languageOther: "Amharic",
  lgbtqCare: true,
  disability: "Yes",
  accessNeeds: "Wheelchair access",
  insurance: "Medi-Cal",
  primaryCare: "Dr. Example, Valley Clinic",
  outreachSite: "Hope's Corner",
  urgentDetails: "Wound on my foot",
  otherInfo: "Has a dog named Max",
  hasPets: true,
  filledOutBy: "helper",
  helperName: "Alex",
  formLanguage: "Spanish",
  consentAt: "2026-11-12T19:00:00.000Z",
};

test("only https Box links are accepted as a client's Box folder", () => {
  assert.equal(parseBoxUrl("https://stanford.app.box.com/folder/123456789"), "https://stanford.app.box.com/folder/123456789");
  assert.equal(parseBoxUrl(" https://app.box.com/s/abc123XYZ?utm=1#x "), "https://app.box.com/s/abc123XYZ");
  assert.equal(parseBoxUrl("https://stanford.box.com/folder/42/"), "https://stanford.box.com/folder/42");
  assert.equal(parseBoxUrl("http://app.box.com/folder/1"), null, "not https");
  assert.equal(parseBoxUrl("https://box.com.evil.example/folder/1"), null, "not Box");
  assert.equal(parseBoxUrl("https://evilbox.com/folder/1"), null, "not Box");
  assert.equal(parseBoxUrl("https://user:pw@app.box.com/folder/1"), null);
  assert.equal(parseBoxUrl("https://app.box.com/"), null, "not a folder");
  assert.equal(parseBoxUrl("javascript:alert(1)"), null);
  assert.equal(parseBoxUrl("Jane's folder"), null);
});

test("Box mode keeps nothing that identifies the client", () => {
  const p = stripIdentifying(FULL);
  assert.deepEqual(p, {
    firstName: "",
    ageRange: "25-34",
    language: "Other",
    formLanguage: "Spanish",
    hasPets: true,
    filledOutBy: "helper",
    consentAt: "2026-11-12T19:00:00.000Z",
  });
  assert.equal(hasIdentifying(FULL), true);
  assert.equal(hasIdentifying(p), false);
  assert.equal(displayName(p, "CC-7K3PM"), "CC-7K3PM");
});

test("every profile save follows the Box rules", () => {
  const saved = process.env.PHI_IN_BOX;
  try {
    delete process.env.PHI_IN_BOX;
    assert.equal(phiInBox(), false);
    assert.equal(decryptJson<ClientProfile>(encryptProfile(FULL)).disability, "Yes", "normal mode keeps everything");
    // Confirming HIPAA information is in Box never deletes anything by itself: people do that.
    const confirmed = decryptJson<ClientProfile>(encryptProfile({ ...FULL, healthInBox: true }));
    assert.equal(confirmed.disability, "Yes");

    process.env.PHI_IN_BOX = "true";
    assert.equal(phiInBox(), true);
    assert.equal(hasIdentifying(decryptJson<ClientProfile>(encryptProfile(FULL))), false);
  } finally {
    if (saved === undefined) delete process.env.PHI_IN_BOX;
    else process.env.PHI_IN_BOX = saved;
  }
});

test("in Box mode the Google Form script sends no identifying answers", () => {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), ctx);
  const toPayload = ctx.toPayload_ as (r: unknown, boxMode?: boolean) => unknown;
  const response = {
    getId: () => "r-box",
    getTimestamp: () => new Date("2026-11-12T19:00:00Z"),
    getItemResponses: () =>
      Object.entries({
        "Language / Idioma / Ngôn ngữ": "Another language (form in English)",
        "Your name": "Test Person",
        "Phone number": "408-555-0100",
        Email: "t@example.org",
        "Where is the best place to find you": "Hope's Corner",
        "Which SMOP volunteer helped you fill out this form": "Alex",
        "What do you need most urgently?": "my foot wound",
        "Do you need help today?": "Yes",
        "What else can we help with?": ["Food", "Medical care"],
        "Do you have a disability, or need any accommodations?": "Yes",
        "If you have a PCP what is their information?": "Dr. Example",
        "Anything else you'd like us to know?": "Has a dog",
        Consent: ["I agree"],
      }).map(([title, value]) => ({ getItem: () => ({ getTitle: () => title }), getResponse: () => value })),
  };

  const raw = toPayload(response, true);
  const text = JSON.stringify(raw);
  for (const secret of ["Test Person", "408-555-0100", "t@example.org", "Hope", "Alex", "foot", "Dr. Example", "dog"]) {
    assert.ok(!text.includes(secret), `sent ${secret}`);
  }
  const m = mapGooglePayload(GooglePayloadSchema.parse(raw));
  assert.deepEqual(m.needs.sort(), ["food", "medical"]);
  assert.equal(m.urgent, true);
  assert.equal(m.profile.firstName, "");
  assert.equal(m.profile.urgentDetails, undefined);

  // Without Box mode, the same response still sends everything.
  assert.ok(JSON.stringify(toPayload(response, false)).includes("Test Person"));
});
