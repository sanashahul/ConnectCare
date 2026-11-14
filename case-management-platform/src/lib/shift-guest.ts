import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { hashPassword } from "./password";

// Clinical managers can open a shift's list with just the shift code, without an account.
// They are signed in as one built-in "Clinical team" account that nobody can sign in to with a
// password, and a cookie records which shift code they entered and the name they typed.
// That session can only open that one shift's list, on the shift date.

export const SHIFT_GUEST_EMAIL = "shift-code@connectcare.invalid";
export const SHIFT_GUEST_COOKIE = "cc_shift_pass";

export function isShiftGuest(user: { email: string }) {
  return user.email === SHIFT_GUEST_EMAIL;
}

/** The built-in account behind shift-code sign-ins, created the first time someone uses a code. */
export async function shiftGuestUser() {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, SHIFT_GUEST_EMAIL) });
  if (existing) return existing;
  const [created] = await db
    .insert(schema.users)
    .values({
      email: SHIFT_GUEST_EMAIL,
      name: "Clinical team",
      role: "clinical_manager",
      // A random password nobody knows: this account can't be signed in to with email and password.
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      mustChangePassword: false,
    })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.query.users.findFirst({ where: eq(schema.users.email, SHIFT_GUEST_EMAIL) }))!;
}

export type ShiftPass = { code: string; name: string };

export async function readShiftPass(): Promise<ShiftPass | null> {
  const raw = (await cookies()).get(SHIFT_GUEST_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ShiftPass;
    return typeof v.code === "string" && typeof v.name === "string" ? v : null;
  } catch {
    return null;
  }
}

/** Server Action only (sets a cookie). */
export async function writeShiftPass(pass: ShiftPass) {
  (await cookies()).set(SHIFT_GUEST_COOKIE, JSON.stringify(pass), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function clearShiftPass() {
  (await cookies()).delete(SHIFT_GUEST_COOKIE);
}

/**
 * For a shift-code session: the code it was opened with, or null when `user` is a regular account.
 * Shift-code sessions may only use that one code.
 */
export async function guestCodeFor(user: { email: string }): Promise<string | null> {
  if (!isShiftGuest(user)) return null;
  return (await readShiftPass())?.code ?? "";
}
