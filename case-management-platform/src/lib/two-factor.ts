import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decryptString, encryptString } from "./crypto";
import { generateTotpSecret } from "./totp";

// Not a server action: only called from the setup page for the signed-in user.
/** Creates (or reuses) the not-yet-confirmed authenticator secret for enrollment. */
export async function ensurePendingTotpSecret(userId: string, existingEnc: string | null, enabled: boolean) {
  if (enabled) return null;
  if (existingEnc) return decryptString(existingEnc);
  const secret = generateTotpSecret();
  await db.update(schema.users).set({ totpSecretEnc: encryptString(secret) }).where(eq(schema.users.id, userId));
  return secret;
}
