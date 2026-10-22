import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, PARAMS);
  return `scrypt.${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split(".");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, PARAMS);
  return timingSafeEqual(expected, actual);
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (/^(.)\1+$/.test(password)) return "Password is too simple.";
  return null;
}

// Readable temporary password for new accounts, e.g. "maple-river-4821-stone".
const WORDS = [
  "maple", "river", "stone", "cedar", "harbor", "meadow", "canyon", "willow", "summit", "orchard",
  "lantern", "garden", "prairie", "falcon", "harvest", "juniper", "valley", "beacon", "redwood", "sparrow",
];
export function temporaryPassword(): string {
  const pick = () => WORDS[randomBytes(1)[0] % WORDS.length];
  const digits = (randomBytes(2).readUInt16BE() % 9000) + 1000;
  return `${pick()}-${pick()}-${digits}-${pick()}`;
}
