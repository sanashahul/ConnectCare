import Link from "next/link";
import { and, count, eq, inArray, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { ClientLabel } from "@/components/client-row";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayName, listClientsForUser, SOURCE_LABELS } from "@/lib/clients";
import { caseManagers, todayIso } from "@/lib/followups";
import { listThreads } from "@/lib/messages";
import { todoItemsFor, type TodoItem } from "@/lib/todos";
import { ClientCards, type ClientCard } from "./client-cards";
import { TodayList } from "./today";
import { needLabel } from "@/lib/options";

export default async function DashboardPage() {
  const user = await requireUser();
  const supervisor = user.role === "supervisor";
  const today = todayIso();

  const active = await listClientsForUser(user, { statuses: ["active", "new"] });
  const mine = active.filter((c) => c.assignedToId === user.id && c.status === "active");
  const [todos, threads, views] = await Promise.all([
    todoItemsFor(user),
    listThreads(user, { resolved: false, limit: 5 }),
    lastViewed(user.id, mine.map((c) => c.id)),
  ]);

  // Today: overdue first, then due today, then other urgent items. Kept short on purpose.
  const rank = (i: TodoItem) => (i.dueDate && i.dueDate < today ? 0 : i.dueDate === today ? 1 : 2);
  const todayAll = todos
    .filter((i) => (i.dueDate && i.dueDate <= today) || i.priority === "urgent")
    .sort((a, b) => rank(a) - rank(b));
  const TODAY_MAX = 5;

  // One card per client, with their first item in the case manager's own priority order.
  const cards: ClientCard[] = mine.map((c) => {
    const items = todos.filter((t) => t.clientId === c.id);
    const next = items[0];
    const seen = views.get(c.id);
    return {
      id: c.id,
      name: displayName(c.profile),
      pronouns: c.profile.pronouns,
      urgent: c.urgent,
      isNew: !!c.assignedAt && (!seen || seen < c.assignedAt),
      next: next?.text,
      nextDue: next?.dueDate,
      open: items.length,
      overdue: items.filter((t) => t.dueDate && t.dueDate < today).length,
    };
  });
  cards.sort(
    (a, b) =>
      Number(b.urgent || b.overdue > 0) - Number(a.urgent || a.overdue > 0) ||
      Number(b.isNew) - Number(a.isNew) ||
      (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={supervisor ? "Team overview" : `${mine.length} active client${mine.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link href="/tasks" className={secondaryButtonClass}>All tasks ({todos.length})</Link>
            <Link href="/clients/new" className={buttonClass}>+ New client</Link>
          </>
        }
      />
      {supervisor && <SupervisorPanels />}
      {supervisor && <NewRequests requests={active.filter((c) => c.status === "new")} />}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Today${todayAll.length ? ` (${todayAll.length})` : ""}`}>
            <TodayList items={todayAll.slice(0, TODAY_MAX)} more={Math.max(0, todayAll.length - TODAY_MAX)} today={today} />
          </Card>
          {(!supervisor || cards.length > 0) && (
            <Card title={`My clients (${cards.length})`} actions={<Link href="/clients" className="text-sm text-brand-700 underline">List view →</Link>}>
              {cards.length === 0 ? (
                <EmptyState>No active clients yet. New guests appear here once a supervisor assigns them to you.</EmptyState>
              ) : (
                <ClientCards cards={cards} today={today} />
              )}
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <MessagesCard threads={threads} supervisor={supervisor} />
        </div>
      </div>
    </div>
  );
}

function MessagesCard({ threads, supervisor }: { threads: Awaited<ReturnType<typeof listThreads>>; supervisor: boolean }) {
  return (
    <Card
      title={supervisor ? "Messages from your team" : "Messages"}
      actions={<Link href="/messages" className="text-sm text-brand-700 underline">All →</Link>}
    >
      {threads.length === 0 ? (
        <p className="text-sm text-stone-600">No open conversations.</p>
      ) : (
        <ul className="-mx-3 divide-y divide-stone-100">
          {threads.map((t) => (
            <li key={t.thread.id}>
              <Link href={`/messages/${t.thread.id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
                {t.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" /> : <span className="w-2 shrink-0" />}
                <span className={`min-w-0 flex-1 truncate ${t.unread ? "font-semibold" : ""}`}>{t.subject}</span>
                {supervisor && <span className="shrink-0 text-xs text-stone-500">{t.caseManagerName.split(" ")[0]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/messages/new" className={`${secondaryButtonClass} mt-3 w-full`}>
        {supervisor ? "Message a case manager" : "Message a supervisor"}
      </Link>
    </Card>
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
                <ClientLabel client={c} />
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
              <li key={cm.id} className="flex items-center justify-between gap-2">
                <Link className="hover:underline" href={`/clients?cm=${cm.id}`} title="Their clients">{cm.name}</Link>
                <span className="flex items-center gap-3">
                  <Link className="text-xs text-brand-700 underline" href={`/team/${cm.id}`}>Action items</Link>
                  <span className="font-medium" title="Active clients">{load.get(cm.id) ?? 0}</span>
                </span>
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

/** When this user last opened each client, so newly assigned clients they haven't looked at yet stand out. */
async function lastViewed(userId: string, clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, Date>();
  const rows = await db
    .select({ clientId: schema.auditLog.clientId, at: max(schema.auditLog.at) })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, userId), eq(schema.auditLog.action, "client.viewed"), inArray(schema.auditLog.clientId, clientIds)))
    .groupBy(schema.auditLog.clientId);
  return new Map(rows.filter((r) => r.clientId && r.at).map((r) => [r.clientId!, r.at!]));
}
