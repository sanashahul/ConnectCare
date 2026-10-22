import Link from "next/link";
import { Badge, formatDate } from "@/components/ui";

export type ClientCard = {
  id: string;
  name: string;
  pronouns?: string;
  urgent: boolean;
  /** Assigned to this case manager and not opened by them since. */
  isNew: boolean;
  lastMet?: string;
  lastPlace?: string;
  /** Days since anyone met them, once that reaches the not-reached threshold. */
  notReached: number | null;
  next?: string;
  nextDue?: string;
  open: number;
  overdue: number;
};

/** One card per client: who they are and the single next thing to do. */
export function ClientCards({ cards, today }: { cards: ClientCard[]; today: string }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <li key={c.id}>
          <Link
            href={`/clients/${c.id}`}
            className={`block h-full rounded-lg border bg-white p-4 shadow-sm transition hover:border-brand-600 hover:shadow ${
              c.urgent || c.overdue ? "border-red-200" : c.notReached !== null ? "border-amber-300" : "border-stone-200"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-stone-900">{c.name}</span>
              {c.pronouns && <span className="text-xs text-stone-500">({c.pronouns})</span>}
              {c.isNew && <Badge tone="blue">New</Badge>}
              {c.urgent && <Badge tone="red">Urgent</Badge>}
              {c.overdue > 0 && <Badge tone="red">{c.overdue} overdue</Badge>}
              {c.notReached !== null && <Badge tone="amber">Not reached {c.notReached}d</Badge>}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {c.lastMet ? `Last seen ${formatDate(c.lastMet)}${c.lastPlace ? ` · ${c.lastPlace}` : ""}` : "Not met yet"}
            </p>
            {c.next ? (
              <>
                <p className="mt-2 text-sm text-stone-800">
                  <span className="text-stone-500">Next: </span>
                  {c.next}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {c.nextDue && (c.nextDue < today ? <span className="font-semibold text-red-700">Was due {formatDate(c.nextDue)} · </span> : `Due ${formatDate(c.nextDue)} · `)}
                  {c.open} step{c.open === 1 ? "" : "s"} left
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-emerald-700">All caught up ✓</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
