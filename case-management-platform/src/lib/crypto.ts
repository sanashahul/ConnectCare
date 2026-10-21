import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM field encryption. Ciphertext format: "v1.<iv>.<tag>.<data>" (base64url parts).
// The "v1" prefix leaves room for key rotation: add a v2 key and re-encrypt on read/write.

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return buf;
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
