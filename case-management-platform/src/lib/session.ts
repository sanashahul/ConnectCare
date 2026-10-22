import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "cc_session";
const ABSOLUTE_HOURS = 12;
// Half-signed-in sessions (password ok, 2FA pending) expire quickly.
const PENDING_MINUTES = 10;

function idleMinutes() {
  return Number(process.env.SESSION_IDLE_MINUTES ?? 30);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionStage = "password" | "full";

/** Must be called from a Server Action or Route Handler (sets a cookie). */
export async function createSession(userId: string, stage: SessionStage) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + (stage === "full" ? ABSOLUTE_HOURS * 3600_000 : PENDING_MINUTES * 60_000));
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, stage, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const row = await db.query.sessions.findFirst({ where: eq(schema.sessions.id, id) });
  if (!row) return null;
  const now = Date.now();
  const idleExpired = row.stage === "full" && now - row.lastSeenAt.getTime() > idleMinutes() * 60_000;
  if (row.expiresAt.getTime() < now || idleExpired) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
  if (!user || !user.active) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  if (now - row.lastSeenAt.getTime() > 60_000) {
    await db.update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, id));
  }
  return { session: row, user };
}

/** Ends the current session and clears the cookie. Server Action / Route Handler only. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsFor(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function purgeExpiredSessions() {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}
