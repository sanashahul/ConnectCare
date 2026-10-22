import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ClientCode, NeedChips } from "@/components/client-row";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { displayName, getClientForUser, SOURCE_LABELS } from "@/lib/clients";
import { decryptString } from "@/lib/crypto";
import { caseManagers } from "@/lib/followups";
import { CONTACT_TYPES, needLabel, PLAN_STATUSES } from "@/lib/options";
import { decryptPlanBody } from "@/lib/plan";
import { assignClient, deleteClient, setClientStatus, updatePlanItem } from "../actions";
import { AddPlanItemForm, NoteForm } from "./forms";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  await audit({ userId: user.id, action: "client.viewed", clientId: id });

  const supervisor = user.role === "supervisor";
  const p = client.profile;
  const [noteRows, planRows, assignee, resourceRows] = await Promise.all([
    db
      .select({ note: schema.notes, author: schema.users.name })
      .from(schema.notes)
      .innerJoin(schema.users, eq(schema.notes.authorId, schema.users.id))
      .where(eq(schema.notes.clientId, id))
      .orderBy(desc(schema.notes.contactDate), desc(schema.notes.createdAt)),
    db.select().from(schema.planItems).where(eq(schema.planItems.clientId, id)).orderBy(asc(schema.planItems.createdAt)),
    client.assignedToId ? db.query.users.findFirst({ where: eq(schema.users.id, client.assignedToId) }) : null,
    db.select({ id: schema.resources.id, data: schema.resources.data }).from(schema.resources).where(eq(schema.resources.active, true)),
  ]);
  const resourceName = new Map(resourceRows.map((r) => [r.id, (r.data as { name: string }).name]));
  const plan = planRows.map((r) => ({ ...r, body: decryptPlanBody(r.bodyEnc) }));
  const unverified = plan.filter((i) => !i.verified).length;
  const cms = supervisor ? await caseManagers() : [];

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ClientCode code={client.clientCode} />
            {client.urgent && <Badge tone="red">Urgent</Badge>}
            {client.status === "new" && <Badge tone="amber">Unassigned</Badge>}
            {client.status === "closed" && <Badge>Closed</Badge>}
          </span>
        }
        subtitle={[client.city, client.county && `${client.county} County`, assignee && `Case manager: ${assignee.name}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/clients/${id}/plan`} className={buttonClass}>Find resources & plan</Link>
            <Link href={`/clients/${id}/print`} className={secondaryButtonClass}>Print resource sheet</Link>
            <Link href={`/clients/${id}/edit`} className={secondaryButtonClass}>Edit</Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card title="Profile">
            <NeedChips needs={client.needs} max={20} />
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={displayName(p)} />
              <Row label="Phone" value={p.phone && `${p.phone}${p.okToLeaveMessage === false ? " (no messages)" : ""}`} />
              <Row label="Email" value={p.email} />
              <Row label="Best place to reach" value={p.howToReach} />
              <Row label="Age" value={p.ageRange} />
              <Row label="Language" value={p.language} />
              <Row label="Insurance" value={p.insurance} />
              <Row label="Staying" value={p.sleeping} />
              <Row
                label="Other"
                value={[p.hasVehicle && "Has vehicle", p.hasPets && "Has pet", p.hasChildren && "Has children"].filter(Boolean).join(", ")}
              />
              <Row label="Outreach site" value={p.outreachSite} />
              <Row label={client.urgent ? "Needs help today" : "Most urgent need"} value={p.urgentDetails || (client.urgent ? "Yes" : undefined)} />
              <Row label="Notes from intake" value={p.otherInfo} />
              <Row label="Source" value={`${SOURCE_LABELS[client.source]}${p.filledOutBy === "helper" ? " (filled by a helper)" : ""}`} />
              {p.consentAt && <Row label="Consent" value={`Agreed ${formatDate(p.consentAt)}`} />}
            </dl>
          </Card>

          <Card title="Case">
            {supervisor && (
              <form action={assignClient} className="mb-3 flex items-end gap-2">
                <input type="hidden" name="clientId" value={id} />
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-stone-700">Case manager</span>
                  <select name="assigneeId" defaultValue={client.assignedToId ?? ""} className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {cms.map((cm) => <option key={cm.id} value={cm.id}>{cm.name}</option>)}
                  </select>
                </label>
                <button className={secondaryButtonClass}>Save</button>
              </form>
            )}
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

        <div className="space-y-5 lg:col-span-2">
          <Card
            title="Care plan"
            actions={unverified > 0 && <Badge tone="amber">{unverified} AI suggestion{unverified === 1 ? "" : "s"} to check</Badge>}
          >
            {plan.length === 0 ? (
              <EmptyState>
                No plan steps yet. <Link href={`/clients/${id}/plan`} className="text-brand-700 underline">Find resources</Link> or add a step below.
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {plan.map((item) => (
                  <li key={item.id} className={`rounded-md border p-3 ${item.verified ? "border-stone-200" : "border-amber-300 bg-amber-50"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="brand">{needLabel(item.need)}</Badge>
                          {!item.verified && <Badge tone="amber">AI suggestion: needs checking</Badge>}
                          {item.aiSuggested && item.verified && <Badge tone="blue">From AI</Badge>}
                          {item.dueDate && <span className="text-xs text-stone-600">Due {formatDate(item.dueDate)}</span>}
                        </div>
                        <p className="mt-1 font-medium text-stone-900">{item.body.title}</p>
                        {item.resourceId && (
                          <Link href={`/resources/${item.resourceId}`} className="text-sm text-brand-700 underline">
                            {resourceName.get(item.resourceId) ?? "Resource"}
                          </Link>
                        )}
                        {item.body.suggestion && (
                          <div className="mt-1 text-sm text-stone-700">
                            <p><strong>{item.body.suggestion.name}</strong>: {item.body.suggestion.offers}</p>
                            <p>Contact: {item.body.suggestion.contact || "not found, look up before sharing"} · {item.body.suggestion.location}</p>
                            {item.body.suggestion.sourceUrl && (
                              <p>Source: <a className="underline" href={item.body.suggestion.sourceUrl} target="_blank" rel="noreferrer noopener">{item.body.suggestion.sourceUrl}</a></p>
                            )}
                          </div>
                        )}
                        {item.body.details && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{item.body.details}</p>}
                      </div>
                      <form action={updatePlanItem} className="flex items-center gap-1">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="intent" value="status" />
                        <select name="status" defaultValue={item.status} className="rounded border border-stone-300 px-1 py-1 text-xs">
                          {PLAN_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <button className={smallButtonClass}>Update</button>
                      </form>
                    </div>
                    {!item.verified && (
                      <form action={updatePlanItem} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="intent" value="verify" />
                        <input name="verifyNote" placeholder="How did you confirm? e.g. called, open Mon-Fri" className="min-w-60 flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-sm" />
                        <button className={smallButtonClass}>I checked this, it&apos;s correct</button>
                      </form>
                    )}
                    <form action={updatePlanItem} className="mt-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="intent" value="delete" />
                      <button className="text-xs text-stone-500 underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-4">
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
            <NoteForm clientId={id} needs={client.needs} />
            {noteRows.length === 0 ? (
              <div className="mt-4"><EmptyState>No contacts logged yet.</EmptyState></div>
            ) : (
              <ul className="mt-4 divide-y divide-stone-100">
                {noteRows.map(({ note, author }) => (
                  <li key={note.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{formatDate(note.contactDate)}</span>
                      <span className="text-stone-500">{CONTACT_TYPES.find((c) => c.key === note.contactType)?.label}</span>
                      <span className="text-stone-500">by {author}</span>
                      {note.needsAddressed.map((n) => <Badge key={n}>{needLabel(n)}</Badge>)}
                      {note.followUpDate && <span className="ml-auto text-xs text-stone-600">Follow up {formatDate(note.followUpDate)}</span>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{decryptString(note.bodyEnc)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
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
