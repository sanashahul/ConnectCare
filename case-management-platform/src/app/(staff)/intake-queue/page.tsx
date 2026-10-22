import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader } from "@/components/ui";
import { ClientLabel, NeedChips } from "@/components/client-row";
import { requireSupervisor } from "@/lib/auth";
import { listClientsForUser, SOURCE_LABELS } from "@/lib/clients";
import { caseManagers } from "@/lib/followups";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { assignClient } from "../clients/actions";

export default async function IntakeQueuePage() {
  const user = await requireSupervisor();
  const queue = await listClientsForUser(user, { statuses: ["new"] });
  const cms = await caseManagers();
  const active = await db.select({ a: schema.clients.assignedToId }).from(schema.clients).where(eq(schema.clients.status, "active"));
  const load = new Map<string, number>();
  for (const r of active) if (r.a) load.set(r.a, (load.get(r.a) ?? 0) + 1);

  return (
    <div>
      <PageHeader
        title="Intake queue"
        subtitle="New requests from the public form and from staff. Assign each guest to a case manager; their information moves with them."
      />
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
                    {[c.city, c.profile.ageRange, c.profile.language, c.profile.sleeping].filter(Boolean).join(" · ")}
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
                <form action={assignClient} className="flex items-end gap-2">
                  <input type="hidden" name="clientId" value={c.id} />
                  <label className="text-sm">
                    <span className="mb-1 block text-stone-700">Assign to</span>
                    <select name="assigneeId" required className="rounded-md border border-stone-300 px-2 py-2 text-sm">
                      <option value="">Choose case manager…</option>
                      {cms.map((cm) => (
                        <option key={cm.id} value={cm.id}>{cm.name} ({load.get(cm.id) ?? 0} active)</option>
                      ))}
                    </select>
                  </label>
                  <button className={buttonClass}>Assign</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
