import { z } from "zod";
import { AGE_RANGES, CITIES, DISABILITY_ANSWERS, INSURANCE, LANGUAGES, NEED_KEYS, OUTREACH_SITES, SLEEPING, countyForCity } from "./options";
import type { ClientProfile } from "./clients";

// Shared by the public form and the staff "new client" form.

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal("")]).optional().transform((v) => (v ? v : undefined));

export const IntakeSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter a first name or nickname.").max(60),
  lastName: optionalText(60),
  pronouns: optionalText(40),
  ageRange: optionalEnum(AGE_RANGES),
  phone: optionalText(30),
  email: z.union([z.literal(""), z.string().trim().email("That email doesn't look right.").max(120)]).optional(),
  howToReach: optionalText(300),
  okToLeaveMessage: z.enum(["yes", "no", ""]).optional(),
  city: optionalEnum(CITIES.map((c) => c.city) as unknown as readonly [string, ...string[]]),
  sleeping: optionalEnum(SLEEPING),
  needs: z.array(z.enum(NEED_KEYS.filter((k) => k !== "lgbtq") as [string, ...string[]])).max(NEED_KEYS.length),
  urgent: z.boolean(),
  urgentDetails: optionalText(500),
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
});
export type IntakeInput = z.infer<typeof IntakeSchema>;

export function readIntakeForm(form: FormData) {
  const s = (k: string) => (form.get(k) as string | null) ?? undefined;
  return IntakeSchema.safeParse({
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
