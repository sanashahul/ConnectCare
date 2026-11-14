import { and, asc, count, desc, eq, gt, gte, inArray, ne, or } from "drizzle-orm";
import { DatabaseError } from "pg";
import { db, schema } from "@/db";
import { displayName, withProfile } from "./clients";
import { contactSummaries } from "./contacts";
import { decryptString } from "./crypto";
import { pacificDate } from "./report";
import { formatShiftDate, generateShiftCode, normalizeShiftCode } from "./shift-utils";

export type Site = typeof schema.sites.$inferSelect;
export type Shift = typeof schema.shifts.$inferSelect;

export const pacificToday = () => pacificDate(new Date());

// Wrong shift codes allowed per person per hour, so codes can't be guessed.
const WRONG_CODE_LIMIT = 10;
const WRONG_CODE_WINDOW_MS = 60 * 60_000;

/** True once someone has entered too many wrong codes this hour. Checked before any code is looked up. */
export async function shiftCodeLocked(userId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.rateLimitHits)
    .where(and(eq(schema.rateLimitHits.key, `shift-code:${userId}`), gt(schema.rateLimitHits.at, new Date(Date.now() - WRONG_CODE_WINDOW_MS))));
  return n >= WRONG_CODE_LIMIT;
}

export async function recordWrongShiftCode(userId: string) {
  await db.insert(schema.rateLimitHits).values({ key: `shift-code:${userId}` });
}

export async function listSites(opts: { activeOnly?: boolean } = {}) {
  return db.query.sites.findMany({
    where: opts.activeOnly ? eq(schema.sites.active, true) : undefined,
    orderBy: [asc(schema.sites.name)],
  });
}

/** Adds a shift with a fresh code, retrying on the rare collision. */
export async function insertShift(values: Omit<typeof schema.shifts.$inferInsert, "id" | "code">) {
  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db.insert(schema.shifts).values({ ...values, code: generateShiftCode() }).returning();
      return row;
    } catch (e) {
      if (attempt < 5 && e instanceof DatabaseError && e.code === "23505" && e.constraint === "shifts_code_unique") continue;
      throw e;
    }
  }
}

/** Shifts from today on, soonest first, with their site. */
export async function upcomingShifts(today = pacificToday()) {
  return db
    .select({ shift: schema.shifts, site: schema.sites })
    .from(schema.shifts)
    .innerJoin(schema.sites, eq(schema.shifts.siteId, schema.sites.id))
    .where(gte(schema.shifts.shiftDate, today))
    .orderBy(asc(schema.shifts.shiftDate), asc(schema.shifts.createdAt));
}

export async function shiftByCode(input: string) {
  const code = normalizeShiftCode(input);
  if (!code) return null;
  const [row] = await db
    .select({ shift: schema.shifts, site: schema.sites })
    .from(schema.shifts)
    .innerJoin(schema.sites, eq(schema.shifts.siteId, schema.sites.id))
    .where(eq(schema.shifts.code, code));
  return row ?? null;
}

/** How many open clients are marked "not responding" at each site. */
export async function notRespondingCounts() {
  const rows = await db
    .select({ siteId: schema.clients.notRespondingSiteId })
    .from(schema.clients)
    .where(ne(schema.clients.status, "closed"));
  const counts = new Map<string, number>();
  for (const r of rows) if (r.siteId) counts.set(r.siteId, (counts.get(r.siteId) ?? 0) + 1);
  return counts;
}

export type ShiftListEntry = {
  clientId: string;
  clientCode: string;
  /** First name and last initial only: enough to find someone, no more. */
  name: string;
  pronouns?: string;
  caseManager?: string;
  markedAt?: Date;
  tip?: string;
  lastMet?: string;
  lastPlace?: string;
  /** Where they said they usually stay or can be found, from intake. */
  usuallyAt?: string;
  check?: { result: "found" | "not_here"; at: Date; by: string };
};

/**
 * The people a clinical manager looks for on a shift: open clients marked "not responding" at
 * the shift's site, plus anyone already checked on this shift (so "Found" stays on the list).
 * Only what helps find someone is returned: no needs, health, contact details or notes.
 */
