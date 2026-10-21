import { randomInt } from "node:crypto";

// Client IDs like "CC-7K3PM". Random rather than sequential so they reveal nothing
// about how many people we serve or when someone was added. The alphabet leaves out
// 0/O, 1/I/L, and U so IDs are easy to read aloud and copy by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CLIENT_CODE_PATTERN = /^CC-[2-9A-HJKMNP-TV-Z]{5}$/;

export function generateClientCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `CC-${s}`;
}

/** Normalizes what staff type in a search box ("cc 7k3pm", "7K3PM") to "CC-7K3PM". */
export function normalizeClientCode(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^CC/, "");
  return `CC-${s}`;
}
