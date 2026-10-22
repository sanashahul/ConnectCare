import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { Badge, Card, PageHeader, smallButtonClass } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { teamAction } from "./actions";
import { NewUserForm, ResetPasswordButton } from "./forms";

export default async function TeamPage() {
  const me = await requireSupervisor();
  const users = await db.select().from(schema.users).orderBy(asc(schema.users.name));
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
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-500">
          Deactivating keeps their notes and hands nothing over automatically: reassign their clients from the client list (filter by case manager).
        </p>
      </Card>
    </div>
  );
}
