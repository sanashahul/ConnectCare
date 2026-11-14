import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PrintEntry } from "@/app/(staff)/clients/[id]/print/print-sheet";
import type { ClientWithProfile } from "./clients";
import { matchingNeeds } from "./clients";
import { needLabel, NEEDS } from "./options";
import { decryptPlanBody } from "./plan";
import { emergencyNumbers, matchResources } from "./resource-match";
import type { Resource } from "./resource-types";
import { getActiveResources } from "./resources";

// Builds the client's one-page resource sheet. Shared by the case manager's Print sheet and the
// clinical manager's shift list, so both always show the same plan.

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

export async function printSheetData(client: ClientWithProfile, source: "plan" | "matches") {
  const id = client.id;
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
  const hotlines = emergencyNumbers(resources, client.county).map((h) => ({
    number: h.phones[0]?.number ?? "",
    label: `${h.name}${h.hours ? ` (${h.hours})` : ""}`,
  }));
  return { entries, hotlines };
}
