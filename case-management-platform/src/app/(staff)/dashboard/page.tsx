import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ClientRow } from "@/components/client-row";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listClientsForUser, SOURCE_LABELS } from "@/lib/clients";
import { caseManagers, followUpsFor, todayIso } from "@/lib/followups";
import { needLabel } from "@/lib/options";

export default async function DashboardPage() {
  const user = await requireUser();
  const supervisor = user.role === "supervisor";
  const today = todayIso();
  const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const active = await listClientsForUser(user, { statuses: ["active", "new"] });
  const mine = supervisor ? active.filter((c) => c.assignedToId === user.id) : active;
  const followUps = await followUpsFor(active.map((c) => c.id));
  const due = active
    .filter((c) => c.assignedToId === user.id || !supervisor)
    .filter((c) => (followUps.get(c.id) ?? "9999") <= weekAhead || c.urgent)
    .sort((a, b) => (followUps.get(a.id) ?? "9999").localeCompare(followUps.get(b.id) ?? "9999"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={supervisor ? "Team overview" : `${mine.length} active client${mine.length === 1 ? "" : "s"}`}
        actions={<Link href="/clients/new" className={buttonClass}>+ New client</Link>}
      />
      {supervisor && <SupervisorPanels />}
      {supervisor && <NewRequests requests={active.filter((c) => c.status === "new")} />}
      <Card title={supervisor ? "Your own follow-ups this week" : "Follow-ups and urgent clients"}>
        {due.length === 0 ? (
          <EmptyState>Nothing due in the next 7 days.</EmptyState>
        ) : (
          <ul className="-mx-3 divide-y divide-stone-100">
            {due.map((c) => <ClientRow key={c.id} client={c} followUp={followUps.get(c.id)} today={today} />)}
          </ul>
        )}
      </Card>
      {!supervisor && (
        <div className="flex flex-wrap gap-2">
          <Link href="/clients" className={secondaryButtonClass}>All my clients</Link>
          <Link href="/resources" className={secondaryButtonClass}>Search resources</Link>
        </div>
      )}
    </div>
  );
}

function NewRequests({ requests }: { requests: Awaited<ReturnType<typeof listClientsForUser>> }) {
  const newest = [...requests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);
  return (
    <Card title="New requests" actions={<Link href="/intake-queue" className="text-sm text-brand-700 underline">Assign in intake queue →</Link>}>
      {newest.length === 0 ? (
        <EmptyState>No new requests. Google Form and website submissions appear here.</EmptyState>
      ) : (
        <ul className="-mx-3 divide-y divide-stone-100">
          {newest.map((c) => (
            <li key={c.id}>
              <Link href={`/clients/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 hover:bg-stone-50">
                <span className="font-mono font-semibold tracking-wide text-stone-900">{c.clientCode}</span>
                {c.urgent && <Badge tone="red">Needs help today</Badge>}
                <Badge tone={c.source === "google_form" ? "blue" : "gray"}>{SOURCE_LABELS[c.source]}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{c.profile.urgentDetails}</span>
                <span className="text-xs text-stone-500">{formatDate(c.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function SupervisorPanels() {
  const [newCount] = await db.select({ n: count() }).from(schema.clients).where(eq(schema.clients.status, "new"));
  const [flagCount] = await db.select({ n: count() }).from(schema.resourceFlags).where(eq(schema.resourceFlags.resolved, false));
  const cms = await caseManagers();
  const activeRows = await db
    .select({ assignedToId: schema.clients.assignedToId, needs: schema.clients.needs, urgent: schema.clients.urgent })
    .from(schema.clients)
    .where(eq(schema.clients.status, "active"));
  const load = new Map<string, number>();
  const needCounts = new Map<string, number>();
  for (const r of activeRows) {
    if (r.assignedToId) load.set(r.assignedToId, (load.get(r.assignedToId) ?? 0) + 1);
    for (const n of r.needs) needCounts.set(n, (needCounts.get(n) ?? 0) + 1);
  }
  const unable = await db
    .select({ need: schema.planItems.need, n: count() })
    .from(schema.planItems)
    .where(eq(schema.planItems.status, "unable"))
    .groupBy(schema.planItems.need);
  const topNeeds = [...needCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Intake queue">
        <p className="text-3xl font-semibold text-stone-900">{newCount.n}</p>
        <p className="mb-3 text-sm text-stone-600">waiting to be assigned</p>
        <Link href="/intake-queue" className={buttonClass}>Assign guests</Link>
      </Card>
      <Card title="Caseloads">
        {cms.length === 0 ? (
          <p className="text-sm text-stone-600">No case managers yet. <Link className="underline" href="/team">Add your team</Link>.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {cms.map((cm) => (
              <li key={cm.id} className="flex justify-between">
                <Link className="hover:underline" href={`/clients?cm=${cm.id}`}>{cm.name}</Link>
                <span className="font-medium">{load.get(cm.id) ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Needs across active clients">
        {topNeeds.length === 0 ? (
          <p className="text-sm text-stone-600">No active clients yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {topNeeds.map(([n, c]) => (
              <li key={n} className="flex justify-between"><span>{needLabel(n)}</span><span className="font-medium">{c}</span></li>
            ))}
          </ul>
        )}
        {unable.length > 0 && (
          <p className="mt-3 text-xs text-stone-600">
            Could not connect: {unable.map((u) => `${needLabel(u.need)} (${u.n})`).join(", ")}
          </p>
        )}
        {flagCount.n > 0 && (
          <p className="mt-3 text-sm"><Link className="text-amber-800 underline" href="/resources?flags=1">{flagCount.n} resource problem report{flagCount.n === 1 ? "" : "s"} to review</Link></p>
        )}
      </Card>
    </div>
  );
}
