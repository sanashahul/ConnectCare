import Link from "next/link";
import { db, schema } from "@/db";
import { PrintButton } from "@/components/print-button";
import { secondaryButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { needLabel } from "@/lib/options";
import { buildMonthlyReport, currentMonth, monthLabel, shiftMonth } from "@/lib/report";

export const dynamic = "force-dynamic";

const SOURCE_NAMES: Record<string, string> = { google_form: "the Google Form", public_form: "the website form", staff: "staff" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireSupervisor();
  const thisMonth = currentMonth();
  const asked = (await searchParams).month;
  const month = asked && /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) && asked <= thisMonth ? asked : thisMonth;

  // Only non-identifying columns are read; nothing here is decrypted.
  const [clients, notes, planItems] = await Promise.all([
    db
      .select({
        id: schema.clients.id,
        createdAt: schema.clients.createdAt,
        assignedAt: schema.clients.assignedAt,
        closedAt: schema.clients.closedAt,
        status: schema.clients.status,
        source: schema.clients.source,
        urgent: schema.clients.urgent,
        needs: schema.clients.needs,
      })
      .from(schema.clients),
    db.select({ clientId: schema.notes.clientId, kind: schema.notes.kind, contactDate: schema.notes.contactDate }).from(schema.notes),
    db.select({ status: schema.planItems.status, statusChangedAt: schema.planItems.statusChangedAt }).from(schema.planItems),
  ]);
  const r = buildMonthlyReport({ clients, notes, planItems }, month);
  await audit({ userId: user.id, action: "report.viewed", detail: { month } });

  const days = (n: number | null) => (n === null ? "—" : `${n.toFixed(1).replace(/\.0$/, "")} day${n === 1 ? "" : "s"}`);
  const hours = (n: number | null) =>
    n === null ? "—" : n < 1 ? "under 1 hour" : n < 48 ? `${Math.round(n)} hour${Math.round(n) === 1 ? "" : "s"}` : days(n / 24);
  const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");
  const partial = month === thisMonth;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/reports?month=${shiftMonth(month, -1)}`} className={secondaryButtonClass}>← {monthLabel(shiftMonth(month, -1))}</Link>
        {!partial && (
          <Link href={`/reports?month=${shiftMonth(month, 1)}`} className={secondaryButtonClass}>{monthLabel(shiftMonth(month, 1))} →</Link>
        )}
        <span className="ml-auto"><PrintButton label="Download PDF" /></span>
      </div>
      <p className="no-print mb-4 text-xs text-stone-500">“Download PDF” opens the print window. Choose “Save as PDF” as the printer.</p>

      <article className="rounded-lg border border-stone-200 bg-white p-8 text-sm text-stone-900 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 border-b border-stone-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Street medicine case management</p>
          <h1 className="text-2xl font-semibold">Monthly program report: {monthLabel(month)}</h1>
          <p className="mt-1 text-xs text-stone-500">
            Counts only, no names or identifying details. {partial ? `Month in progress, as of ${new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}.` : ""}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Requests received" value={String(r.requests.total)} sub={`${r.requests.urgent} needed help that day`} />
          <Stat label="Average time to first contact" value={days(r.firstContact.averageDays)} sub={`median ${days(r.firstContact.medianDays)}`} />
          <Stat label="Plan steps connected or done" value={String(r.planSteps.connected + r.planSteps.done)} sub={`${r.planSteps.connected} connected · ${r.planSteps.done} done`} />
          <Stat
            label="Guests we couldn't find"
            value={r.couldntFind.share === null ? "—" : `${Math.round(r.couldntFind.share * 100)}%`}
            sub={`${r.couldntFind.guestsNotFound} of ${r.couldntFind.guestsTried} guests we tried to reach`}
          />
        </div>

        <Section title="Requests">
          <Table
            rows={[
              ["Requests received", String(r.requests.total)],
              ...Object.entries(r.requests.bySource).map(([s, n]): [string, string] => [`  From ${SOURCE_NAMES[s] ?? s}`, String(n)]),
              ["Needed help the same day", String(r.requests.urgent)],
              ["Assigned to a case manager", `${r.assignment.assigned} (${pct(r.assignment.assigned, r.requests.total)})`],
              ["Median time to assignment", hours(r.assignment.medianHours)],
            ]}
          />
        </Section>

        <Section title="First contact" note="For requests received this month: days from the request to the first time a case manager met the guest.">
          <Table
            rows={[
              ["Guests met so far", `${r.firstContact.met} of ${r.requests.total}`],
              ["Met within 7 days", `${r.firstContact.within7Days} (${pct(r.firstContact.within7Days, r.requests.total)})`],
              ["Not met yet", String(r.firstContact.notYet)],
              ["Average / median days", `${days(r.firstContact.averageDays)} / ${days(r.firstContact.medianDays)}`],
            ]}
          />
        </Section>

        <Section title="Most common needs" note="Across requests received this month. A guest can have several needs.">
          {r.topNeeds.length === 0 ? (
            <p className="text-stone-600">No requests this month.</p>
          ) : (
            <ul className="space-y-1.5">
              {r.topNeeds.map((n) => (
                <li key={n.need} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3">
                  <span>{needLabel(n.need)}</span>
                  <span className="h-2.5 rounded bg-stone-100 print:border print:border-stone-300">
                    <span className="block h-full rounded bg-brand-600" style={{ width: `${(n.count / r.topNeeds[0].count) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{n.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Outreach activity" note="Contact log entries dated this month.">
          <Table
            rows={[
              ["Times we met with a guest", String(r.activity.met)],
              ["Times we couldn't find a guest", String(r.activity.notFound)],
              ["Updates (work done for a guest)", String(r.activity.updates)],
              ["Plan steps that reached Connected", String(r.planSteps.connected)],
              ["Plan steps that reached Done", String(r.planSteps.done)],
              ["Cases closed", String(r.activity.closed)],
              [partial ? "Active caseload now" : "Active caseload at month end", String(r.activity.activeAtEnd)],
            ]}
          />
        </Section>
      </article>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-3">
      <p className="text-xs text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{sub}</p>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="text-base font-semibold">{title}</h2>
      {note && <p className="mb-2 text-xs text-stone-500">{note}</p>}
      {children}
    </section>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full">
      <tbody className="divide-y divide-stone-100">
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className={`py-1.5 ${k.startsWith("  ") ? "pl-4 text-stone-600" : ""}`}>{k.trim()}</td>
            <td className="py-1.5 text-right tabular-nums">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
