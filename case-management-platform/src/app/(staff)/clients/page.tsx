import Link from "next/link";
import { ClientRow } from "@/components/client-row";
import { buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayName, listClientsForUser } from "@/lib/clients";
import { caseManagers, followUpsFor, todayIso } from "@/lib/followups";
import { NEEDS } from "@/lib/options";

type Search = { q?: string; status?: string; cm?: string; need?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const supervisor = user.role === "supervisor";
  const status = sp.status === "closed" ? "closed" : sp.status === "all" ? "all" : "open";
  const clients = await listClientsForUser(user, {
    statuses: status === "open" ? ["new", "active"] : status === "closed" ? ["closed"] : undefined,
    assignedToId: supervisor && sp.cm ? sp.cm : undefined,
  });
  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = clients.filter(
    (c) => (!q || displayName(c.profile).toLowerCase().includes(q)) && (!sp.need || c.needs.includes(sp.need)),
  );
  const followUps = await followUpsFor(filtered.map((c) => c.id));
  const cms = supervisor ? await caseManagers() : [];
  const cmName = new Map(cms.map((c) => [c.id, c.name]));
  const today = todayIso();

  return (
    <div>
      <PageHeader
        title={supervisor ? "All clients" : "My clients"}
        actions={<Link href="/clients/new" className={buttonClass}>+ New client</Link>}
      />
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search by name" className={`${inputClass} max-w-xs`} />
          <select name="status" defaultValue={status} className={`${inputClass} w-auto`}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <select name="need" defaultValue={sp.need ?? ""} className={`${inputClass} w-auto`}>
            <option value="">Any need</option>
            {NEEDS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
          {supervisor && (
            <select name="cm" defaultValue={sp.cm ?? ""} className={`${inputClass} w-auto`}>
              <option value="">Any case manager</option>
              {cms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className={secondaryButtonClass}>Filter</button>
        </form>
        {filtered.length === 0 ? (
          <EmptyState>No clients match.</EmptyState>
        ) : (
          <ul className="-mx-3 divide-y divide-stone-100">
            {filtered.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                followUp={followUps.get(c.id)}
                assignee={supervisor ? (c.assignedToId ? cmName.get(c.assignedToId) ?? "Supervisor" : undefined) : undefined}
                today={today}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
