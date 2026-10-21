import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { canAccessClient } from "./access";
import type { CurrentUser } from "./auth";
import { decryptJson, encryptJson } from "./crypto";

export type ClientProfile = {
  firstName: string;
  lastName?: string;
  ageRange?: string;
  phone?: string;
  email?: string;
  howToReach?: string;
  okToLeaveMessage?: boolean | null;
  sleeping?: string;
  language?: string;
  insurance?: string;
  outreachSite?: string;
  urgentDetails?: string;
  otherInfo?: string;
  hasVehicle?: boolean;
  hasPets?: boolean;
  hasChildren?: boolean;
  filledOutBy?: "self" | "helper" | "staff";
  consentAt?: string;
};

export type ClientRow = typeof schema.clients.$inferSelect;
export type ClientWithProfile = ClientRow & { profile: ClientProfile };

export const encryptProfile = (p: ClientProfile) => encryptJson(p);

export function withProfile(row: ClientRow): ClientWithProfile {
  return { ...row, profile: decryptJson<ClientProfile>(row.profileEnc) };
}

export function displayName(p: ClientProfile) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

/** Loads a client only if this user may see it. Returns null otherwise (callers show 404). */
export async function getClientForUser(user: CurrentUser, id: string): Promise<ClientWithProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await db.query.clients.findFirst({ where: eq(schema.clients.id, id) });
  if (!row || !canAccessClient(user, row)) return null;
  return withProfile(row);
}

export async function listClientsForUser(
  user: CurrentUser,
  opts: { statuses?: ("new" | "active" | "closed")[]; assignedToId?: string } = {},
): Promise<ClientWithProfile[]> {
  const conditions = [];
  if (user.role !== "supervisor") conditions.push(eq(schema.clients.assignedToId, user.id));
  else if (opts.assignedToId) conditions.push(eq(schema.clients.assignedToId, opts.assignedToId));
  if (opts.statuses?.length) conditions.push(inArray(schema.clients.status, opts.statuses));
  const rows = await db
    .select()
    .from(schema.clients)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.clients.urgent), desc(schema.clients.updatedAt));
  return rows.map(withProfile);
}
