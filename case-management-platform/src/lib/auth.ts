import { notFound, redirect } from "next/navigation";
import { readSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof readSession>>>["user"];

/** Signed-in staff member (password + 2FA), or redirect to login. */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.session.stage !== "full") redirect(s.user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
  if (s.user.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  return s.user;
}

export async function requireSupervisor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "supervisor") notFound();
  return user;
}

export function isSupervisor(user: { role: string }) {
  return user.role === "supervisor";
}
