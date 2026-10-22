import { and, desc, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { decryptString } from "@/lib/crypto";
import { NOT_REACHED_DAYS } from "@/lib/options";

export type ContactSummary = {
  /** Date (YYYY-MM-DD) of the most recent "met" entry. */
  lastMet?: string;
  /** Where they were last seen, from the most recent "met" entry that recorded a place. */
  lastPlace?: string;
  /** "Couldn't find" entries since they were last met. */
  missesSinceMet: number;
};

/** Last time each client was met, where, and failed attempts since. */
export async function contactSummaries(clientIds: string[]): Promise<Map<string, ContactSummary>> {
  const out = new Map<string, ContactSummary>();
  if (clientIds.length === 0) return out;
  const rows = await db
    .select({
      clientId: schema.notes.clientId,
      kind: schema.notes.kind,
      contactDate: schema.notes.contactDate,
      whereEnc: schema.notes.whereEnc,
    })
    .from(schema.notes)
    .where(and(inArray(schema.notes.clientId, clientIds), inArray(schema.notes.kind, ["met", "not_found"])))
    .orderBy(desc(schema.notes.contactDate), desc(schema.notes.createdAt));
  for (const id of clientIds) out.set(id, { missesSinceMet: 0 });
  for (const r of rows) {
    const s = out.get(r.clientId)!;
    if (r.kind === "met") {
      s.lastMet ??= r.contactDate;
      if (!s.lastPlace && r.whereEnc) s.lastPlace = decryptString(r.whereEnc);
    } else if (!s.lastMet) {
      s.missesSinceMet++;
    }
  }
  return out;
}

/**
 * Days since the guest was last met, or since they were assigned if nobody has met them yet.
 * Returns null while that is under NOT_REACHED_DAYS.
 */
export function daysNotReached(
  client: { assignedAt: Date | null; createdAt: Date },
  summary: ContactSummary | undefined,
  today: string,
): number | null {
  const since = summary?.lastMet ?? (client.assignedAt ?? client.createdAt).toISOString().slice(0, 10);
  const days = Math.floor((Date.parse(today) - Date.parse(since)) / 86_400_000);
  return days >= NOT_REACHED_DAYS ? days : null;
}
