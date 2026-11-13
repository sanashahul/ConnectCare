import { z } from "zod";
import { AGE_RANGES, CITIES, DISABILITY_ANSWERS, INSURANCE, LANGUAGES, NEED_KEYS, OUTREACH_SITES, SLEEPING, countyForCity } from "./options";
import type { ClientProfile } from "./clients";

// Shared by the public form and the staff "new client" form.

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal("")]).optional().transform((v) => (v ? v : undefined));

// Length limits are at least as long as what the Google Form can send (src/lib/google-intake.ts),
// so a client who came in through the Google Form can always be edited and saved.
export const IntakeSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter a first name or nickname.").max(120),
  lastName: optionalText(120),
  pronouns: optionalText(40),
  ageRange: optionalEnum(AGE_RANGES),
  phone: optionalText(40),
  email: z.union([z.literal(""), z.string().trim().email("That email doesn't look right.").max(200)]).optional(),
  howToReach: optionalText(800),
  okToLeaveMessage: z.enum(["yes", "no", ""]).optional(),
  city: optionalEnum(CITIES.map((c) => c.city) as unknown as readonly [string, ...string[]]),
  sleeping: optionalEnum(SLEEPING),
  needs: z.array(z.enum(NEED_KEYS.filter((k) => k !== "lgbtq") as [string, ...string[]])).max(NEED_KEYS.length),
  urgent: z.boolean(),
  urgentDetails: optionalText(2000),
  language: optionalEnum(LANGUAGES),
  insurance: optionalEnum(INSURANCE),
  outreachSite: optionalEnum(OUTREACH_SITES),
  otherInfo: optionalText(1500),
  filledOutBy: z.enum(["self", "helper", "staff"]),
  hasVehicle: z.boolean(),
  hasPets: z.boolean(),
  hasChildren: z.boolean(),
  lgbtqCare: z.boolean(),
  disability: optionalEnum(DISABILITY_ANSWERS),
  accessNeeds: optionalText(1000),
  // Staff form only (the Google Form asks this too).
  primaryCare: optionalText(1000),
});
export type IntakeInput = z.infer<typeof IntakeSchema>;

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  pronouns: "Pronouns",
  ageRange: "Age",
  phone: "Phone",
  email: "Email",
  howToReach: "Other ways to contact them",
  okToLeaveMessage: "OK to leave a message",
  city: "Area",
  sleeping: "Where they're staying",
  needs: "Needs",
  urgentDetails: "Urgent need",
  language: "Language",
  insurance: "Insurance",
  outreachSite: "Where they heard about us",
  otherInfo: "Anything else to note",
  disability: "Disability",
  accessNeeds: "Accommodations",
  primaryCare: "Primary care provider (PCP)",
};

/** Field errors keyed by field, worded for staff ("Phone is too long (40 characters max).") */
export function intakeFieldErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0]);
    const label = FIELD_LABELS[key] ?? key;
    out[key] ??=
      i.code === "too_big" ? `${label} is too long (${String(i.maximum)} characters max).`
      : i.code === "invalid_value" || i.code === "invalid_union" ? `${label}: choose one of the options.`
      : i.message.startsWith("Please") || i.message.startsWith("That") ? i.message
      : `${label}: ${i.message}`;
  }
  return out;
}

/** "Please fix: …" naming every field with a problem, so it's clear even for fields without an inline message. */
export function intakeErrorSummary(fieldErrors: Record<string, string>): string {
  return `Please fix: ${Object.values(fieldErrors).join(" ")}`;
}

/** Without a name (Box mode keeps names in Box), the app shows the client ID instead. */
const NamelessIntakeSchema = IntakeSchema.extend({ firstName: z.string().trim().max(120).optional().default("") });

export function readIntakeForm(form: FormData, opts: { nameRequired?: boolean } = {}) {
  const s = (k: string) => (form.get(k) as string | null) ?? undefined;
  return (opts.nameRequired === false ? NamelessIntakeSchema : IntakeSchema).safeParse({
    firstName: s("firstName") ?? "",
    lastName: s("lastName"),
    pronouns: s("pronouns"),
    ageRange: s("ageRange"),
    phone: s("phone"),
    email: s("email"),
    howToReach: s("howToReach"),
    okToLeaveMessage: s("okToLeaveMessage"),
    city: s("city"),
    sleeping: s("sleeping"),
    needs: form.getAll("needs").map(String),
    urgent: form.get("urgent") === "on",
    urgentDetails: s("urgentDetails"),
    language: s("language"),
    insurance: s("insurance"),
    outreachSite: s("outreachSite"),
    otherInfo: s("otherInfo"),
    filledOutBy: s("filledOutBy") ?? "self",
    hasVehicle: form.get("hasVehicle") === "on",
    hasPets: form.get("hasPets") === "on",
    hasChildren: form.get("hasChildren") === "on",
    lgbtqCare: form.get("lgbtqCare") === "on",
    disability: s("disability"),
    accessNeeds: s("accessNeeds"),
    primaryCare: s("primaryCare"),
  });
}

export function toClientColumns(input: IntakeInput) {
  const profile: ClientProfile = {
    firstName: input.firstName,
    lastName: input.lastName,
    pronouns: input.pronouns,
    ageRange: input.ageRange,
    phone: input.phone,
    email: input.email || undefined,
    howToReach: input.howToReach,
    okToLeaveMessage: input.okToLeaveMessage === "yes" ? true : input.okToLeaveMessage === "no" ? false : null,
    sleeping: input.sleeping,
    language: input.language,
    insurance: input.insurance,
    outreachSite: input.outreachSite,
    urgentDetails: input.urgentDetails,
    otherInfo: input.otherInfo,
    hasVehicle: input.hasVehicle,
    hasPets: input.hasPets,
    hasChildren: input.hasChildren,
    lgbtqCare: input.lgbtqCare,
    disability: input.disability,
    accessNeeds: input.accessNeeds,
    primaryCare: input.primaryCare,
    filledOutBy: input.filledOutBy,
  };
  return {
    profile,
    city: input.city ?? null,
    county: countyForCity(input.city),
    needs: input.needs,
    urgent: input.urgent,
  };
}

// Have your privacy office review this wording before going live. Only promise what the
// organization can guarantee.
export const CONSENT_TEXT =
  "I agree that the outreach case management team may store this information securely and use it to contact me and connect me with services. Only the case management team can see it, and it is never sold. I can ask to see or delete my information at any time.";
