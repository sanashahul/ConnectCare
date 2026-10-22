import Link from "next/link";
import { and, eq, inArray, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, EmptyState } from "@/components/ui";
import { displayName, withProfile } from "@/lib/clients";
import { contactSummaries, daysNotReached } from "@/lib/contacts";
import { gettingStartedFor, showGettingStarted } from "@/lib/getting-started";
import { decryptPlanBody } from "@/lib/plan";
import { nextStep, OPEN_STATUSES } from "@/lib/plan-order";
import { buildTaskList } from "@/lib/task-list";
import { todoItemsFor } from "@/lib/todos";
import { cardGroup, ClientGroups, type ClientCard } from "./client-cards";
import { MyTodos } from "./my-todos";
import { TaskList } from "./task-list";

/** Everything a case manager's Home shows about their own caseload. */
export async function loadHome(owner: { id: string }, today: string) {
  const rows = await db
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.assignedToId, owner.id), eq(schema.clients.status, "active")));
  const mine = rows.map(withProfile);
  const ids = mine.map((c) => c.id);
  const [todos, views, contacts, started, openSteps] = await Promise.all([
    todoItemsFor(owner),
    lastViewed(owner.id, ids),
    contactSummaries(ids),
    gettingStartedFor(mine),
    ids.length
      ? db
          .select({
            id: schema.planItems.id,
            clientId: schema.planItems.clientId,
            status: schema.planItems.status,
            dueDate: schema.planItems.dueDate,
            createdAt: schema.planItems.createdAt,
            position: schema.planItems.position,
            bodyEnc: schema.planItems.bodyEnc,
          })
          .from(schema.planItems)
          .where(and(inArray(schema.planItems.clientId, ids), inArray(schema.planItems.status, [...OPEN_STATUSES])))
      : Promise.resolve([]),
  ]);
  const steps = openSteps.map(({ bodyEnc, ...s }) => ({ ...s, title: decryptPlanBody(bodyEnc).title }));

  const cards: ClientCard[] = mine.map((c) => {
    const own = steps.filter((s) => s.clientId === c.id);
    const next = nextStep(own);
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
      next: next?.title,
      nextDue: next?.dueDate ?? undefined,
      open: own.length,
      overdue: todos.filter((t) => t.clientId === c.id && t.dueDate && t.dueDate < today).length,
    };
  });
  cards.sort((a, b) => (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") || a.name.localeCompare(b.name));

  const lines = buildTaskList({
    clients: cards.map((c) => ({ id: c.id, name: c.name, urgent: c.urgent, notReached: c.notReached, notMetYet: !c.lastMet && !!c.gettingStarted })),
    steps,
    todos,
    today,
  });
  return { cards, lines, ownTodos: todos.filter((t) => t.kind === "task"), attention: cards.filter((c) => cardGroup(c) === "attention").length };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;

/** The main column of Home: the Task list and the client groups. */
export function HomeMain({ data, today, readOnly = false, ownerName }: { data: HomeData; today: string; readOnly?: boolean; ownerName?: string }) {
  return (
    <>
      <Card title="Task list">
        <p className="-mt-1 mb-3 text-xs text-stone-500">
          {readOnly
            ? `The top of each client's Up next, in the order ${ownerName ?? "they"} arranged.`
            : "The top step for each client, from the order you set in their Up next. Overdue and urgent come first."}
        </p>
        <TaskList lines={data.lines} today={today} readOnly={readOnly} />
      </Card>
      <Card
        title={readOnly ? `Clients (${data.cards.length})` : `Your clients (${data.cards.length})`}
        actions={!readOnly && <Link href="/clients" className="text-sm text-brand-700 underline">List and search →</Link>}
      >
        {data.cards.length === 0 ? (
          <EmptyState>No clients yet. New guests appear here once a supervisor assigns them.</EmptyState>
        ) : (
          <ClientGroups cards={data.cards} today={today} readOnly={readOnly} />
        )}
      </Card>
    </>
  );
}

/** "My own to-dos": editable on your own Home, read-only for a supervisor. */
export function OwnTodos({ data, today, readOnly = false }: { data: HomeData; today: string; readOnly?: boolean }) {
  return (
    <Card title={readOnly ? "Their own to-dos" : "My own to-dos"}>
      <MyTodos items={data.ownTodos} clients={data.cards.map((c) => ({ id: c.id, name: c.name }))} today={today} readOnly={readOnly} />
    </Card>
  );
}

async function lastViewed(userId: string, clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, Date>();
  const rows = await db
    .select({ clientId: schema.auditLog.clientId, at: max(schema.auditLog.at) })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, userId), eq(schema.auditLog.action, "client.viewed"), inArray(schema.auditLog.clientId, clientIds)))
    .groupBy(schema.auditLog.clientId);
  return new Map(rows.filter((r) => r.clientId && r.at).map((r) => [r.clientId!, r.at!]));
}
