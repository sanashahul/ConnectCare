"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireShiftViewer } from "@/lib/auth";
import { encryptString } from "@/lib/crypto";
import { normalizeShiftCode, shiftIsOpen } from "@/lib/shift-utils";
import { pacificToday, recordWrongShiftCode, shiftByCode, shiftCodeLocked } from "@/lib/shifts";

export type CodeState = { error?: string } | undefined;

export async function openShift(_: CodeState, form: FormData): Promise<CodeState> {
  const user = await requireShiftViewer();
  const code = normalizeShiftCode(String(form.get("code") ?? ""));
  if (!code) return { error: "Enter the code you were sent." };
  if (await shiftCodeLocked(user.id)) return { error: "Too many wrong codes. Wait an hour, or ask your supervisor for help." };
  const found = await shiftByCode(code);
  const valid = found && (user.role === "supervisor" || shiftIsOpen(found.shift.shiftDate, pacificToday()));
  if (!valid) {
    await recordWrongShiftCode(user.id);
    await audit({ userId: user.id, action: "shift.code_failed" });
    return { error: found ? "That code is for a different day. Codes only work on the day of the shift." : "That code wasn't found. Check it with your supervisor." };
  }
  redirect(`/shift/${code}`);
}

const CheckSchema = z.object({
  code: z.string().min(1),
  clientId: z.string().uuid(),
  result: z.enum(["found", "not_here", "undo"]),
  note: z.string().trim().max(2000).optional().transform((v) => v || undefined),
});

/**
 * Records what the clinical manager found for one person on the shift's list. It adds an entry to
 * the client's contact log (so their case manager sees it), and "Found" clears "Don't respond".
 */
export async function recordCheck(form: FormData) {
  const user = await requireShiftViewer();
  const parsed = CheckSchema.safeParse({
    code: form.get("code"),
    clientId: form.get("clientId"),
    result: form.get("result"),
    note: form.get("note") ?? undefined,
  });
  if (!parsed.success) return;
  const { code, clientId, result, note } = parsed.data;
  const today = pacificToday();
  if (await shiftCodeLocked(user.id)) return;
  const found = await shiftByCode(code);
  // Results are only recorded on the shift date, even by supervisors previewing the list.
  if (!found || !shiftIsOpen(found.shift.shiftDate, today)) {
    await recordWrongShiftCode(user.id);
    return;
  }
  const { shift, site } = found;

  const client = await db.query.clients.findFirst({ where: eq(schema.clients.id, clientId) });
  if (!client) return;
  const existing = await db.query.shiftChecks.findFirst({
    where: and(eq(schema.shiftChecks.shiftId, shift.id), eq(schema.shiftChecks.clientId, clientId)),
  });
  // Only people on this shift's list: marked at this site, or already checked on this shift.
  if (client.notRespondingSiteId !== site.id && !existing) return;

  if (result === "undo") {
    // Undo only removes the shift mark; the log entry stays as a record of what happened.
    if (!existing) return;
    await db.delete(schema.shiftChecks).where(and(eq(schema.shiftChecks.shiftId, shift.id), eq(schema.shiftChecks.clientId, clientId)));
    if (existing.result === "found" && !client.notRespondingSiteId) {
      await db.update(schema.clients).set({ notRespondingSiteId: site.id, notRespondingAt: new Date(), updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
    }
    await audit({ userId: user.id, action: "shift.check_undone", clientId, detail: { shiftId: shift.id } });
  } else {
    if (existing) return;
    const body =
      note ??
      (result === "found"
        ? `Found at ${site.name} during the outreach shift.`
        : `Looked for them at ${site.name} during the outreach shift. Not there.`);
    await db.transaction(async (tx) => {
      await tx.insert(schema.shiftChecks).values({ shiftId: shift.id, clientId, result, byId: user.id });
      await tx.insert(schema.notes).values({
        clientId,
        authorId: user.id,
        contactDate: today,
        kind: result === "found" ? "met" : "not_found",
        contactType: "outreach_site",
        whereEnc: encryptString(site.name),
        needsAddressed: [],
        bodyEnc: encryptString(body),
      });
      await tx
        .update(schema.clients)
        .set(
          result === "found"
            ? { notRespondingSiteId: null, notRespondingAt: null, notRespondingById: null, notRespondingTipEnc: null, updatedAt: new Date() }
            : { updatedAt: new Date() },
        )
        .where(eq(schema.clients.id, clientId));
    });
    await audit({ userId: user.id, action: `shift.${result}`, clientId, detail: { shiftId: shift.id } });
  }
  for (const path of [`/shift/${shift.code}`, `/clients/${clientId}`, "/dashboard", "/sites"]) revalidatePath(path);
}
