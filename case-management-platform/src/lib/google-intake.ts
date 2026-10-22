import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ClientProfile } from "./clients";
import { CITIES, countyForCity, LANGUAGES, NEEDS } from "./options";

// Receives Google Form submissions sent by google-apps-script/Code.gs.
// The script signs each request with a shared secret: HMAC-SHA256 over "<timestamp>.<body>".

export const SIGNATURE_HEADER = "x-connectcare-signature";
export const TIMESTAMP_HEADER = "x-connectcare-timestamp";
const MAX_SKEW_SECONDS = 5 * 60;

export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifySignature(
  secret: string,
  timestamp: string | null,
  body: string,
  signature: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!timestamp || !signature || !/^\d{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  const expected = Buffer.from(signPayload(secret, timestamp, body), "hex");
  return timingSafeEqual(expected, Buffer.from(signature.toLowerCase(), "hex"));
}

const text = (max: number) => z.string().trim().max(max).optional().default("");

export const GooglePayloadSchema = z.object({
  responseId: z.string().min(1).max(200),
  submittedAt: z.string().max(50).optional(),
  answers: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    pronouns: text(40),
    language: text(60),
    lgbtqCare: text(20),
    email: text(200),
    contact: z.string().trim().min(1, "Best place to contact is required").max(500),
    urgentNeed: z.string().trim().min(1, "Urgent need is required").max(2000),
    helpToday: text(20),
    needs: z.array(z.string().max(100)).max(30).optional().default([]),
    area: text(100),
    consent: z.boolean(),
  }),
});
export type GooglePayload = z.infer<typeof GooglePayloadSchema>;

// Keyword hints so a free-text "urgent need" still gets need categories for resource matching.
// Staff can always correct the needs on the client's profile.
const KEYWORDS: [string, RegExp][] = [
  ["shelter", /\b(shelter|bed|sleep|sleeping|place to stay|housing tonight|motel|cold|tent)\b/i],
  ["housing", /\b(housing|apartment|rent|evict|eviction|section 8|voucher|home)\b/i],
  ["food", /\b(food|hungry|meal|meals|eat|groceries|pantry|calfresh|ebt)\b/i],
  ["medical", /\b(doctor|clinic|medical|sick|pain|wound|injur|infection|prescription|medication|meds|pharmacy|diabetes|insulin)\b/i],
  ["mental_health", /\b(mental|depress|anxiety|anxious|psych|therapy|counsel|suicid|voices|bipolar|schizo)\b/i],
  ["substance_use", /\b(drug|drugs|alcohol|drinking|detox|rehab|sober|recovery|opioid|fentanyl|meth|narcan|naloxone)\b/i],
  ["dental_vision", /\b(dental|dentist|tooth|teeth|glasses|vision|eye|hearing)\b/i],
  ["hygiene", /\b(shower|showers|laundry|clothes|clothing|hygiene|bathroom|restroom)\b/i],
  ["benefits", /\b(medi-?cal|benefits|ssi|ssdi|general assistance|cash aid|insurance)\b/i],
  ["documents_phone", /\b(id|i\.d\.|identification|birth certificate|social security card|phone|documents?)\b/i],
  ["transit", /\b(bus|transport|transportation|ride|clipper|vta|car repair)\b/i],
  ["employment", /\b(job|jobs|work|employment|resume)\b/i],
  ["legal", /\b(legal|lawyer|court|ticket|warrant|probation)\b/i],
  ["safety", /\b(abuse|violence|unsafe|threat|hurting me|domestic|assault|trafficking)\b/i],
  ["pets", /\b(dog|cat|pet|pets)\b/i],
];

export function inferNeeds(textInput: string): string[] {
  return KEYWORDS.filter(([, re]) => re.test(textInput)).map(([k]) => k);
}

export function mapGooglePayload(p: GooglePayload) {
  const a = p.answers;
  const fromChoices = a.needs
    .map((label) => NEEDS.find((n) => n.label.toLowerCase() === label.toLowerCase())?.key)
    .filter((k): k is (typeof NEEDS)[number]["key"] => !!k);
  const needs = [...new Set([...fromChoices, ...inferNeeds(a.urgentNeed)])];
  const city = CITIES.find((c) => c.city.toLowerCase() === a.area.toLowerCase())?.city ?? null;
  const [firstName, ...rest] = a.name.split(/\s+/);
  const email = z.string().email().safeParse(a.email).success ? a.email : undefined;
  // "Other" answers come through as what the person typed.
  const knownLanguage = LANGUAGES.find((l) => l.toLowerCase() === a.language.toLowerCase());
  const profile: ClientProfile = {
    firstName,
    lastName: rest.join(" ") || undefined,
    pronouns: a.pronouns || undefined,
    language: knownLanguage ?? (a.language ? "Other" : undefined),
    languageOther: !knownLanguage && a.language ? a.language : undefined,
    lgbtqCare: /^y/i.test(a.lgbtqCare),
    email,
    howToReach: a.contact,
    urgentDetails: a.urgentNeed,
    filledOutBy: "self",
    consentAt: p.submittedAt && !Number.isNaN(Date.parse(p.submittedAt)) ? new Date(p.submittedAt).toISOString() : new Date().toISOString(),
  };
  return {
    profile,
    city,
    county: countyForCity(city),
    needs,
    urgent: /^y/i.test(a.helpToday),
  };
}
