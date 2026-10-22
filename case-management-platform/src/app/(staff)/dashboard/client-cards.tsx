import Link from "next/link";
import { Badge, formatDate } from "@/components/ui";
import { GETTING_STARTED_STEPS, type GettingStarted } from "@/lib/getting-started";

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
  /** Set while the Getting started checklist applies. */
  gettingStarted?: GettingStarted;
  next?: string;
  nextDue?: string;
  open: number;
  overdue: number;
};

export type CardGroup = "attention" | "new" | "on_track";

export function cardGroup(c: ClientCard): CardGroup {
  if (c.urgent || c.overdue > 0 || c.notReached !== null) return "attention";
  if (c.gettingStarted) return "new";
  return "on_track";
}

const GROUPS: { key: CardGroup; title: string; hint: string }[] = [
  { key: "attention", title: "Needs attention", hint: "Urgent, overdue, or not reached in 2 weeks." },
  { key: "new", title: "New to you", hint: "Follow the Getting started steps on each one." },
  { key: "on_track", title: "On track", hint: "" },
];

/** A client's cards, grouped so the ones that need you come first. */
export function ClientGroups({ cards, today }: { cards: ClientCard[]; today: string }) {
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => {
        const inGroup = cards.filter((c) => cardGroup(c) === g.key);
        if (inGroup.length === 0) return null;
        return (
          <section key={g.key} aria-label={g.title}>
            <h3 className="text-sm font-semibold text-stone-900">
              {g.title} <span className="font-normal text-stone-500">({inGroup.length})</span>
            </h3>
            {g.hint && <p className="mb-2 text-xs text-stone-500">{g.hint}</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
              {inGroup.map((c) => (
                <li key={c.id}>
                  <Card c={c} today={today} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Card({ c, today }: { c: ClientCard; today: string }) {
  const gs = c.gettingStarted;
  const nextLabel = gs?.next ? GETTING_STARTED_STEPS.find((s) => s.key === gs.next)?.label : undefined;
  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-white p-4 shadow-sm ${
        c.urgent || c.overdue ? "border-red-200" : c.notReached !== null ? "border-amber-300" : "border-stone-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/clients/${c.id}`} className="font-semibold text-stone-900 hover:underline">{c.name}</Link>
        {c.pronouns && <span className="text-xs text-stone-500">({c.pronouns})</span>}
        {c.isNew && <Badge tone="blue">New</Badge>}
        {c.urgent && <Badge tone="red">Urgent</Badge>}
        {c.overdue > 0 && <Badge tone="red">{c.overdue} overdue</Badge>}
        {c.notReached !== null && <Badge tone="amber">Not reached {c.notReached}d</Badge>}
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {c.lastMet ? `Last seen ${formatDate(c.lastMet)}${c.lastPlace ? ` · ${c.lastPlace}` : ""}` : "Not met yet"}
      </p>
      <div className="mt-2 flex-1 text-sm">
        {gs ? (
          <p className="text-sky-900">
            <span className="font-semibold">Getting started: {gs.count} of {GETTING_STARTED_STEPS.length}</span>
            {nextLabel && <span className="text-stone-700"> · Next: {nextLabel}</span>}
          </p>
        ) : c.next ? (
          <>
            <p className="text-stone-800"><span className="text-stone-500">Next: </span>{c.next}</p>
            <p className="mt-1 text-xs text-stone-500">
              {c.nextDue && (c.nextDue < today ? <span className="font-semibold text-red-700">Was due {formatDate(c.nextDue)} · </span> : `Due ${formatDate(c.nextDue)} · `)}
              {c.open} open step{c.open === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-emerald-700">No open steps. Add one when you next see them.</p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/clients/${c.id}`} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
          Open
        </Link>
        <Link href={`/clients/${c.id}?log=1#log`} className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          Log contact
        </Link>
      </div>
    </div>
  );
}
