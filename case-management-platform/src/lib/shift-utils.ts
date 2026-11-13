import { randomInt } from "node:crypto";

// Pure helpers for outreach sites and shifts, kept free of the database so they are easy to test.

// Same easy-to-read alphabet as client IDs: no 0/O, 1/I/L, or U.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SHIFT_CODE_PATTERN = /^[2-9A-HJKMNP-TV-Z]{6}$/;

/** A 6-character shift code like "7K3PMQ", sent to the clinical manager on the day. */
export function generateShiftCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** What someone types ("7k3-pmq ") to the stored form ("7K3PMQ"). */
export function normalizeShiftCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "7K3PMQ" shown as "7K3-PMQ" so it is easier to read out over the phone. */
export function formatShiftCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/** A shift code opens its list only on the shift's own date (Pacific time). */
export function shiftIsOpen(shiftDate: string, todayPacific: string): boolean {
  return shiftDate === todayPacific;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Picks the site a free-text "place last seen" refers to, e.g. "outside Hope's Corner" -> Hope's Corner.
 * Returns the site whose full name appears in the text (longest name wins), or undefined.
 */
export function matchSite<T extends { name: string }>(place: string | undefined | null, sites: T[]): T | undefined {
  if (!place) return undefined;
  const text = ` ${norm(place)} `;
  let best: T | undefined;
  for (const site of sites) {
    const name = norm(site.name);
    if (name && text.includes(` ${name} `) && (!best || name.length > norm(best.name).length)) best = site;
  }
  return best;
}

/** "Sat, Nov 14" for a YYYY-MM-DD date, without shifting a day for the viewer's time zone. */
export function formatShiftDate(iso: string, opts: { year?: boolean } = {}) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(opts.year ? { year: "numeric" } : {}),
  });
}

/** The text a supervisor copies to send the clinical manager on the day. */
export function shiftMessage(s: { siteName: string; shiftDate: string; meetTime?: string | null; code: string }, siteUrl: string) {
  const when = `${formatShiftDate(s.shiftDate)}${s.meetTime ? `, ${s.meetTime}` : ""}`;
  return `ConnectCare shift code for ${s.siteName} (${when}): ${formatShiftCode(s.code)}\nSign in at ${siteUrl}/shift and enter the code to see who to look for. The code works today only.`;
}
