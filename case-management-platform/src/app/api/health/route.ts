import { sql } from "drizzle-orm";
import { db } from "@/db";

// For the host's health check. Reports only up/down, never configuration details.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
