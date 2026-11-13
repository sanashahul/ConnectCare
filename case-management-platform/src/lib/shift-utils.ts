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

export type ParsedShift = { date: string; meetTime?: string; returnTime?: string; siteName: string; address?: string };
export type ParseResult = { shifts: ParsedShift[]; skipped: string[] };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function parseDate(text: string): string | undefined {
  // "Saturday, November 14, 2026" or "Nov 14, 2026"
  const m = text.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const month = MONTHS.findIndex((name) => name.startsWith(m[1].toLowerCase()));
    if (month >= 0) return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  // "11/14/2026"
  const us = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  // "2026-11-14"
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  return undefined;
}

function cleanTime(t: string) {
  return t.replace(/\s+/g, " ").replace(/\s*([ap])\.?m\.?/i, (_, ap: string) => ` ${ap.toLowerCase()}m`).trim();
}

/** Splits "Hope's Corner: 748 Mercy St, ..." or "Neighborhood Hands on 500 Coleman Ave ..." into name and address. */
export function splitSite(text: string): { name: string; address?: string } {
  const t = text.trim();
  const colon = t.indexOf(":");
  if (colon > 0) {
    const name = t.slice(0, colon).trim();
    const address = t.slice(colon + 1).trim();
    return { name, address: address || undefined };
  }
  const on = t.match(/^(.*?)\s+(?:on|at)\s+(\d.*)$/i);
  if (on) return { name: on[1].trim(), address: on[2].replace(/\s+in\s+/i, ", ").trim() };
  return { name: t };
}

/**
 * Reads rows pasted from the outreach schedule spreadsheet. Each row has a date, a
 * "Meet at ... at 7:15 am, return ... at 10:30 am" cell, and a site cell. Cells may be
 * separated by tabs (copied from Sheets) or by " | ".
 */
export function parseSchedule(text: string): ParseResult {
  const shifts: ParsedShift[] = [];
  const skipped: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/\t+|\s\|\s/).map((c) => c.trim()).filter(Boolean);
    const date = parseDate(cells[0] ?? "");
    if (!date || cells.length < 2) {
      skipped.push(line);
      continue;
    }
    const rest = cells.slice(1);
    const timeCellIndex = rest.findIndex((c) => /\d{1,2}(:\d{2})?\s*[ap]\.?m/i.test(c));
    const times = timeCellIndex >= 0 ? [...rest[timeCellIndex].matchAll(/\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/gi)].map((m) => cleanTime(m[0])) : [];
    const siteCell = rest.filter((_, i) => i !== timeCellIndex).join(" ").trim();
    if (!siteCell) {
      skipped.push(line);
      continue;
    }
    const { name, address } = splitSite(siteCell);
    shifts.push({ date, meetTime: times[0], returnTime: times[1], siteName: name, address });
  }
  return { shifts, skipped };
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
