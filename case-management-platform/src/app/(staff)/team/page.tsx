import Link from "next/link";
import { asc, count, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { Badge, Card, PageHeader, smallButtonClass } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { caseManagers } from "@/lib/followups";
import { removeMember, restoreMember, teamAction } from "./actions";
import { NewUserForm, ResetPasswordButton } from "./forms";

export default async function TeamPage() {
  const me = await requireSupervisor();
  const [all, loads, cms] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.name)),
    db
      .select({ id: schema.clients.assignedToId, n: count() })
      .from(schema.clients)
      .where(isNotNull(schema.clients.assignedToId))
      .groupBy(schema.clients.assignedToId),
    caseManagers(),
  ]);
  const clientCount = new Map(loads.map((r) => [r.id, r.n]));
  const users = all.filter((u) => !u.removedAt);
  const removed = all.filter((u) => u.removedAt);
  return (
    <div className="space-y-5">
      <PageHeader title="Team" subtitle="Only people with an account here can see client information. Deactivate accounts as soon as someone leaves." />
      <Card title="Add a team member"><NewUserForm /></Card>
      <Card title="Accounts">
        <ul className="divide-y divide-stone-100">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {u.name} <span className="text-sm font-normal text-stone-500">{u.email}</span>
                  {u.role === "case_manager" && (
                    <Link href={`/team/${u.id}`} className="ml-3 text-sm font-normal text-brand-700 underline">View their Home</Link>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge tone="brand">{u.role === "supervisor" ? "Supervisor" : "Case manager"}</Badge>
                  {!u.active && <Badge tone="red">Deactivated</Badge>}
                  {u.totpEnabled ? <Badge tone="green">2FA on</Badge> : <Badge tone="amber">2FA not set up</Badge>}
                  {u.lockedUntil && u.lockedUntil > new Date() && <Badge tone="red">Locked</Badge>}
                </div>
              </div>
              {u.id !== me.id && (
                <div className="flex flex-wrap items-start gap-2">
                  <ResetPasswordButton userId={u.id} />
                  {u.totpEnabled && (
                    <form action={teamAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="intent" value="reset2fa" />
                      <button className={smallButtonClass}>Reset 2FA</button>
                    </form>
                  )}
                  <form action={teamAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="intent" value={u.active ? "deactivate" : "activate"} />
                    <button className={smallButtonClass}>{u.active ? "Deactivate" : "Reactivate"}</button>
                  </form>
                  <RemoveMember
                    user={u}
                    clients={clientCount.get(u.id) ?? 0}
                    others={cms.filter((c) => c.id !== u.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-500">
          Deactivating keeps their notes and hands nothing over automatically: reassign their clients from the client list (filter by case manager).
          Removing someone signs them out for good, takes them off this list, and hands their clients to the person you pick. Their notes stay, with their name on them.
        </p>
        {removed.length > 0 && (
          <details className="mt-4 rounded-md border border-stone-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Removed from the team ({removed.length})</summary>
            <ul className="mt-2 divide-y divide-stone-100">
              {removed.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {u.name} <span className="text-stone-500">{u.email}</span>
                    <span className="ml-2 text-xs text-stone-500">removed {u.removedAt!.toLocaleDateString()}</span>
                  </span>
                  <form action={restoreMember}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className={smallButtonClass}>Bring back</button>
                  </form>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">Bringing someone back puts them on the team list as deactivated. Reactivate them and reset their password when they should sign in again.</p>
          </details>
        )}
      </Card>
    </div>
  );
}

function RemoveMember({ user, clients, others }: {
  user: { id: string; name: string };
  clients: number;
  others: { id: string; name: string }[];
}) {
  const first = user.name.split(" ")[0];
  return (
    <details className="group">
      <summary className={`${smallButtonClass} cursor-pointer list-none text-red-700`}>Remove…</summary>
      <form action={removeMember} className="mt-2 w-72 space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
        <input type="hidden" name="userId" value={user.id} />
        <p className="font-medium">Remove {user.name} from the team?</p>
        <p className="text-stone-600">
          {first} will be signed out and can no longer sign in. Their notes and messages stay on the record.
        </p>
        {clients > 0 ? (
          <label className="block">
            <span className="text-stone-700">Hand their {clients} client{clients === 1 ? "" : "s"} to</span>
            <select name="handTo" className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1">
              <option value="">Nobody yet (back to the intake queue)</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="handTo" value="" />
        )}
        <button className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800">Remove {first}</button>
      </form>
    </details>
  );
}
