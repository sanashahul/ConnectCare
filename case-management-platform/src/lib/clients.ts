import { and, desc, eq, inArray } from "drizzle-orm";
import { DatabaseError } from "pg";
import { db, schema } from "@/db";
import { canAccessClient } from "./access";
import { generateClientCode } from "./client-code";
import type { CurrentUser } from "./auth";
import { decryptJson, encryptJson } from "./crypto";

export type ClientProfile = {
  firstName: string;
  lastName?: string;
  pronouns?: string;
  ageRange?: string;
  phone?: string;
  email?: string;
  howToReach?: string;
  okToLeaveMessage?: boolean | null;
  sleeping?: string;
  language?: string;
  /** When language is "Other": what they wrote. */
  languageOther?: string;
  /** Would like LGBTQ+ affirming care. Kept encrypted, never in the plaintext needs list. */
  lgbtqCare?: boolean;
  /** "Yes" | "No" | "Prefer not to say". Encrypted like the rest of the profile. */
  disability?: string;
  /** Accommodations that would help (wheelchair access, ASL, large print...). */
  accessNeeds?: string;
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

type NewClient = Omit<typeof schema.clients.$inferInsert, "id" | "clientCode">;

export const SOURCE_LABELS: Record<string, string> = {
  public_form: "Website form",
  google_form: "Google Form",
  staff: "Added by staff",
};

/** Inserts a client with a fresh random ID, retrying on the rare collision. */
export async function insertClient(values: NewClient) {
  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db
        .insert(schema.clients)
        .values({ ...values, clientCode: generateClientCode() })
        .returning({ id: schema.clients.id, clientCode: schema.clients.clientCode });
      return row;
    } catch (err) {
      const unique = err instanceof DatabaseError && err.code === "23505" && err.constraint?.includes("client_code");
      if (!unique || attempt >= 5) throw err;
    }
  }
}

export function displayName(p: ClientProfile) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

/** Needs used for resource matching: the plaintext list plus encrypted profile answers. */
export function matchingNeeds(client: { needs: string[]; profile: ClientProfile }) {
  return client.profile.lgbtqCare && !client.needs.includes("lgbtq") ? [...client.needs, "lgbtq"] : client.needs;
}

export function languageLabel(p: ClientProfile) {
  return p.language === "Other" && p.languageOther ? p.languageOther : p.language;
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
