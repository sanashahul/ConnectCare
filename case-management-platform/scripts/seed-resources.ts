import "dotenv/config";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import type { Resource } from "../src/lib/resource-types";

// Loads data/resources.json:
//   - new ids are inserted;
//   - existing entries nobody has touched in the app (no updated_by) are refreshed from the file,
//     so new sources or flagged conflicts reach the live directory;
//   - entries edited, verified, or archived in the app are left alone (unless --overwrite).

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    if (process.argv.includes("--if-configured")) {
      console.warn("No database connected yet: skipping resource loading.");
      return;
    }
    throw new Error("DATABASE_URL is not set");
  }
  const items = JSON.parse(readFileSync("data/resources.json", "utf8")) as Resource[];
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  let n = 0;
  for (const r of items) {
    const values = { id: r.id, data: r, lastVerified: r.lastVerified, active: true };
    const q = db.insert(schema.resources).values(values);
    const res = await q.onConflictDoUpdate({
      target: schema.resources.id,
      set: { data: r, lastVerified: r.lastVerified, updatedAt: sql`now()` },
      setWhere: overwrite
        ? undefined
        : sql`${schema.resources.updatedById} is null and ${schema.resources.data} is distinct from excluded.data`,
    });
    n += res.rowCount ?? 0;
  }
  await pool.end();
  console.log(`${n} of ${items.length} resources inserted or refreshed${overwrite ? "" : " (entries edited in the app were kept)"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
