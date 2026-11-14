"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { isShiftGuest } from "@/lib/shift-guest";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

export type PwState = { error?: string } | undefined;

export async function changePassword(_: PwState, form: FormData): Promise<PwState> {
  const user = await requireUser({ allowPasswordChange: true, allowClinicalManager: true });
  // The shared shift-code account has no password of its own; letting someone set one would turn a
  // one-day code into a permanent login.
  if (isShiftGuest(user)) redirect("/shift");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };
  if (current === next) return { error: "Choose a different password from the temporary one." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(schema.users.id, user.id));
  await audit({ userId: user.id, action: "user.password_changed" });
  redirect("/dashboard");
}
