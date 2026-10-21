"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { audit, requestIp } from "@/lib/audit";
import { encryptProfile } from "@/lib/clients";
import { readIntakeForm, toClientColumns } from "@/lib/intake";
import { rateLimit } from "@/lib/rate-limit";

export type IntakeState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function submitIntake(_: IntakeState, form: FormData): Promise<IntakeState> {
  // Honeypot: real people never see or fill this field.
  if (String(form.get("website") ?? "") !== "") redirect("/intake/thanks");
  const ip = await requestIp();
  if (!rateLimit(`intake:${ip}`, 15, 60 * 60_000)) {
    return { error: "Too many forms were sent from this device. Please ask a staff member for help." };
  }
  if (form.get("consent") !== "on") return { error: "Please check the box to agree before sending." };

  const parsed = readIntakeForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  if (parsed.data.filledOutBy === "staff") parsed.data.filledOutBy = "helper";

  const cols = toClientColumns(parsed.data);
  const [row] = await db
    .insert(schema.clients)
    .values({
      source: "public_form",
      status: "new",
      county: cols.county,
      city: cols.city,
      needs: cols.needs,
      urgent: cols.urgent,
      profileEnc: encryptProfile({ ...cols.profile, consentAt: new Date().toISOString() }),
    })
    .returning({ id: schema.clients.id });
  await audit({ action: "intake.submitted", clientId: row.id, detail: { source: "public_form" } });
  redirect("/intake/thanks");
}
