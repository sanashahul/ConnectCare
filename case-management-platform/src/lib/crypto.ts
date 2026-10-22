import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM field encryption. Ciphertext format: "v1.<iv>.<tag>.<data>" (base64url parts).
// The "v1" prefix leaves room for key rotation: add a v2 key and re-encrypt on read/write.

const VERSION = "v1";

const MIN_KEY_CHARS = 32;

function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 32) return buf;
  // Hosts that generate secrets for you (e.g. Render) may not produce exactly 32 base64 bytes.
  // Any long random value works: derive the 256-bit key from it.
  if (raw.length < MIN_KEY_CHARS) throw new Error(`DATA_ENCRYPTION_KEY must be at least ${MIN_KEY_CHARS} characters`);
  return createHash("sha256").update(raw).digest();
}

export function encryptionKeyConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptString(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptString(ciphertext: string): string {
  const [version, iv, tag, data] = ciphertext.split(".");
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error("Unrecognized ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(ciphertext: string): T {
  return JSON.parse(decryptString(ciphertext)) as T;
}
