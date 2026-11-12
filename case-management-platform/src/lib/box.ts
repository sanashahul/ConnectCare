import type { ClientProfile } from "./clients";

// Box mode keeps everything that identifies a client in Box (Stanford's Box, covered by
// Stanford's agreements) instead of in this app's database. The app keeps only the client
// ID, coarse area, need categories, and work status, plus a link to the client's Box folder.
// Turn it on with PHI_IN_BOX=true. See PRIVACY.md, "Keeping client details in Box".

export function phiInBox(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.PHI_IN_BOX ?? "");
}

/**
 * Accepts a Box folder or shared link (app.box.com, stanford.app.box.com, stanford.box.com...)
 * and returns it cleaned up, or null if it isn't an https Box link. Query strings and
 * fragments are dropped so nothing extra rides along in the stored URL.
 */
export function parseBoxUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (host !== "box.com" && !host.endsWith(".box.com")) return null;
  if (!/^\/(folder|s|file)\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return null;
  return `https://${host}${url.pathname.replace(/\/$/, "")}`;
}

// Profile answers that don't identify someone and that the app needs to work: matching
// resources, printing in the right language, and the intake record. Everything else
// (name, pronouns, contact details, where they stay, health, disability, insurance, PCP,
// free-text answers, who helped them) belongs in Box.
const NON_IDENTIFYING = [
  "ageRange",
  "language", // a choice from a list; an "Other" language's free text (languageOther) goes to Box
  "formLanguage",
  "hasVehicle",
  "hasPets",
  "hasChildren",
  "filledOutBy",
  "consentAt",
  "healthInBox",
] as const satisfies readonly (keyof ClientProfile)[];

/** The profile with every identifying field removed. firstName stays as "" (the app shows the client ID instead). */
export function stripIdentifying(p: ClientProfile): ClientProfile {
  const out: ClientProfile = { firstName: "" };
  for (const k of NON_IDENTIFYING) {
    if (p[k] !== undefined) (out as Record<string, unknown>)[k] = p[k];
  }
  return out;
}

/** True when the stored profile still holds something stripIdentifying would remove. */
export function hasIdentifying(p: ClientProfile): boolean {
  const keep = new Set<string>(NON_IDENTIFYING);
  return Object.entries(p).some(([k, v]) => !keep.has(k) && v !== undefined && v !== null && v !== "" && v !== false);
}

// Health and other sensitive answers. For a single client, a case manager can move these
// into the client's Box folder ("Move health details to Box") while the rest of the profile
// (name, how to reach them) stays in the app for day-to-day work.
export const HEALTH_FIELDS = [
  "lgbtqCare",
  "disability",
  "accessNeeds",
  "insurance",
  "primaryCare",
  "urgentDetails",
  "otherInfo",
] as const satisfies readonly (keyof ClientProfile)[];

/** The profile with health details removed and marked as kept in Box. */
export function stripHealth(p: ClientProfile): ClientProfile {
  const out: ClientProfile = { ...p, healthInBox: true };
  for (const k of HEALTH_FIELDS) delete out[k];
  return out;
}

/** True when the profile still holds any health details. */
export function hasHealthDetails(p: ClientProfile): boolean {
  return HEALTH_FIELDS.some((k) => p[k] !== undefined && p[k] !== null && p[k] !== "" && p[k] !== false);
}
