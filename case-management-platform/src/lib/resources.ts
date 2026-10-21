import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Resource } from "./resource-types";

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
