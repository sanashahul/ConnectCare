import Link from "next/link";
import { and, count, eq, inArray, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { ClientLabel } from "@/components/client-row";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayName, listClientsForUser, SOURCE_LABELS } from "@/lib/clients";
import { contactSummaries, daysNotReached } from "@/lib/contacts";
import { pickDoFirst } from "@/lib/do-first";
import { caseManagers, todayIso } from "@/lib/followups";
import { gettingStartedFor, showGettingStarted } from "@/lib/getting-started";
import { listThreads } from "@/lib/messages";
import { needLabel, NOT_REACHED_DAYS } from "@/lib/options";
import { decryptPlanBody } from "@/lib/plan";
import { nextStep, OPEN_STATUSES } from "@/lib/plan-order";
import { todoItemsFor } from "@/lib/todos";
import { cardGroup, ClientGroups, type ClientCard } from "./client-cards";
import { DoFirst } from "./do-first";
import { MyTodos } from "./my-todos";

/**
 * Home. Case managers see what to do first (at most one item per client), then their clients
 * grouped by what they need, then their own to-dos. Supervisors also see the team panels.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const supervisor = user.role === "supervisor";
  const today = todayIso();

  const active = await listClientsForUser(user, { statuses: ["active", "new"] });
  const mine = active.filter((c) => c.assignedToId === user.id && c.status === "active");
  const mineIds = mine.map((c) => c.id);
  const [todos, threads, views, contacts, started, openSteps] = await Promise.all([
    todoItemsFor(user),
    listThreads(user, { resolved: false, limit: 5 }),
    lastViewed(user.id, mineIds),
    contactSummaries(mineIds),
    gettingStartedFor(mine),
    mineIds.length
      ? db
          .select({
            clientId: schema.planItems.clientId,
            status: schema.planItems.status,
            dueDate: schema.planItems.dueDate,
            createdAt: schema.planItems.createdAt,
            bodyEnc: schema.planItems.bodyEnc,
          })
          .from(schema.planItems)
          .where(and(inArray(schema.planItems.clientId, mineIds), inArray(schema.planItems.status, [...OPEN_STATUSES])))
      : Promise.resolve([]),
  ]);

  const cards: ClientCard[] = mine.map((c) => {
    const steps = openSteps.filter((s) => s.clientId === c.id);
    const next = nextStep(steps);
    const seen = views.get(c.id);
    const contact = contacts.get(c.id);
    const gs = started.get(c.id);
    return {
      id: c.id,
      name: displayName(c.profile),
      pronouns: c.profile.pronouns,
      urgent: c.urgent,
      isNew: !!c.assignedAt && (!seen || seen < c.assignedAt),
      lastMet: contact?.lastMet,
      lastPlace: contact?.lastPlace,
      notReached: daysNotReached(c, contact, today),
      gettingStarted: showGettingStarted(c, gs) ? gs : undefined,
      next: next && decryptPlanBody(next.bodyEnc).title,
      nextDue: next?.dueDate ?? undefined,
      open: steps.length,
      overdue: todos.filter((t) => t.clientId === c.id && t.dueDate && t.dueDate < today).length,
    };
  });
  cards.sort((a, b) => (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") || a.name.localeCompare(b.name));

  const doFirst = pickDoFirst({
    todos,
    clients: cards.map((c) => ({ id: c.id, name: c.name, notReached: c.notReached, notMetYet: !c.lastMet && !!c.gettingStarted })),
    today,
  });
  const ownTodos = todos.filter((t) => t.kind === "task");
  const attention = cards.filter((c) => cardGroup(c) === "attention").length;
  const showMine = !supervisor || cards.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={
          supervisor
            ? "Team overview"
            : `${mine.length} client${mine.length === 1 ? "" : "s"}${attention ? ` · ${attention} need${attention === 1 ? "s" : ""} attention` : ""}`
        }
        actions={<Link href="/clients/new" className={buttonClass}>+ New client</Link>}
      />
      {supervisor && <SupervisorPanels />}
      {supervisor && <NotReached clients={active.filter((c) => c.status === "active")} today={today} />}
      {supervisor && <NewRequests requests={active.filter((c) => c.status === "new")} />}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {showMine && (
            <Card title="Do these first">
              <p className="-mt-1 mb-3 text-xs text-stone-500">The most pressing thing for each client, up to 5.</p>
              <DoFirst items={doFirst.items} more={doFirst.more} />
            </Card>
          )}
          {showMine && (
            <Card
              title={supervisor ? `Your own clients (${cards.length})` : `Your clients (${cards.length})`}
              actions={<Link href="/clients" className="text-sm text-brand-700 underline">List and search →</Link>}
            >
              {cards.length === 0 ? (
                <EmptyState>No clients yet. New guests appear here once a supervisor assigns them to you.</EmptyState>
              ) : (
                <ClientGroups cards={cards} today={today} />
              )}
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card title="My own to-dos" actions={<Link href="/tasks" className="text-sm text-brand-700 underline">This week →</Link>}>
            <MyTodos items={ownTodos} clients={cards.map((c) => ({ id: c.id, name: c.name }))} today={today} />
          </Card>
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

/** Supervisors: active guests nobody has met in NOT_REACHED_DAYS, longest first. */
async function NotReached({ clients, today }: { clients: Awaited<ReturnType<typeof listClientsForUser>>; today: string }) {
  const [contacts, cms] = await Promise.all([contactSummaries(clients.map((c) => c.id)), caseManagers()]);
  const cmName = new Map(cms.map((cm) => [cm.id, cm.name]));
  const rows = clients
    .map((c) => ({ c, contact: contacts.get(c.id), days: daysNotReached(c, contacts.get(c.id), today) }))
    .filter((r): r is typeof r & { days: number } => r.days !== null)
    .sort((a, b) => b.days - a.days);
  if (rows.length === 0) return null;
  return (
    <Card title={`Not reached in ${NOT_REACHED_DAYS}+ days (${rows.length})`}>
      <p className="mb-2 text-sm text-stone-600">Active guests nobody has met recently. Check in with their case manager.</p>
      <ul className="-mx-3 divide-y divide-stone-100">
        {rows.map(({ c, contact, days }) => (
          <li key={c.id}>
            <Link href={`/clients/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm hover:bg-stone-50">
              <span className="font-medium text-stone-900">{displayName(c.profile)}</span>
              <Badge tone="amber">{days} days</Badge>
              <span className="text-stone-600">{c.assignedToId ? cmName.get(c.assignedToId) : "Unassigned"}</span>
              <span className="min-w-0 flex-1 truncate text-stone-500">
                {contact?.lastMet ? `Last seen ${formatDate(contact.lastMet)}${contact.lastPlace ? ` at ${contact.lastPlace}` : ""}` : "Not met yet"}
                {contact?.missesSinceMet ? ` · couldn't find ×${contact.missesSinceMet}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
                  <Link className="text-xs text-brand-700 underline" href={`/team/${cm.id}`}>Their week</Link>
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
