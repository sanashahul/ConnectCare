import "dotenv/config";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { hashPassword, temporaryPassword } from "../src/lib/password";

// Creates a staff account (use for the first supervisor; after that, use the Team page).
//   npm run create-supervisor -- --email you@stanford.edu --name "Your Name"
// --reset-2fa resets two-step verification and the password for an existing account (lost phone).

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "case_manager" },
      "reset-2fa": { type: "boolean", default: false },
    },
  });
  if (!values.email) throw new Error("--email is required");
  const email = values.email.trim().toLowerCase();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL });
  const db = drizzle(pool, { schema });
  const password = temporaryPassword();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });

  if (values["reset-2fa"]) {
    if (!existing) throw new Error("No account with that email");
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(password), mustChangePassword: true, totpEnabled: false, totpSecretEnc: null, totpLastStep: null, failedLogins: 0, lockedUntil: null })
      .where(eq(schema.users.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    await db.insert(schema.auditLog).values({ action: "user.reset_by_script", detail: { targetUserId: existing.id } });
  } else {
    if (existing) throw new Error("An account with that email already exists");
    if (!values.name) throw new Error("--name is required");
    const role = values.role === "supervisor" ? "supervisor" : "case_manager";
    const [u] = await db
      .insert(schema.users)
      .values({ email, name: values.name, role, passwordHash: await hashPassword(password) })
      .returning({ id: schema.users.id });
    await db.insert(schema.auditLog).values({ action: "user.created_by_script", detail: { targetUserId: u.id, role } });
  }
  await pool.end();
  console.log(`\nEmail: ${email}\nTemporary password: ${password}\n\nSign in, then set a new password and two-step verification.\n`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
