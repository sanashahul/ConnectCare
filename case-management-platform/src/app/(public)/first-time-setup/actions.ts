"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit, requestIp } from "@/lib/audit";
import { hashPassword, passwordProblem } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { setupCodeMatches, setupStatus } from "@/lib/setup";

export type SetupState = { error?: string; name?: string; email?: string } | undefined;

const Schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
});

export async function createFirstSupervisor(_: SetupState, form: FormData): Promise<SetupState> {
  // Returned with errors so the form keeps what was typed.
  const keep = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const status = await setupStatus();
  if (status.userCount > 0) redirect("/login");
  if (!status.tablesReady || !status.keyOk) return { error: "Finish the steps above first, then reload this page.", ...keep };
  if (!(await rateLimit(`setup:${await requestIp()}`, 10, 60 * 60_000))) return { error: "Too many attempts. Wait an hour.", ...keep };
  if (!setupCodeMatches(String(form.get("code") ?? ""))) {
    await audit({ action: "setup.bad_code" });
    return { error: "That setup code doesn't match ADMIN_SETUP_CODE in Vercel.", ...keep };
  }
  const parsed = Schema.safeParse({ name: form.get("name"), email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, ...keep };
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { error: "The passwords don't match.", ...keep };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, ...keep };

  // Re-check right before inserting so two people can't both claim the first account.
  if ((await setupStatus()).userCount > 0) redirect("/login");
  const [u] = await db
    .insert(schema.users)
    .values({ ...parsed.data, role: "supervisor", passwordHash: await hashPassword(password), mustChangePassword: false })
    .returning({ id: schema.users.id });
  await audit({ userId: u.id, action: "setup.first_supervisor_created" });
  redirect("/login?setup=done");
}
