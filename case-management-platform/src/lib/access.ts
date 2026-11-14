// Pure access rules, kept separate so they are easy to test and to review.

export type Role = "supervisor" | "case_manager" | "clinical_manager";
export type Actor = { id: string; role: Role | string };
export type ClientOwnership = { assignedToId: string | null };

export const ROLE_LABELS: Record<Role, string> = {
  supervisor: "Supervisor",
  case_manager: "Case manager",
  clinical_manager: "Clinical manager",
};

export function roleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role;
}

/**
 * Supervisors see every client. Case managers see only clients assigned to them.
 * Clinical managers never open client records; they only see a shift's list (see canOpenShift).
 */
export function canAccessClient(actor: Actor, client: ClientOwnership): boolean {
  if (actor.role === "supervisor") return true;
  if (actor.role !== "case_manager") return false;
  return client.assignedToId !== null && client.assignedToId === actor.id;
}

/** Who may open a shift's "not responding" list with its code: clinical managers and supervisors. */
export function canOpenShift(actor: Actor): boolean {
  return actor.role === "clinical_manager" || actor.role === "supervisor";
}
