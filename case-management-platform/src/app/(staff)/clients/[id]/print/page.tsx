import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, secondaryButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getClientForUser, matchingNeeds } from "@/lib/clients";
import { needLabel, NEEDS } from "@/lib/options";
import { decryptPlanBody } from "@/lib/plan";
import { emergencyNumbers, matchResources } from "@/lib/resource-match";
import type { Resource } from "@/lib/resource-types";
import { getActiveResources } from "@/lib/resources";
import { PrintButton } from "./print-button";
import { PrintSheet, type PrintEntry } from "./print-sheet";

function resourceEntry(r: Resource): Omit<PrintEntry, "key" | "need" | "needLabel" | "defaultChecked"> {
  return {
    name: r.name,
    description: r.description,
    eligibility: r.eligibility ?? undefined,
    phones: r.phones,
    address: r.address ? `${r.address}${r.city && !r.address.includes(r.city) ? `, ${r.city}` : ""}` : undefined,
    hours: r.hours ?? undefined,
    web: r.web ?? undefined,
  };
}

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
  const order = NEEDS.map((n) => n.key as string);

  let entries: PrintEntry[] = [];
  if (source === "plan") {
    // Every step in the plan; the case manager unticks what shouldn't be printed.
    const items = await db
      .select()
      .from(schema.planItems)
      .where(eq(schema.planItems.clientId, id))
      .orderBy(asc(schema.planItems.createdAt));
    for (const item of items) {
      const body = decryptPlanBody(item.bodyEnc);
      const base = {
        key: item.id,
        need: item.need,
        needLabel: needLabel(item.need),
        defaultChecked: item.status !== "unable" && item.verified,
        note: item.status === "unable" ? "Marked “could not connect”, so unticked." : undefined,
      };
      const r = item.resourceId ? byId.get(item.resourceId) : undefined;
      const defaultTitle = (name: string) => body.title === `Connect with ${name}` || body.title === `Check and connect with ${name}`;
      if (r) {
        entries.push({ ...base, ...resourceEntry(r), step: defaultTitle(r.name) ? undefined : body.title });
      } else if (body.custom) {
        const c = body.custom;
        entries.push({
          ...base,
          name: c.name,
          description: c.notes,
          phones: c.phone ? [{ label: "Main", number: c.phone }] : [],
          address: c.address,
          hours: c.hours,
          step: defaultTitle(c.name) ? undefined : body.title,
        });
      } else if (body.suggestion) {
        const sg = body.suggestion;
        entries.push({
          ...base,
          name: sg.name,
          description: sg.offers,
          phones: [],
          contact: sg.contact || undefined,
          address: sg.location || undefined,
          step: defaultTitle(sg.name) ? undefined : body.title,
          disabled: !item.verified,
          note: item.verified ? base.note : "AI suggestion not checked yet. Mark it checked on the client page to print it.",
        });
      } else {
        entries.push({ ...base, step: body.title, phones: [] });
      }
    }
  } else {
    const p = client.profile;
    const matches = matchResources(resources, {
      city: client.city, county: client.county, needs: matchingNeeds(client), language: p.language,
      insurance: p.insurance, ageRange: p.ageRange, urgent: client.urgent, hasChildren: p.hasChildren,
    }, 3);
    const seen = new Set<string>();
    entries = matches.flatMap((m) =>
      m.matches
        .filter((x) => !seen.has(x.resource.id) && seen.add(x.resource.id))
        .map((x) => ({ key: `${m.need}:${x.resource.id}`, need: m.need, needLabel: needLabel(m.need), defaultChecked: true, ...resourceEntry(x.resource) })),
    );
  }
  entries.sort((a, b) => order.indexOf(a.need) - order.indexOf(b.need));
  const hotlines = emergencyNumbers(resources, client.county);
  await audit({ userId: user.id, action: "client.printed", clientId: id, detail: { source, showName } });

  const q = (o: Record<string, string>) => `?${new URLSearchParams({ source, ...(showName ? { name: "1" } : {}), ...o })}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <Link href={`/clients/${id}`} className={secondaryButtonClass}>← Back</Link>
        <span className="text-stone-600">Include:</span>
        <Link href={q({ source: "plan" })} className={source === "plan" ? "font-semibold underline" : "underline"}>Steps in the care plan</Link>
        <Link href={q({ source: "matches" })} className={source === "matches" ? "font-semibold underline" : "underline"}>Top directory matches for each need</Link>
        <span className="mx-2 text-stone-300">|</span>
        <Link href={`?${new URLSearchParams({ source, ...(showName ? {} : { name: "1" }) })}`} className="underline">
          {showName ? "Remove first name" : "Add first name"}
        </Link>
        <span className="ml-auto"><PrintButton /></span>
        <p className="w-full text-xs text-stone-500">The printout has no last name, contact details, or notes, in case it is lost.</p>
      </div>

      <PrintSheet
        title={`Resources for you${showName ? `, ${client.profile.firstName}` : ""}`}
        prepared={`Prepared ${formatDate(new Date())} by your case manager, ${user.name.split(" ")[0]}. Hours change, so call before you go.`}
        clientCode={client.clientCode}
        hotlines={hotlines.map((h) => ({ number: h.phones[0]?.number ?? "", label: `${h.name}${h.hours ? ` (${h.hours})` : ""}` }))}
        entries={entries}
      />
    </div>
  );
}
