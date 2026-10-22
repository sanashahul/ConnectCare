"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { audit, requestIp } from "@/lib/audit";
import { decryptString } from "@/lib/crypto";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { createSession, destroySession, readSession } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";

export type FormState = { error?: string; email?: string } | undefined;

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const GENERIC = "Email or password is incorrect.";

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await requestIp();
  if (!(await rateLimit(`login:${ip}`, 20, 15 * 60_000))) return { error: "Too many attempts. Wait 15 minutes and try again.", email };

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user || !user.active) {
    await verifyPassword(password, "scrypt.AAAAAAAAAAAAAAAAAAAAAA.AAAA"); // keep timing similar
    await audit({ action: "login.failed", detail: { reason: "unknown_or_inactive" } });
    return { error: GENERIC, email };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "This account is temporarily locked after too many attempts. Try again later or ask your supervisor.", email };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set({
        failedLogins: fails >= MAX_FAILS ? 0 : fails,
        lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id));
    await audit({ userId: user.id, action: "login.failed", detail: { reason: "password", locked: fails >= MAX_FAILS } });
    return { error: GENERIC, email };
  }
  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
  await createSession(user.id, "password");
  redirect(user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
}

async function pendingSession() {
  const s = await readSession();
  if (!s) redirect("/login");
  return s;
}

export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const { session, user } = await pendingSession();
  if (session.stage === "full") redirect("/dashboard");
  if (!user.totpEnabled || !user.totpSecretEnc) redirect("/login/setup-2fa");
  if (!(await rateLimit(`totp:${user.id}`, 6, 5 * 60_000))) return { error: "Too many attempts. Wait 5 minutes." };

  const step = verifyTotp(decryptString(user.totpSecretEnc), String(form.get("code") ?? ""));
  if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) {
    await audit({ userId: user.id, action: "login.2fa_failed" });
    return { error: "That code didn't work. Check the time on your phone and try the newest code." };
  }
  await db.update(schema.users).set({ totpLastStep: step }).where(eq(schema.users.id, user.id));
  await destroySession();
  await createSession(user.id, "full");
  await audit({ userId: user.id, action: "login.success" });
  redirect(user.mustChangePassword ? "/account/password" : "/dashboard");
}

export async function confirmSetup(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await pendingSession();
  if (user.totpEnabled) redirect("/login/verify");
  if (!user.totpSecretEnc) return { error: "Setup expired. Reload the page." };
  if (!(await rateLimit(`totp:${user.id}`, 6, 5 * 60_000))) return { error: "Too many attempts. Wait 5 minutes." };
  const step = verifyTotp(decryptString(user.totpSecretEnc), String(form.get("code") ?? ""));
  if (step === null) return { error: "That code didn't match. Make sure you scanned the code on this page, then try again." };
  await db.update(schema.users).set({ totpEnabled: true, totpLastStep: step }).where(eq(schema.users.id, user.id));
  await destroySession();
  await createSession(user.id, "full");
  await audit({ userId: user.id, action: "2fa.enrolled" });
  redirect(user.mustChangePassword ? "/account/password" : "/dashboard");
}

export async function logout() {
  const s = await readSession();
  if (s) await audit({ userId: s.user.id, action: "logout" });
  await destroySession();
  redirect("/login");
}
