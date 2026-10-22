import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { NeedChips } from "@/components/client-row";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { displayName, getClientForUser, languageLabel, matchingNeeds, SOURCE_LABELS } from "@/lib/clients";
import { decryptString } from "@/lib/crypto";
import { caseManagerOptions, todayIso } from "@/lib/followups";
import { AssignCaseManager } from "@/components/assign-case-manager";
import { CONTACT_TYPES, needLabel, NOTE_KINDS } from "@/lib/options";
import { contactSummaries, daysNotReached, type ContactSummary } from "@/lib/contacts";
import { GETTING_STARTED_STEPS, gettingStartedFor, showGettingStarted, type GettingStarted } from "@/lib/getting-started";
import { decryptPlanBody } from "@/lib/plan";
import { nextStep } from "@/lib/plan-order";
import { confirmNeeds, deleteClient, setClientStatus } from "../actions";
import { CarePlan, StepCard, type PlanStep } from "./care-plan";
import { AddPlanItemForm, NoteForm } from "./forms";

/** Log entries shown before "Earlier entries". */
const RECENT_NOTES = 5;

export default async function ClientPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ log?: string }>;
}) {
  const { id } = await params;
  const logOpen = (await searchParams).log === "1";
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  await audit({ userId: user.id, action: "client.viewed", clientId: id });

  const supervisor = user.role === "supervisor";
  const p = client.profile;
  const today = todayIso();
  const [noteRows, planRows, assignee, resourceRows, contacts, started] = await Promise.all([
    db
      .select({ note: schema.notes, author: schema.users.name })
      .from(schema.notes)
      .innerJoin(schema.users, eq(schema.notes.authorId, schema.users.id))
      .where(eq(schema.notes.clientId, id))
      .orderBy(desc(schema.notes.contactDate), desc(schema.notes.createdAt)),
    db.select().from(schema.planItems).where(eq(schema.planItems.clientId, id)).orderBy(asc(schema.planItems.createdAt)),
    client.assignedToId ? db.query.users.findFirst({ where: eq(schema.users.id, client.assignedToId) }) : null,
    db.select({ id: schema.resources.id, data: schema.resources.data }).from(schema.resources).where(eq(schema.resources.active, true)),
    contactSummaries([id]),
    gettingStartedFor([client]),
  ]);
  const resourceName = new Map(resourceRows.map((r) => [r.id, (r.data as { name: string }).name]));
  const steps: PlanStep[] = planRows.map((r) => ({ ...r, body: decryptPlanBody(r.bodyEnc) }));
  const unverified = steps.filter((i) => !i.verified).length;
  const cms = supervisor ? await caseManagerOptions() : [];
  const contact = contacts.get(id)!;
  const notReached = client.status === "active" ? daysNotReached(client, contact, today) : null;
  const gs = started.get(id);
  const next = nextStep(steps);
  const logHref = `/clients/${id}?log=1#log`;

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: supervisor ? "/clients" : "/dashboard", label: supervisor ? "Clients" : "Home" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {displayName(p)}
            {p.pronouns && <span className="text-base font-normal text-stone-600">({p.pronouns})</span>}
            <span className="font-mono text-base font-normal text-stone-400">{client.clientCode}</span>
            {client.urgent && <Badge tone="red">Urgent</Badge>}
            {client.status === "new" && <Badge tone="amber">Unassigned</Badge>}
            {client.status === "closed" && <Badge>Closed</Badge>}
            {notReached !== null && <Badge tone="amber">Not reached in {notReached} days</Badge>}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{[client.city, client.county && `${client.county} County`, assignee && `Case manager: ${assignee.name}`].filter(Boolean).join(" · ")}</span>
            <Link href={`/messages/new?client=${id}`} className="text-brand-700 underline">
              {supervisor ? "Message case manager" : "Message supervisor"}
            </Link>
            <Link href={`/clients/${id}/edit`} className="text-brand-700 underline">Edit profile</Link>
          </span>
        }
        actions={
          <>
            <Link href={logHref} className={buttonClass}>Log contact</Link>
            <Link href={`/clients/${id}/plan`} className={secondaryButtonClass}>Find resources</Link>
            <Link href={`/clients/${id}/print`} className={secondaryButtonClass}>Print sheet</Link>
          </>
        }
      />

      <Card title="At a glance">
        {showGettingStarted(client, gs) && <GettingStartedList clientId={id} gs={gs!} needs={matchingNeeds(client)} logHref={logHref} />}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Next step</h3>
            {next ? (
              <StepCard step={next} resourceName={resourceName} today={today} />
            ) : (
              <p className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">
                {steps.length ? "All steps are finished. " : "No plan steps yet. "}
                <Link href={`/clients/${id}/plan`} className="text-brand-700 underline">Find resources</Link> or{" "}
                <a href="#add-step" className="text-brand-700 underline">add a step</a>.
              </p>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Last seen</h3>
            <LastSeen contact={contact} notReached={notReached} howToReach={p.howToReach} />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card
            title="Care plan"
            actions={unverified > 0 && <Badge tone="amber">{unverified} AI suggestion{unverified === 1 ? "" : "s"} to check</Badge>}
          >
            {steps.length === 0 ? (
              <EmptyState>
                No plan steps yet. <Link href={`/clients/${id}/plan`} className="text-brand-700 underline">Find resources</Link> or add a step below.
              </EmptyState>
            ) : (
              <CarePlan steps={steps} resourceName={resourceName} today={today} />
            )}
            <details id="add-step" className="mt-4 scroll-mt-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Add a plan step</summary>
              <div className="mt-3">
                <AddPlanItemForm
                  clientId={id}
                  needs={client.needs}
                  resources={resourceRows.map((r) => ({ id: r.id, name: (r.data as { name: string }).name })).sort((a, b) => a.name.localeCompare(b.name))}
                />
              </div>
            </details>
          </Card>

          <Card title="Contact log">
            <div id="log" className="scroll-mt-4" />
            <details open={logOpen || noteRows.length === 0} className="rounded-md border border-stone-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-brand-700">+ Log contact or update</summary>
              <div className="p-2 pt-0">
                <NoteForm clientId={id} needs={client.needs} lastPlace={contact.lastPlace} />
              </div>
            </details>
            {noteRows.length === 0 ? (
              <div className="mt-4"><EmptyState>No contacts logged yet.</EmptyState></div>
            ) : (
              <>
                <NoteList rows={noteRows.slice(0, RECENT_NOTES)} />
                {noteRows.length > RECENT_NOTES && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-sm text-stone-600">Earlier entries ({noteRows.length - RECENT_NOTES})</summary>
                    <NoteList rows={noteRows.slice(RECENT_NOTES)} />
                  </details>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {supervisor && (
            <Card title="Case manager">
              <AssignCaseManager clientId={id} current={client.assignedToId} caseManagers={cms} variant="client" />
            </Card>
          )}
          <Card title="Profile">
            <NeedChips needs={matchingNeeds(client)} max={20} />
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Best place to reach" value={p.howToReach} />
              <Row label="Phone" value={p.phone && `${p.phone}${p.okToLeaveMessage === false ? " (no messages)" : ""}`} />
              <Row label="Language" value={languageLabel(p)} />
              <Row label={client.urgent ? "Needs help today" : "Most urgent need"} value={p.urgentDetails || (client.urgent ? "Yes" : undefined)} />
            </dl>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-brand-700">All details</summary>
              <dl className="mt-2 space-y-2">
                <Row label="Client ID" value={client.clientCode} />
                <Row label="Email" value={p.email} />
                <Row label="Age" value={p.ageRange} />
                <Row label="Pronouns" value={p.pronouns} />
                <Row
                  label="Form language"
                  value={p.formLanguage && `Filled out in ${p.formLanguage}. Written answers are in ${p.formLanguage}; choices were converted to English.`}
                />
                <Row label="LGBTQ+ care" value={p.lgbtqCare ? "Would like LGBTQ+ affirming care" : undefined} />
                <Row label="Disability" value={p.disability} />
                <Row label="Accommodations" value={p.accessNeeds} />
                <Row label="Insurance" value={p.insurance} />
                <Row label="Staying" value={p.sleeping} />
                <Row
                  label="Other"
                  value={[p.hasVehicle && "Has vehicle", p.hasPets && "Has pet", p.hasChildren && "Has children"].filter(Boolean).join(", ")}
                />
                <Row label="Outreach site" value={p.outreachSite} />
                <Row label="Additional information" value={p.otherInfo} />
                <Row label="Source" value={`${SOURCE_LABELS[client.source]}${p.filledOutBy === "helper" ? " (filled by a helper)" : ""}`} />
                {p.consentAt && <Row label="Consent" value={`Agreed ${formatDate(p.consentAt)}`} />}
              </dl>
            </details>
          </Card>

          <Card title="Case">
            {client.status !== "new" && (
              <form action={setClientStatus}>
                <input type="hidden" name="clientId" value={id} />
                <input type="hidden" name="status" value={client.status === "closed" ? "active" : "closed"} />
                <button className={secondaryButtonClass}>{client.status === "closed" ? "Reopen case" : "Close case"}</button>
              </form>
            )}
            {supervisor && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-red-700">Delete all data for this client</summary>
                <form action={deleteClient} className="mt-2 space-y-2">
                  <p className="text-stone-600">Use when a client asks for their information to be deleted. This removes the profile, notes, and plan permanently. Type DELETE to confirm.</p>
                  <input type="hidden" name="clientId" value={id} />
                  <input name="confirm" className="w-full rounded-md border border-stone-300 px-2 py-1" autoComplete="off" />
                  <button className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Delete permanently</button>
                </form>
              </details>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** "Getting started" for a newly assigned client: four steps, each with the button that does it. */
function GettingStartedList({ clientId, gs, needs, logHref }: { clientId: string; gs: GettingStarted; needs: string[]; logHref: string }) {
  return (
    <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3">
      <p className="text-sm font-semibold text-sky-950">Getting started: {gs.count} of {GETTING_STARTED_STEPS.length} done</p>
      <ol className="mt-2 space-y-2 text-sm">
        {GETTING_STARTED_STEPS.map((s, i) => {
          const done = gs.done[s.key];
          const isNext = gs.next === s.key;
          return (
            <li key={s.key} className={`flex flex-wrap items-center gap-2 ${done ? "text-stone-500" : "text-stone-900"}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-600 text-white" : isNext ? "bg-sky-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-300"}`}
                aria-hidden
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={done ? "line-through" : isNext ? "font-semibold" : ""}>{s.label}</span>
              {!done && s.key === "met" && <Link href={logHref} className={smallButtonClass}>Log contact</Link>}
              {!done && s.key === "needs" && (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-stone-600">{needs.map(needLabel).join(", ") || "No needs listed yet"}</span>
                  <form action={confirmNeeds}>
                    <input type="hidden" name="clientId" value={clientId} />
                    <button className={smallButtonClass}>These are right ✓</button>
                  </form>
                  <Link href={`/clients/${clientId}/edit`} className="text-xs text-brand-700 underline">Change needs</Link>
                </span>
              )}
              {!done && s.key === "plan" && (
                <span className="flex gap-2">
                  <Link href={`/clients/${clientId}/plan`} className={smallButtonClass}>Find resources</Link>
                  <a href="#add-step" className={smallButtonClass}>Add a step</a>
                </span>
              )}
              {!done && s.key === "printed" && <Link href={`/clients/${clientId}/print`} className={smallButtonClass}>Print sheet</Link>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type NoteRow = { note: typeof schema.notes.$inferSelect; author: string };

function NoteList({ rows }: { rows: NoteRow[] }) {
  return (
    <ul className="mt-3 divide-y divide-stone-100">
      {rows.map(({ note, author }) => (
        <li key={note.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{formatDate(note.contactDate)}</span>
            <Badge tone={KIND_TONE[note.kind]}>{NOTE_KINDS.find((k) => k.key === note.kind)?.short}</Badge>
            {note.kind !== "update" && <span className="text-stone-500">{CONTACT_TYPES.find((c) => c.key === note.contactType)?.label}</span>}
            <span className="text-stone-500">by {author}</span>
            {note.needsAddressed.map((n) => <Badge key={n}>{needLabel(n)}</Badge>)}
            {note.followUpDate && <span className="ml-auto text-xs text-stone-600">Follow up {formatDate(note.followUpDate)}</span>}
          </div>
          {note.whereEnc && (
            <p className="mt-1 text-sm text-stone-600">
              {note.kind === "met" ? "Seen at" : "Looked at"}: {decryptString(note.whereEnc)}
            </p>
          )}
          <NoteBody text={decryptString(note.bodyEnc)} />
        </li>
      ))}
    </ul>
  );
}

function NoteBody({ text }: { text: string }) {
  return text ? <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{text}</p> : null;
}

const KIND_TONE = { met: "green", not_found: "amber", update: "gray" } as const;

function LastSeen({ contact, notReached, howToReach }: { contact: ContactSummary; notReached: number | null; howToReach?: string }) {
  return (
    <div className={`rounded-md px-3 py-2 text-sm ${notReached !== null ? "bg-amber-50 text-amber-950" : "bg-stone-50 text-stone-800"}`}>
      {contact.lastMet ? (
        <p>
          <span className="font-semibold">Last seen {formatDate(contact.lastMet)}</span>
          {contact.lastPlace && <> at {contact.lastPlace}</>}
          {contact.missesSinceMet > 0 && (
            <span className="text-amber-800"> · couldn&apos;t find {contact.missesSinceMet} time{contact.missesSinceMet === 1 ? "" : "s"} since</span>
          )}
        </p>
      ) : (
        <p>
          <span className="font-semibold">Not met yet.</span>
          {contact.missesSinceMet > 0 && <> Couldn&apos;t find {contact.missesSinceMet} time{contact.missesSinceMet === 1 ? "" : "s"}.</>}
          {howToReach && <> Best place to reach (from intake): {howToReach}</>}
        </p>
      )}
      {notReached !== null && (
        <p className="mt-1 text-amber-900">Nobody has met this guest in {notReached} days. Your supervisor sees this too.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null | false }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className="col-span-2 whitespace-pre-wrap text-stone-900">{value}</dd>
    </div>
  );
}
