// Pure access rules, kept separate so they are easy to test and to review.

export type Actor = { id: string; role: "supervisor" | "case_manager" | string };
export type ClientOwnership = { assignedToId: string | null };

/** Supervisors see every client. Case managers see only clients assigned to them. */
export function canAccessClient(actor: Actor, client: ClientOwnership): boolean {
  if (actor.role === "supervisor") return true;
  return client.assignedToId !== null && client.assignedToId === actor.id;
}
