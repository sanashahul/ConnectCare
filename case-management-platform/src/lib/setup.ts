import { timingSafeEqual } from "node:crypto";
import { count } from "drizzle-orm";
import { databaseUrl, db, schema } from "@/db";
import { encryptionKeyConfigured } from "./crypto";

export type SetupStatus = {
  dbConfigured: boolean;
  dbReachable: boolean;
  tablesReady: boolean;
  userCount: number;
  keyOk: boolean;
  googleSecretOk: boolean;
  setupCodeOk: boolean;
};

export async function setupStatus(): Promise<SetupStatus> {
  const status: SetupStatus = {
    dbConfigured: !!databaseUrl(),
    dbReachable: false,
    tablesReady: false,
    userCount: 0,
    keyOk: encryptionKeyConfigured(),
    googleSecretOk: (process.env.GOOGLE_FORM_WEBHOOK_SECRET ?? "").length >= 32,
    setupCodeOk: (process.env.ADMIN_SETUP_CODE ?? "").length >= 12,
  };
  if (!status.dbConfigured) return status;
  try {
    const [{ n }] = await db.select({ n: count() }).from(schema.users);
    status.dbReachable = true;
    status.tablesReady = true;
    status.userCount = n;
  } catch (err) {
    // Postgres "undefined_table": connected, but migrations have not run yet.
    const code = (err as { code?: string; cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;
    status.dbReachable = code === "42P01";
  }
  return status;
}

export function setupCodeMatches(input: string): boolean {
  const expected = process.env.ADMIN_SETUP_CODE ?? "";
  if (expected.length < 12) return false;
  const a = Buffer.from(input.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
