import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ResourceSummary } from "@/components/resource-card";
import { Badge, Card, formatDate, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/resource-types";
import { getResource } from "@/lib/resources";
import { markVerified, resolveFlag, setResourceActive } from "../actions";
import { FlagForm } from "./flag-form";
import { AssignToClientForm } from "./assign-form";
import { displayName, listClientsForUser } from "@/lib/clients";
import { NEEDS } from "@/lib/options";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const r = await getResource(id);
  if (!r) notFound();
  const supervisor = user.role === "supervisor";
  const flags = supervisor
    ? await db
        .select({ flag: schema.resourceFlags, by: schema.users.name })
        .from(schema.resourceFlags)
        .innerJoin(schema.users, eq(schema.resourceFlags.reportedById, schema.users.id))
        .where(eq(schema.resourceFlags.resourceId, id))
        .orderBy(desc(schema.resourceFlags.createdAt))
    : [];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        back={{ href: "/resources", label: "Resources" }}
        title={r.name}
        subtitle={
          <span className="flex flex-wrap gap-1">
            {r.categories.map((c) => <Badge key={c} tone="brand">{categoryLabel(c)}</Badge>)}
            <Badge>{r.county}</Badge>
            {!r.active && <Badge tone="red">Archived</Badge>}
          </span>
        }
        actions={
          supervisor && (
            <>
              <Link href={`/resources/${id}/edit`} className={secondaryButtonClass}>Edit</Link>
              <form action={markVerified}>
                <input type="hidden" name="resourceId" value={id} />
                <button className={secondaryButtonClass}>Mark verified today</button>
              </form>
            </>
          )
        }
      />
      <Card><ResourceSummary r={r} /></Card>

      {r.conflicts.length > 0 && (
        <Card title="The guides disagree on this resource">
          <p className="mb-2 text-sm text-stone-600">Call to confirm before sharing. A supervisor can fix the entry and clear this warning.</p>
          <ul className="space-y-2 text-sm">
            {r.conflicts.map((c, i) => (
              <li key={i}>
                <p className="font-medium capitalize">{c.field}</p>
                <ul className="list-disc pl-5">{c.values.map((v, j) => <li key={j}>{v.value} <span className="text-stone-500">({v.source})</span></li>)}</ul>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={supervisor ? "Add to a client's plan" : "Add to one of your clients' plans"}>
        <AssignToClientForm
          resourceId={id}
          defaultNeed={NEEDS.find((n) => (n.resourceCategories as readonly string[]).some((c) => r.categories.includes(c)))?.key ?? NEEDS[0].key}
          clients={(await listClientsForUser(user, { statuses: ["new", "active"] }))
            .map((c) => ({ id: c.id, label: `${displayName(c.profile)} (${c.clientCode})` }))
            .sort((a, b) => a.label.localeCompare(b.label))}
        />
      </Card>

      <Card title="Report a problem">
        <FlagForm resourceId={id} />
      </Card>

      {supervisor && (
        <Card title="Problem reports">
          {flags.length === 0 ? (
            <p className="text-sm text-stone-500">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {flags.map(({ flag, by }) => (
                <li key={flag.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p>{flag.message}</p>
                    <p className="text-xs text-stone-500">{by}, {formatDate(flag.createdAt)}</p>
                  </div>
                  {flag.resolved ? (
                    <Badge tone="green">Resolved</Badge>
                  ) : (
                    <form action={resolveFlag}>
                      <input type="hidden" name="flagId" value={flag.id} />
                      <button className={smallButtonClass}>Mark resolved</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form action={setResourceActive} className="mt-4">
            <input type="hidden" name="resourceId" value={id} />
            <input type="hidden" name="active" value={r.active ? "false" : "true"} />
            <button className="text-sm text-red-700 underline">{r.active ? "Archive (hide from directory)" : "Restore to directory"}</button>
          </form>
          <p className="mt-2 text-xs text-stone-500">From: {r.sources.join("; ")}</p>
        </Card>
      )}
    </div>
  );
}
