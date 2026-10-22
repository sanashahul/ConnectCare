import { Badge, Card, EmptyState, formatDate, PageHeader } from "@/components/ui";
import { ClientLabel, NeedChips } from "@/components/client-row";
import { requireSupervisor } from "@/lib/auth";
import { AssignCaseManager } from "@/components/assign-case-manager";
import { displayName, getClientForUser, languageLabel, listClientsForUser, SOURCE_LABELS } from "@/lib/clients";
import { caseManagerOptions } from "@/lib/followups";
import Link from "next/link";

export default async function IntakeQueuePage({ searchParams }: { searchParams: Promise<{ assigned?: string }> }) {
  const user = await requireSupervisor();
  const { assigned } = await searchParams;
  const [queue, cms] = await Promise.all([listClientsForUser(user, { statuses: ["new"] }), caseManagerOptions()]);

  // Confirmation after an assignment: the guest has left the queue, so say where they went.
  const justAssigned = assigned && /^[0-9a-f-]{36}$/i.test(assigned) ? await getClientForUser(user, assigned) : null;
  const assignedTo = justAssigned?.assignedToId ? cms.find((cm) => cm.id === justAssigned.assignedToId) : undefined;

  return (
    <div>
      <PageHeader
        title="Intake queue"
        subtitle={`${queue.length} waiting. New requests from the public form and from staff. Assign each guest to a case manager; their information moves with them.`}
      />
      {justAssigned && assignedTo && (
        <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ {displayName(justAssigned.profile)} is now assigned to <strong>{assignedTo.name}</strong> and shows on their dashboard.{" "}
          <Link href={`/clients/${justAssigned.id}`} className="font-semibold underline">Open profile or change case manager</Link>
        </p>
      )}
      {queue.length === 0 ? (
        <EmptyState>No one is waiting. New form submissions will appear here.</EmptyState>
      ) : (
        <div className="space-y-3">
          {queue.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/clients/${c.id}`} className="hover:underline"><ClientLabel client={c} /></Link>
                    {c.urgent && <Badge tone="red">Urgent</Badge>}
                    <Badge tone={c.source === "google_form" ? "blue" : "gray"}>{SOURCE_LABELS[c.source]}</Badge>
                  </div>
                  <p className="text-sm text-stone-600">
                    {[c.city, c.profile.ageRange, languageLabel(c.profile), c.profile.sleeping].filter(Boolean).join(" · ")}
                  </p>
                  {c.profile.outreachSite && <p className="text-sm text-stone-600">Site: {c.profile.outreachSite}</p>}
                  {c.profile.urgentDetails && (
                    <p className={`text-sm ${c.urgent ? "text-red-800" : "text-stone-800"}`}>
                      {c.urgent ? "Needs help today: " : "Most urgent need: "}{c.profile.urgentDetails}
                    </p>
                  )}
                  {c.profile.howToReach && <p className="text-sm text-stone-600">Best place to reach: {c.profile.howToReach}</p>}
                  <NeedChips needs={c.needs} max={8} />
                  <p className="text-xs text-stone-500">Received {formatDate(c.createdAt)}</p>
                </div>
                <AssignCaseManager clientId={c.id} current={null} caseManagers={cms} variant="queue" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
