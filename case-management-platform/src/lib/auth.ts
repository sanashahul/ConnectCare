import { notFound, redirect } from "next/navigation";
import { canOpenShift } from "./access";
import { readSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof readSession>>>["user"];

/**
 * Signed-in staff member (password + 2FA), or redirect to login.
 * Clinical managers only use the shift pages (and their own password page): everywhere else
 * they are sent to /shift, unless the caller passes allowClinicalManager.
 */
export async function requireUser(
  opts: { allowPasswordChange?: boolean; allowClinicalManager?: boolean } = {},
): Promise<CurrentUser> {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.session.stage !== "full") redirect(s.user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
  if (s.user.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  if (s.user.role === "clinical_manager" && !opts.allowClinicalManager) redirect("/shift");
  return s.user;
}

/** Clinical managers and supervisors: the people who can open a shift's list. */
export async function requireShiftViewer(): Promise<CurrentUser> {
  const user = await requireUser({ allowClinicalManager: true });
  if (!canOpenShift(user)) notFound();
  return user;
}

export async function requireSupervisor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "supervisor") notFound();
  return user;
}

export function isSupervisor(user: { role: string }) {
  return user.role === "supervisor";
}
