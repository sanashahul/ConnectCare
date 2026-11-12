"use server";

import { redirect } from "next/navigation";
import { audit, requestIp } from "@/lib/audit";
import { phiInBox } from "@/lib/box";
import { encryptProfile, insertClient } from "@/lib/clients";
import { readIntakeForm, toClientColumns } from "@/lib/intake";
import { INTAKE_LANGS, INTAKE_TEXT, intakeLang } from "@/lib/intake-i18n";
import { rateLimit } from "@/lib/rate-limit";

const BOX_MODE_CLOSED = "This online form is closed. Please talk with the outreach team in person or use the outreach team's sign-up form.";

export type IntakeState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function submitIntake(_: IntakeState, form: FormData): Promise<IntakeState> {
  const lang = intakeLang(String(form.get("formLang") ?? ""));
  const T = INTAKE_TEXT[lang];
  const thanks = (code?: string) =>
    `/intake/thanks?${new URLSearchParams({ ...(code ? { id: code } : {}), ...(lang !== "en" ? { lang } : {}) })}`;
  // Box mode: the app can't keep anyone's name or contact details, so the website form is closed.
  if (phiInBox()) return { error: BOX_MODE_CLOSED };
  // Honeypot: real people never see or fill this field.
  if (String(form.get("website") ?? "") !== "") redirect(thanks());
  const ip = await requestIp();
  if (!(await rateLimit(`intake:${ip}`, 15, 60 * 60_000))) {
    return { error: T.errTooMany };
  }
  if (form.get("consent") !== "on") return { error: T.errConsent };

  const parsed = readIntakeForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: T.errFields, fieldErrors };
  }
  if (parsed.data.filledOutBy === "staff") parsed.data.filledOutBy = "helper";

  const cols = toClientColumns(parsed.data);
  if (lang !== "en") {
    // Written answers are in this language; someone using the Spanish form who skipped
    // "Preferred language" still prefers Spanish.
    const name = INTAKE_LANGS.find((l) => l.key === lang)!.name;
    cols.profile.formLanguage = name;
    cols.profile.language ??= name;
  }
  const row = await insertClient({
    source: "public_form",
    status: "new",
    county: cols.county,
    city: cols.city,
    needs: cols.needs,
    urgent: cols.urgent,
    profileEnc: encryptProfile({ ...cols.profile, consentAt: new Date().toISOString() }),
  });
  await audit({ action: "intake.submitted", clientId: row.id, detail: { source: "public_form" } });
  redirect(thanks(row.clientCode));
}
