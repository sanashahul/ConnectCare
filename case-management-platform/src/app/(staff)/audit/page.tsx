import Link from "next/link";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ user?: string; client?: string }> }) {
  await requireSupervisor();
  const sp = await searchParams;
  const conds: SQL[] = [];
  if (sp.user && /^[0-9a-f-]{36}$/i.test(sp.user)) conds.push(eq(schema.auditLog.userId, sp.user));
  if (sp.client && /^[0-9a-f-]{36}$/i.test(sp.client)) conds.push(eq(schema.auditLog.clientId, sp.client));
  const rows = await db
    .select({ log: schema.auditLog, name: schema.users.name })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.auditLog.at))
    .limit(300);
  const users = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users);

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every sign-in, record view, change, print, and AI request. Records contain no client details." />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <select name="user" defaultValue={sp.user ?? ""} className={`${inputClass} w-auto`}>
            <option value="">All staff</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {sp.client && <input type="hidden" name="client" value={sp.client} />}
          <button className={secondaryButtonClass}>Filter</button>
          {(sp.user || sp.client) && <Link href="/audit" className="self-center text-sm underline">Clear</Link>}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr><th className="py-2 pr-3">When</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th className="pr-3">Client</th><th>Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(({ log, name }) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap py-1.5 pr-3">{log.at.toLocaleString("en-US")}</td>
                  <td className="pr-3">{name ?? "Public / system"}</td>
                  <td className="pr-3 font-mono text-xs">{log.action}</td>
                  <td className="pr-3">{log.clientId && <Link className="text-brand-700 underline" href={`/audit?client=${log.clientId}`}>{log.clientId.slice(0, 8)}</Link>}</td>
                  <td className="font-mono text-xs text-stone-500">{log.detail ? JSON.stringify(log.detail) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
