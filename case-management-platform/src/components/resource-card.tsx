import Link from "next/link";
import type { Resource } from "@/lib/resource-types";
import { daysSince, STALE_AFTER_DAYS } from "@/lib/resources";
import { Badge, formatDate } from "./ui";

export function ResourceSummary({ r, compact = false }: { r: Resource; compact?: boolean }) {
  const age = daysSince(r.lastVerified);
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/resources/${r.id}`} className="font-semibold text-stone-900 hover:underline">{r.name}</Link>
        {r.walkIn && <Badge tone="green">Walk-in</Badge>}
        {r.cost === "free" && <Badge tone="green">Free</Badge>}
        {r.cost === "sliding_scale" && <Badge>Sliding scale</Badge>}
        {r.isHotline && <Badge tone="blue">Phone line</Badge>}
        {r.conflicts.length > 0 && <Badge tone="amber">Guides disagree: check</Badge>}
        {age !== null && age > STALE_AFTER_DAYS && <Badge tone="amber">Not verified in {age} days</Badge>}
      </div>
      {!compact && <p className="text-stone-700">{r.description}</p>}
      <p className="text-stone-700">
        {r.phones.map((p, i) => (
          <span key={i} className="mr-3 whitespace-nowrap">
            {p.label && p.label !== "Main" ? `${p.label}: ` : ""}
            <a className="text-brand-700 underline" href={`tel:${p.number.replace(/[^\d+]/g, "")}`}>{p.number}</a>
          </span>
        ))}
      </p>
      {r.address && <p className="text-stone-600">{r.address}{r.city && !r.address.includes(r.city) ? `, ${r.city}` : ""}</p>}
      {r.hours && <p className="text-stone-600">Hours: {r.hours}</p>}
      {r.eligibility && <p className="text-stone-600">Who: {r.eligibility}</p>}
      {r.languages.length > 0 && <p className="text-stone-600">Languages: {r.languages.join(", ")}</p>}
      {!compact && r.notes && <p className="text-amber-800">{r.notes}</p>}
      {!compact && r.lastVerified && <p className="text-xs text-stone-400">Last verified {formatDate(r.lastVerified)}</p>}
    </div>
  );
}
