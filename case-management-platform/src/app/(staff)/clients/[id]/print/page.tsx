import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, secondaryButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { needLabel, NEEDS } from "@/lib/options";
import { decryptPlanBody } from "@/lib/plan";
import { emergencyNumbers, matchResources } from "@/lib/resource-match";
import type { Resource } from "@/lib/resource-types";
import { getActiveResources } from "@/lib/resources";
import { PrintButton } from "./print-button";

type Entry =
  | { kind: "resource"; need: string; r: Resource }
  | { kind: "checked"; need: string; name: string; offers: string; contact: string; location: string };

export default async function PrintPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; source?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  const showName = sp.name === "1";
  const source = sp.source === "matches" ? "matches" : "plan";

  const resources = await getActiveResources();
  const byId = new Map(resources.map((r) => [r.id, r]));
  const items = await db
    .select()
    .from(schema.planItems)
    .where(and(eq(schema.planItems.clientId, id), ne(schema.planItems.status, "unable")));

  let entries: Entry[] = [];
  let unverifiedLeftOut = 0;
  if (source === "plan") {
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.verified) {
        unverifiedLeftOut++;
        continue;
      }
      const body = decryptPlanBody(item.bodyEnc);
      if (item.resourceId && byId.has(item.resourceId) && !seen.has(item.resourceId)) {
        seen.add(item.resourceId);
        entries.push({ kind: "resource", need: item.need, r: byId.get(item.resourceId)! });
      } else if (body.suggestion) {
        entries.push({ kind: "checked", need: item.need, ...body.suggestion });
      }
    }
  } else {
    const p = client.profile;
    const matches = matchResources(resources, {
      city: client.city, county: client.county, needs: client.needs, language: p.language,
      insurance: p.insurance, ageRange: p.ageRange, urgent: client.urgent, hasChildren: p.hasChildren,
    }, 3);
    const seen = new Set<string>();
    entries = matches.flatMap((m) =>
      m.matches
        .filter((x) => !seen.has(x.resource.id) && seen.add(x.resource.id))
        .map((x) => ({ kind: "resource" as const, need: m.need, r: x.resource })),
    );
  }
  const order = NEEDS.map((n) => n.key as string);
  const grouped = order
    .map((need) => ({ need, list: entries.filter((e) => e.need === need) }))
    .filter((g) => g.list.length > 0);
  const hotlines = emergencyNumbers(resources, client.county);
  await audit({ userId: user.id, action: "client.printed", clientId: id, detail: { source, showName } });

  const q = (o: Record<string, string>) => `?${new URLSearchParams({ source, ...(showName ? { name: "1" } : {}), ...o })}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <Link href={`/clients/${id}`} className={secondaryButtonClass}>← Back</Link>
        <span className="text-stone-600">Include:</span>
        <Link href={q({ source: "plan" })} className={source === "plan" ? "font-semibold underline" : "underline"}>Resources in the care plan</Link>
        <Link href={q({ source: "matches" })} className={source === "matches" ? "font-semibold underline" : "underline"}>Top directory matches for each need</Link>
        <span className="mx-2 text-stone-300">|</span>
        <Link href={`?${new URLSearchParams({ source, ...(showName ? {} : { name: "1" }) })}`} className="underline">
          {showName ? "Remove first name" : "Add first name"}
        </Link>
        <span className="ml-auto"><PrintButton /></span>
        {unverifiedLeftOut > 0 && (
          <p className="w-full text-amber-800">
            {unverifiedLeftOut} AI suggestion{unverifiedLeftOut === 1 ? " is" : "s are"} left off because no one has checked {unverifiedLeftOut === 1 ? "it" : "them"} yet.
          </p>
        )}
        <p className="w-full text-xs text-stone-500">The printout has no last name, contact details, or notes, in case it is lost.</p>
      </div>

      <article className="mx-auto max-w-[8.5in] bg-white p-8 text-[13px] leading-snug text-black shadow-sm print:p-0 print:shadow-none">
        <header className="mb-3 border-b border-black pb-2">
          <h1 className="text-xl font-bold">Resources for you{showName ? `, ${client.profile.firstName}` : ""}</h1>
          <p className="text-xs">Prepared {formatDate(new Date())} by your case manager, {user.name.split(" ")[0]}. Hours change, so call before you go.</p>
        </header>
        <section className="mb-3 grid grid-cols-2 gap-2 rounded border border-black p-2 sm:grid-cols-5">
          <div><p className="font-bold">911</p><p className="text-xs">Emergency</p></div>
          {hotlines.map((h) => (
            <div key={h.id}><p className="font-bold">{h.phones[0]?.number}</p><p className="text-xs">{h.name}{h.hours ? ` (${h.hours})` : ""}</p></div>
          ))}
        </section>
        {grouped.length === 0 ? (
          <p className="no-print text-stone-500">Nothing to print yet. Add resources to the care plan, or switch to &quot;Top directory matches&quot;.</p>
        ) : (
          grouped.map((g) => (
            <section key={g.need} className="mb-3 break-inside-avoid">
              <h2 className="mb-1 border-b border-stone-400 text-sm font-bold uppercase tracking-wide">{needLabel(g.need)}</h2>
              <ul className="space-y-2">
                {g.list.map((e, i) => (
                  <li key={i} className="grid grid-cols-5 gap-3 break-inside-avoid">
                    {e.kind === "resource" ? (
                      <>
                        <div className="col-span-3">
                          <p className="font-bold">{e.r.name}</p>
                          <p>{e.r.description}</p>
                          {e.r.eligibility && <p className="text-xs">Who: {e.r.eligibility}</p>}
                        </div>
                        <div className="col-span-2 text-xs">
                          {e.r.phones.map((p, j) => <p key={j}><strong>{p.label && p.label !== "Main" ? `${p.label}: ` : "Call: "}</strong>{p.number}</p>)}
                          {e.r.address && <p>{e.r.address}{e.r.city && !e.r.address.includes(e.r.city) ? `, ${e.r.city}` : ""}</p>}
                          {e.r.hours && <p>{e.r.hours}</p>}
                          {e.r.web && <p>{e.r.web}</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-3"><p className="font-bold">{e.name}</p><p>{e.offers}</p></div>
                        <div className="col-span-2 text-xs"><p>{e.contact}</p><p>{e.location}</p></div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <footer className="mt-4 border-t border-stone-400 pt-1 text-[10px]">
          Any service, 24 hours: call 211. Information checked by the outreach team; programs can change without notice.
        </footer>
      </article>
    </div>
  );
}
