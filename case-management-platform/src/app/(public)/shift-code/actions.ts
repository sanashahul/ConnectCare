"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, requestIp } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";
import { shiftGuestUser, writeShiftPass } from "@/lib/shift-guest";
import { normalizeShiftCode, shiftIsOpen } from "@/lib/shift-utils";
import { pacificToday, shiftByCode } from "@/lib/shifts";

export type ShiftCodeState = { error?: string; name?: string } | undefined;

const Entry = z.object({
  code: z.string().transform(normalizeShiftCode).pipe(z.string().min(1, "Enter the shift code you were sent.")),
  name: z.string().trim().min(1, "Enter your name, so the case manager knows who wrote your notes.").max(60),
});

/**
 * Opens a shift's list with just its code: no account needed. Limited to 10 tries per
 * 15 minutes from one network, so codes can't be guessed.
 */
export async function enterShiftCode(_: ShiftCodeState, form: FormData): Promise<ShiftCodeState> {
  const parsed = Entry.safeParse({ code: String(form.get("code") ?? ""), name: String(form.get("name") ?? "") });
  const name = String(form.get("name") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, name };
  const ip = await requestIp();
  if (!(await rateLimit(`shift-code-ip:${ip}`, 10, 15 * 60_000))) {
    return { error: "Too many tries. Wait 15 minutes, or ask your supervisor to check the code.", name };
  }
  const found = await shiftByCode(parsed.data.code);
  if (!found || !shiftIsOpen(found.shift.shiftDate, pacificToday())) {
    await audit({ action: "shift.code_failed", detail: { via: "shift_code_page", reason: found ? "wrong_day" : "unknown" } });
    return {
      error: found ? "That code is for a different day. Codes only work on the day of the shift." : "That code wasn't found. Check it with your supervisor.",
      name,
    };
  }
  const guest = await shiftGuestUser();
  await destroySession();
  await createSession(guest.id, "full");
  await writeShiftPass({ code: found.shift.code, name: parsed.data.name });
  await audit({ userId: guest.id, action: "shift.code_signin", detail: { shiftId: found.shift.id, siteId: found.site.id } });
  redirect(`/shift/${found.shift.code}`);
}
