"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit, requestIp } from "@/lib/audit";
import { hashPassword, temporaryPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { destroyAllSessionsFor } from "@/lib/session";
import { setupCodeMatches } from "@/lib/setup";

export type RecoverState = { error?: string; password?: string } | undefined;

/** Lost-phone recovery for supervisors, gated by the ADMIN_SETUP_CODE only the Vercel owner can see. */
export async function recoverSupervisor(_: RecoverState, form: FormData): Promise<RecoverState> {
  if (!(await rateLimit(`recover:${await requestIp()}`, 5, 60 * 60_000))) return { error: "Too many attempts. Wait an hour." };
  if (!setupCodeMatches(String(form.get("code") ?? ""))) {
    await audit({ action: "recover.bad_code" });
    return { error: "That setup code is not correct." };
  }
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user || user.role !== "supervisor") return { error: "No supervisor account with that email." };
  const password = temporaryPassword();
  await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      totpEnabled: false,
      totpSecretEnc: null,
      totpLastStep: null,
      failedLogins: 0,
      lockedUntil: null,
      active: true,
    })
    .where(eq(schema.users.id, user.id));
  await destroyAllSessionsFor(user.id);
  await audit({ action: "recover.supervisor_reset", detail: { targetUserId: user.id } });
  return { password };
}
