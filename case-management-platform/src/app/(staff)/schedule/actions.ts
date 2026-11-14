"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { formatShiftCode, formatShiftDate, generateShiftCode } from "@/lib/shift-utils";
import { insertShift, listSites } from "@/lib/shifts";

export type SitesState = { error?: string; ok?: string } | undefined;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const ShiftSchema = z.object({
  siteName: z.string().trim().min(1, "Enter the site.").max(120),
  shiftDate: isoDate,
  meetTime: optionalText(40),
  returnTime: optionalText(40),
});

/** Adds a shift. The site is typed in; a site with that name is reused, or created the first time. */
export async function addShift(_: SitesState, form: FormData): Promise<SitesState> {
  const me = await requireSupervisor();
  const parsed = ShiftSchema.safeParse({
    siteName: form.get("siteName"),
    shiftDate: form.get("shiftDate"),
    meetTime: form.get("meetTime") ?? undefined,
    returnTime: form.get("returnTime") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { siteName, ...shift } = parsed.data;
  let site = (await listSites()).find((s) => s.name.toLowerCase() === siteName.toLowerCase());
  if (!site) [site] = await db.insert(schema.sites).values({ name: siteName }).returning();
  else if (!site.active) await db.update(schema.sites).set({ active: true }).where(eq(schema.sites.id, site.id));
  const row = await insertShift({ ...shift, siteId: site.id, createdById: me.id });
  await audit({ userId: me.id, action: "shift.created", detail: { shiftId: row.id, siteId: site.id } });
  revalidatePath("/schedule");
  return { ok: `Added ${site.name} on ${formatShiftDate(shift.shiftDate)}. Its code is ${formatShiftCode(row.code)}.` };
}

export async function shiftAction(form: FormData) {
  const me = await requireSupervisor();
  const id = z.string().uuid().safeParse(form.get("shiftId"));
  if (!id.success) return;
  const intent = String(form.get("intent"));
  if (intent === "delete") {
    await db.delete(schema.shifts).where(eq(schema.shifts.id, id.data));
  } else if (intent === "newCode") {
    // In case a code was sent to the wrong person: the old one stops working at once.
    await db.update(schema.shifts).set({ code: generateShiftCode() }).where(eq(schema.shifts.id, id.data));
  } else return;
  await audit({ userId: me.id, action: `shift.${intent === "delete" ? "deleted" : "code_changed"}`, detail: { shiftId: id.data } });
  revalidatePath("/schedule");
}
