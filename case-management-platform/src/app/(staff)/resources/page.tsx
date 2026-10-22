import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ResourceSummary } from "@/components/resource-card";
import { buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { RESOURCE_CATEGORIES } from "@/lib/resource-types";
import { daysSince, getActiveResources, STALE_AFTER_DAYS } from "@/lib/resources";

type Search = { q?: string; category?: string; county?: string; walkin?: string; flags?: string; stale?: string };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const supervisor = user.role === "supervisor";
  const all = await getActiveResources();
  const openFlags = await db.select().from(schema.resourceFlags).where(eq(schema.resourceFlags.resolved, false));
  const flagged = new Set(openFlags.map((f) => f.resourceId));
  const q = (sp.q ?? "").trim().toLowerCase();

  const list = all.filter((r) => {
    if (sp.category && !r.categories.includes(sp.category)) return false;
    if (sp.county && r.county !== sp.county && r.county !== "Multi-county") return false;
    if (sp.walkin === "1" && !r.walkIn) return false;
    if (sp.flags === "1" && !flagged.has(r.id)) return false;
    if (sp.stale === "1" && !((daysSince(r.lastVerified) ?? 9999) > STALE_AFTER_DAYS || r.conflicts.length > 0)) return false;
    if (q) {
      const hay = [r.name, r.description, r.city, r.address, r.eligibility, r.notes, ...r.languages].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Resource directory"
        subtitle={`${all.length} vetted resources from your team's guides. Hours change, so call before sending someone.`}
        actions={<Link href="/resources/new" className={buttonClass}>+ Add resource</Link>}
      />
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search: dental, Spanish, walk-in…" className={`${inputClass} max-w-xs`} />
          <select name="category" defaultValue={sp.category ?? ""} className={`${inputClass} w-auto`}>
            <option value="">All categories</option>
            {RESOURCE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select name="county" defaultValue={sp.county ?? ""} className={`${inputClass} w-auto`}>
            <option value="">Both counties</option>
            <option value="Santa Clara">Santa Clara</option>
            <option value="San Mateo">San Mateo</option>
          </select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="walkin" value="1" defaultChecked={sp.walkin === "1"} /> Walk-in only</label>
          {supervisor && (
            <>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="flags" value="1" defaultChecked={sp.flags === "1"} /> Reported problems ({flagged.size})</label>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="stale" value="1" defaultChecked={sp.stale === "1"} /> Needs verifying</label>
            </>
          )}
          <button className={secondaryButtonClass}>Search</button>
        </form>
        {list.length === 0 ? (
          <EmptyState>No resources match. Try fewer filters.</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map((r) => (
              <li key={r.id} className="py-3">
                <ResourceSummary r={r} compact />
                {flagged.has(r.id) && <p className="mt-1 text-xs text-amber-800">A problem was reported. See details.</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
