import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

import { canAccessClient } from "../src/lib/access";
import { decryptJson, decryptString, encryptJson, encryptString } from "../src/lib/crypto";
import { hashPassword, passwordProblem, verifyPassword } from "../src/lib/password";
import { redactIdentifiers } from "../src/lib/redact";
import { base32Decode, base32Encode, totpAt, verifyTotp } from "../src/lib/totp";

// The key is read when encrypting, so setting it here (after imports) is fine.
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("encryption round-trips and hides plaintext", () => {
  const value = { firstName: "Maria", phone: "408-555-1212" };
  const enc = encryptJson(value);
  assert.ok(!enc.includes("Maria") && !enc.includes("408"));
  assert.deepEqual(decryptJson(enc), value);
  assert.notEqual(encryptString("same"), encryptString("same"), "random IV per value");
});

test("a long non-base64 key (as some hosts generate) still works", () => {
  const saved = process.env.DATA_ENCRYPTION_KEY;
  process.env.DATA_ENCRYPTION_KEY = "kq9Zr-generated_by_host_value_that_is_long_enough_123";
  assert.equal(decryptString(encryptString("hello")), "hello");
  process.env.DATA_ENCRYPTION_KEY = "too-short";
  assert.throws(() => encryptString("hello"));
  process.env.DATA_ENCRYPTION_KEY = saved;
});

test("tampered ciphertext is rejected", () => {
  const enc = encryptString("secret note");
  const parts = enc.split(".");
  const data = Buffer.from(parts[3], "base64url");
  data[0] ^= 1;
  parts[3] = data.toString("base64url");
  assert.throws(() => decryptString(parts.join(".")));
});

test("TOTP matches RFC 6238 SHA-1 test vectors", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  // RFC 6238 Appendix B, last 6 digits.
  assert.equal(totpAt(secret, Math.floor(59 / 30)), "287082");
  assert.equal(totpAt(secret, Math.floor(1111111109 / 30)), "081804");
  assert.equal(totpAt(secret, Math.floor(1234567890 / 30)), "005924");
  assert.equal(base32Decode(secret).toString(), "12345678901234567890");
});

test("TOTP verification accepts current code, rejects wrong ones", () => {
  const secret = base32Encode(randomBytes(20));
  const now = Date.now();
  const step = Math.floor(now / 30000);
  assert.equal(verifyTotp(secret, totpAt(secret, step), now), step);
  assert.equal(verifyTotp(secret, totpAt(secret, step - 5), now), null);
  assert.equal(verifyTotp(secret, "abcdef", now), null);
});

test("passwords hash and verify", async () => {
  const h = await hashPassword("correct horse battery");
  assert.ok(await verifyPassword("correct horse battery", h));
  assert.ok(!(await verifyPassword("wrong password here", h)));
  assert.ok(passwordProblem("short"));
  assert.equal(passwordProblem("a long enough passphrase"), null);
});

test("case managers only see their own clients; supervisors see all", () => {
  const cm = { id: "cm-1", role: "case_manager" };
  const other = { id: "cm-2", role: "case_manager" };
  const sup = { id: "sup-1", role: "supervisor" };
  const client = { assignedToId: "cm-1" };
  const unassigned = { assignedToId: null };
  assert.equal(canAccessClient(cm, client), true);
  assert.equal(canAccessClient(other, client), false);
  assert.equal(canAccessClient(cm, unassigned), false);
  assert.equal(canAccessClient(sup, client), true);
  assert.equal(canAccessClient(sup, unassigned), true);
});

test("redaction removes identifiers before AI requests", () => {
  const out = redactIdentifiers(
    "Maria Lopez (maria@example.com, 408-555-1212, DOB 3/14/1980, SSN 123-45-6789) sleeps at 123 Main St",
    ["Maria", "Lopez"],
  );
  for (const leaked of ["Maria", "Lopez", "maria@", "555-1212", "1980", "6789", "123 Main"]) {
    assert.ok(!out.includes(leaked), `leaked ${leaked}: ${out}`);
  }
});
