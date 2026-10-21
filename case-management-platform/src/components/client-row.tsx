import Link from "next/link";
import type { ClientWithProfile } from "@/lib/clients";
import { needLabel } from "@/lib/options";
import { Badge, formatDate } from "./ui";

export function NeedChips({ needs, max = 4 }: { needs: string[]; max?: number }) {
  return (
    <span className="flex flex-wrap gap-1">
      {needs.slice(0, max).map((n) => <Badge key={n} tone="brand">{needLabel(n)}</Badge>)}
      {needs.length > max && <Badge>+{needs.length - max}</Badge>}
    </span>
  );
}

/** Lists and dashboards identify clients by ID, not name. */
export function ClientCode({ code, className = "" }: { code: string; className?: string }) {
  return <span className={`font-mono font-semibold tracking-wide text-stone-900 ${className}`}>{code}</span>;
}

export function ClientRow({ client, followUp, assignee, today }: {
  client: ClientWithProfile;
  followUp?: string;
  assignee?: string;
  today: string;
}) {
  const overdue = followUp && followUp < today;
  return (
    <li>
      <Link href={`/clients/${client.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 hover:bg-stone-50">
        <ClientCode code={client.clientCode} className="min-w-28" />
        {client.urgent && <Badge tone="red">Urgent</Badge>}
        {client.status === "closed" && <Badge>Closed</Badge>}
        {client.status === "new" && <Badge tone="amber">Unassigned</Badge>}
        <span className="text-sm text-stone-600">{client.city ?? "Area unknown"}</span>
        <NeedChips needs={client.needs} />
        <span className="ml-auto flex items-center gap-3 text-sm">
          {assignee && <span className="text-stone-500">{assignee}</span>}
          {followUp && (
            <span className={overdue ? "font-semibold text-red-700" : "text-stone-600"}>
              {overdue ? "Overdue: " : "Follow up "}{formatDate(followUp)}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
