import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Neon (via Vercel) provides DATABASE_URL; some setups name it POSTGRES_URL.
export function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

const globalForDb = globalThis as unknown as { db?: NodePgDatabase<typeof schema> };

function connect() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  // Small pool: on Vercel each function instance holds its own connections.
  return drizzle(new Pool({ connectionString: url, max: 5 }), { schema });
}

// Connect on first use, not at import, so the app can build before a database exists.
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop) {
    globalForDb.db ??= connect();
    return Reflect.get(globalForDb.db, prop, globalForDb.db);
  },
});
export { schema };
