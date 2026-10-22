import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Resource } from "./resource-types";

/** Adds a resource to the shared directory with an id made from its name. Returns the id. */
export async function insertDirectoryResource(data: Omit<Resource, "id">, userId: string): Promise<string> {
  const base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "resource";
  let id = base;
  for (let n = 2; await getResource(id); n++) id = `${base}-${n}`;
  await db.insert(schema.resources).values({ id, data: { ...data, id }, lastVerified: data.lastVerified, updatedById: userId });
  return id;
}

export async function getActiveResources(): Promise<Resource[]> {
  const rows = await db.select().from(schema.resources).where(eq(schema.resources.active, true));
  return rows.map(toResource).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getResource(id: string): Promise<(Resource & { active: boolean }) | null> {
  const row = await db.query.resources.findFirst({ where: eq(schema.resources.id, id) });
  return row ? { ...toResource(row), active: row.active } : null;
}

function toResource(row: typeof schema.resources.$inferSelect): Resource {
  const data = row.data as Resource;
  return { ...data, id: row.id, lastVerified: row.lastVerified ?? data.lastVerified };
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export const STALE_AFTER_DAYS = 90;
