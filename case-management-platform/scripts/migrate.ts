import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Prefer the direct (unpooled) connection for schema changes when the host provides one (Neon on Vercel).
const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

async function main() {
  if (!url) {
    // First Vercel deploy happens before the database is connected: build the site anyway.
    if (process.argv.includes("--if-configured")) {
      console.warn("No database connected yet: skipping migrations. Connect a database and redeploy.");
      return;
    }
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Database is up to date.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
