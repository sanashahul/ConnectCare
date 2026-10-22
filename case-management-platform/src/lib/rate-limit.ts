import { and, count, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";

// Sliding-window limiter stored in Postgres, so it works across serverless instances.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.rateLimitHits)
    .where(and(eq(schema.rateLimitHits.key, key), gt(schema.rateLimitHits.at, since)));
  if (n >= limit) return false;
  await db.insert(schema.rateLimitHits).values({ key });
  // Occasionally clear out entries older than any window we use (1 day).
  if (Math.random() < 0.02) {
    await db.delete(schema.rateLimitHits).where(lt(schema.rateLimitHits.at, new Date(Date.now() - 86_400_000)));
  }
  return true;
}