export async function shiftList(shift: Shift): Promise<ShiftListEntry[]> {
  const checks = await db
    .select({ check: schema.shiftChecks, by: schema.users.name })
    .from(schema.shiftChecks)
    .innerJoin(schema.users, eq(schema.shiftChecks.byId, schema.users.id))
    .where(eq(schema.shiftChecks.shiftId, shift.id));
  const checkedIds = checks.map((c) => c.check.clientId);
  const rows = await db
    .select({ client: schema.clients, caseManager: schema.users.name })
    .from(schema.clients)
    .leftJoin(schema.users, eq(schema.clients.assignedToId, schema.users.id))
    .where(
      or(
        and(eq(schema.clients.notRespondingSiteId, shift.siteId), ne(schema.clients.status, "closed")),
        checkedIds.length ? inArray(schema.clients.id, checkedIds) : undefined,
      ),
    );
  const contacts = await contactSummaries(rows.map((r) => r.client.id));
  const checkFor = new Map(checks.map((c) => [c.check.clientId, { result: c.check.result, at: c.check.at, by: c.by }]));
  return rows
    .map(({ client, caseManager }) => {
      const p = withProfile(client).profile;
      const c = contacts.get(client.id);
      const name = p.lastName ? `${p.firstName} ${p.lastName.charAt(0)}.` : displayName(p, client.clientCode);
      return {
        clientId: client.id,
        clientCode: client.clientCode,
        name,
        pronouns: p.pronouns,
        caseManager: caseManager ?? undefined,
        markedAt: client.notRespondingAt ?? undefined,
        tip: client.notRespondingTipEnc ? decryptString(client.notRespondingTipEnc) : undefined,
        lastMet: c?.lastMet,
        lastPlace: c?.lastPlace,
        usuallyAt: p.howToReach || p.outreachSite || undefined,
        check: checkFor.get(client.id),
      };
    })
    .sort((a, b) => Number(!!a.check) - Number(!!b.check) || a.name.localeCompare(b.name));
}

/** For the client page: the site they're being looked for at, who marked it, and the next shift there. */
export async function notRespondingInfo(client: typeof schema.clients.$inferSelect) {
  if (!client.notRespondingSiteId) return null;
  const today = pacificToday();
  const [site, by, next] = await Promise.all([
    db.query.sites.findFirst({ where: eq(schema.sites.id, client.notRespondingSiteId) }),
    client.notRespondingById ? db.query.users.findFirst({ where: eq(schema.users.id, client.notRespondingById) }) : null,
    db.query.shifts.findFirst({
      where: and(eq(schema.shifts.siteId, client.notRespondingSiteId), gte(schema.shifts.shiftDate, today)),
      orderBy: [asc(schema.shifts.shiftDate)],
    }),
  ]);
  if (!site) return null;
  return {
    siteName: site.name,
    at: client.notRespondingAt,
    by: by?.name,
    tip: client.notRespondingTipEnc ? decryptString(client.notRespondingTipEnc) : undefined,
    nextShift: next ? `${formatShiftDate(next.shiftDate)}${next.meetTime ? `, ${next.meetTime}` : ""}` : undefined,
  };
}

/**
 * The one access check for anything a clinical manager does with a person on a shift's list
 * (record a result, add a quick note, open their resource plan). Returns null unless the code is a
 * real shift, open today (supervisors may preview other days when `allowPreview`), and the client is
 * on that shift's list: marked "Don't respond" at its site, or already checked on this shift.
 * Wrong codes count toward the lockout.
 */
export async function shiftClient(user: { id: string; role: string }, code: string, clientId: string, opts: { allowPreview?: boolean } = {}) {
  if (await shiftCodeLocked(user.id)) return null;
  const found = await shiftByCode(code);
  const open = found ? found.shift.shiftDate === pacificToday() : false;
  if (!found || (!open && !(opts.allowPreview && user.role === "supervisor"))) {
    await recordWrongShiftCode(user.id);
    return null;
  }
  const client = await db.query.clients.findFirst({ where: eq(schema.clients.id, clientId) });
  if (!client) return null;
  const check = await db.query.shiftChecks.findFirst({
    where: and(eq(schema.shiftChecks.shiftId, found.shift.id), eq(schema.shiftChecks.clientId, clientId)),
  });
  const onList = (client.notRespondingSiteId === found.site.id && client.status !== "closed") || !!check;
  if (!onList) return null;
  return { ...found, client, check: check ?? null, open };
}

/** Quick notes written on this shift's date by the clinical team, per client, newest first. */
export async function shiftNotes(clientIds: string[], shiftDate: string) {
  const out = new Map<string, { body: string; by: string; at: Date }[]>();
  if (clientIds.length === 0) return out;
  const rows = await db
    .select({ note: schema.notes, by: schema.users.name })
    .from(schema.notes)
    .innerJoin(schema.users, eq(schema.notes.authorId, schema.users.id))
    .where(
      and(
        inArray(schema.notes.clientId, clientIds),
        eq(schema.notes.contactDate, shiftDate),
        eq(schema.notes.kind, "update"),
        inArray(schema.users.role, ["clinical_manager", "supervisor"]),
      ),
    )
    .orderBy(desc(schema.notes.createdAt));
  for (const r of rows) {
    const list = out.get(r.note.clientId) ?? [];
    list.push({ body: decryptString(r.note.bodyEnc), by: r.by, at: r.note.createdAt });
    out.set(r.note.clientId, list);
  }
  return out;
}
