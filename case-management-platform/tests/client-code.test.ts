import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIENT_CODE_PATTERN, generateClientCode, normalizeClientCode } from "../src/lib/client-code";

test("client IDs have the expected readable format", () => {
  for (let i = 0; i < 500; i++) {
    const code = generateClientCode();
    assert.match(code, CLIENT_CODE_PATTERN);
    assert.ok(!/[01ILOU]/.test(code.slice(3)), `ambiguous character in ${code}`);
  }
});

test("client IDs are effectively unique", () => {
  const seen = new Set(Array.from({ length: 2000 }, generateClientCode));
  assert.ok(seen.size > 1990);
});

test("search input is normalized to an ID", () => {
  assert.equal(normalizeClientCode("cc 7k3pm"), "CC-7K3PM");
  assert.equal(normalizeClientCode("7K3PM"), "CC-7K3PM");
  assert.equal(normalizeClientCode("CC-7K"), "CC-7K");
});
