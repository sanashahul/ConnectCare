import "dotenv/config";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import type { Resource } from "../src/lib/resource-types";

// Loads data/resources.json. New ids are inserted. Existing ids are left alone unless
// --overwrite is passed, so edits made in the app are not lost.

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const items = JSON.parse(readFileSync("data/resources.json", "utf8")) as Resource[];
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  let n = 0;
  for (const r of items) {
    const values = { id: r.id, data: r, lastVerified: r.lastVerified, active: true };
    const q = db.insert(schema.resources).values(values);
    const res = overwrite
      ? await q.onConflictDoUpdate({ target: schema.resources.id, set: { data: r, lastVerified: r.lastVerified, updatedAt: sql`now()` } })
      : await q.onConflictDoNothing();
    n += res.rowCount ?? 0;
  }
  await pool.end();
  console.log(`${n} of ${items.length} resources ${overwrite ? "inserted or updated" : "inserted (existing ones kept)"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
