"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { hashPassword, temporaryPassword } from "@/lib/password";
import { destroyAllSessionsFor } from "@/lib/session";

export type TeamState = { error?: string; created?: { email: string; password: string; reset?: boolean } } | undefined;

const NewUser = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  role: z.enum(["case_manager", "supervisor"]),
});

export async function createUser(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireSupervisor();
  const parsed = NewUser.safeParse({ name: form.get("name"), email: form.get("email"), role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, parsed.data.email) });
  if (exists) return { error: "Someone already has that email." };
  const password = temporaryPassword();
  const [u] = await db
    .insert(schema.users)
    .values({ ...parsed.data, passwordHash: await hashPassword(password), mustChangePassword: true })
    .returning({ id: schema.users.id });
  await audit({ userId: me.id, action: "user.created", detail: { targetUserId: u.id, role: parsed.data.role } });
  revalidatePath("/team");
  return { created: { email: parsed.data.email, password } };
}

export async function resetPassword(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireSupervisor();
  const id = String(form.get("userId"));
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!u) return { error: "User not found." };
  const password = temporaryPassword();
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null })
    .where(eq(schema.users.id, id));
  await destroyAllSessionsFor(id);
  await audit({ userId: me.id, action: "user.password_reset", detail: { targetUserId: id } });
  return { created: { email: u.email, password, reset: true } };
}

export async function teamAction(form: FormData) {
  const me = await requireSupervisor();
  const id = String(form.get("userId"));
  const intent = String(form.get("intent"));
  if (id === me.id && intent === "deactivate") return;
  if (intent === "deactivate" || intent === "activate") {
    await db.update(schema.users).set({ active: intent === "activate" }).where(eq(schema.users.id, id));
    if (intent === "deactivate") await destroyAllSessionsFor(id);
  } else if (intent === "reset2fa") {
    await db.update(schema.users).set({ totpEnabled: false, totpSecretEnc: null, totpLastStep: null }).where(eq(schema.users.id, id));
    await destroyAllSessionsFor(id);
  } else return;
  await audit({ userId: me.id, action: `user.${intent}`, detail: { targetUserId: id } });
  revalidatePath("/team");
}
