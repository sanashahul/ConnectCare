import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceSummary } from "@/components/resource-card";
import { Badge, Card, EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { aiEnabled, describeAiPayload } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { displayName, getClientForUser } from "@/lib/clients";
import { needLabel } from "@/lib/options";
import { matchResources } from "@/lib/resource-match";
import { getActiveResources } from "@/lib/resources";
import { AddResourceToPlan } from "./add-buttons";
import { AiPanel } from "./ai-panel";

// The AI assistant (a server action on this page) can take up to a minute or two with web search.
export const maxDuration = 300;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  const p = client.profile;
  const resources = await getActiveResources();
  const matches = matchResources(resources, {
    city: client.city,
    county: client.county,
    needs: client.needs,
    language: p.language,
    insurance: p.insurance,
    ageRange: p.ageRange,
    urgent: client.urgent,
    hasChildren: p.hasChildren,
  });
  const payload = describeAiPayload({
    county: client.county,
    needs: client.needs,
    ageRange: p.ageRange ?? null,
    language: p.language ?? null,
    insurance: p.insurance ?? null,
    sleeping: p.sleeping ?? null,
    urgent: client.urgent,
    hasVehicle: !!p.hasVehicle,
    hasPets: !!p.hasPets,
    hasChildren: !!p.hasChildren,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: `/clients/${id}`, label: displayName(p) }}
        title="Find resources & plan"
        subtitle={`Matched to ${client.city ?? "unknown area"}${p.language ? `, ${p.language}` : ""}${p.insurance ? `, ${p.insurance}` : ""}. Edit the profile to change needs.`}
        actions={<Link href={`/clients/${id}/print`} className={secondaryButtonClass}>Print resource sheet</Link>}
      />
      {client.needs.length === 0 && (
        <EmptyState>This client has no needs selected. <Link href={`/clients/${id}/edit`} className="underline">Edit the profile</Link> to add some.</EmptyState>
      )}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {matches.map((m) => (
            <Card key={m.need} title={needLabel(m.need)} actions={m.gaps.length > 0 && <Badge tone="amber">Gap</Badge>}>
              {m.gaps.length > 0 && (
                <ul className="mb-3 list-disc pl-5 text-sm text-amber-900">{m.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
              )}
              {m.matches.length === 0 ? (
                <EmptyState>No directory matches. Try the AI assistant or search the directory.</EmptyState>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {m.matches.map(({ resource, reasons }) => (
                    <li key={resource.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <ResourceSummary r={resource} compact />
                        {reasons.length > 0 && <p className="mt-1 text-xs text-emerald-800">Why: {reasons.join(" · ")}</p>}
                      </div>
                      <AddResourceToPlan clientId={id} need={m.need} resourceId={resource.id} resourceName={resource.name} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
        <div className="lg:col-span-2">
          <AiPanel
            clientId={id}
            enabled={aiEnabled()}
            payload={payload}
            resourceNames={Object.fromEntries(resources.map((r) => [r.id, r.name]))}
          />
        </div>
      </div>
    </div>
  );
}
