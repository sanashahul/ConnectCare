"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { generateShiftCode, parseSchedule } from "@/lib/shift-utils";
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

const SiteSchema = z.object({
  name: z.string().trim().min(1, "Enter the site's name.").max(120),
  address: optionalText(300),
});

export async function addSite(_: SitesState, form: FormData): Promise<SitesState> {
  const me = await requireSupervisor();
  const parsed = SiteSchema.safeParse({ name: form.get("name"), address: form.get("address") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const [site] = await db.insert(schema.sites).values(parsed.data).returning({ id: schema.sites.id });
    await audit({ userId: me.id, action: "site.created", detail: { siteId: site.id } });
  } catch (e) {
    if (e instanceof DatabaseError && e.code === "23505") return { error: "There is already a site with that name." };
    throw e;
  }
  revalidatePath("/sites");
  return { ok: `Added ${parsed.data.name}.` };
}

/** Hide a site from pickers (or bring it back). Its past shifts and tagged clients stay. */
export async function setSiteActive(form: FormData) {
  const me = await requireSupervisor();
  const id = z.string().uuid().safeParse(form.get("siteId"));
  if (!id.success) return;
  const active = form.get("active") === "true";
  await db.update(schema.sites).set({ active }).where(eq(schema.sites.id, id.data));
  await audit({ userId: me.id, action: active ? "site.activated" : "site.deactivated", detail: { siteId: id.data } });
  revalidatePath("/sites");
}

const ShiftSchema = z.object({
  siteId: z.string().uuid("Pick a site."),
  shiftDate: isoDate,
  meetTime: optionalText(40),
  returnTime: optionalText(40),
});

export async function addShift(_: SitesState, form: FormData): Promise<SitesState> {
  const me = await requireSupervisor();
  const parsed = ShiftSchema.safeParse({
    siteId: form.get("siteId"),
    shiftDate: form.get("shiftDate"),
    meetTime: form.get("meetTime") ?? undefined,
    returnTime: form.get("returnTime") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const site = await db.query.sites.findFirst({ where: eq(schema.sites.id, parsed.data.siteId) });
  if (!site) return { error: "Pick a site." };
  const shift = await insertShift({ ...parsed.data, createdById: me.id });
  await audit({ userId: me.id, action: "shift.created", detail: { shiftId: shift.id, siteId: site.id } });
  revalidatePath("/sites");
  return { ok: `Added ${site.name} on ${parsed.data.shiftDate}.` };
}

/**
 * Adds every row pasted from the outreach schedule spreadsheet. Sites that don't exist yet are
 * created from the row (name and address). Rows already on the schedule are skipped.
 */
export async function importSchedule(_: SitesState, form: FormData): Promise<SitesState> {
  const me = await requireSupervisor();
  const text = String(form.get("schedule") ?? "");
  if (text.length > 50_000) return { error: "That's too much at once. Paste a few months at a time." };
  const { shifts, skipped } = parseSchedule(text);
  if (shifts.length === 0) return { error: "No rows with a date and a site were found. Copy the rows straight from the schedule sheet." };

  const sites = await listSites();
  const byName = new Map(sites.map((s) => [s.name.toLowerCase(), s]));
  let added = 0;
  let duplicates = 0;
  let newSites = 0;
  for (const row of shifts) {
    let site = byName.get(row.siteName.toLowerCase());
    if (!site) {
      [site] = await db
        .insert(schema.sites)
        .values({ name: row.siteName.slice(0, 120), address: row.address?.slice(0, 300) ?? null })
        .returning();
      byName.set(site.name.toLowerCase(), site);
      newSites++;
    }
    const existing = await db.query.shifts.findFirst({
      where: and(eq(schema.shifts.siteId, site.id), eq(schema.shifts.shiftDate, row.date)),
    });
    if (existing) {
      duplicates++;
      continue;
    }
    await insertShift({ siteId: site.id, shiftDate: row.date, meetTime: row.meetTime ?? null, returnTime: row.returnTime ?? null, createdById: me.id });
    added++;
  }
  await audit({ userId: me.id, action: "shift.imported", detail: { added, duplicates, newSites, skipped: skipped.length } });
  revalidatePath("/sites");
  const parts = [`Added ${added} shift${added === 1 ? "" : "s"}`];
  if (newSites) parts.push(`${newSites} new site${newSites === 1 ? "" : "s"}`);
  if (duplicates) parts.push(`${duplicates} already on the schedule`);
  if (skipped.length) parts.push(`${skipped.length} row${skipped.length === 1 ? "" : "s"} not understood: "${skipped[0].slice(0, 80)}"`);
  return { ok: `${parts.join(" · ")}.` };
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
  revalidatePath("/sites");
}
