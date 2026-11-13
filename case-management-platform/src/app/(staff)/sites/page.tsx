import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card, EmptyState, PageHeader, smallButtonClass } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { formatShiftCode, formatShiftDate, shiftMessage } from "@/lib/shift-utils";
import { listSites, notRespondingCounts, pacificToday, upcomingShifts } from "@/lib/shifts";
import { setSiteActive, shiftAction } from "./actions";
import { AddShiftForm, AddSiteForm, CopyShiftMessage, ImportScheduleForm } from "./forms";

export default async function SitesPage() {
  await requireSupervisor();
  const today = pacificToday();
  const [sites, shifts, counts] = await Promise.all([listSites(), upcomingShifts(today), notRespondingCounts()]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const siteUrl = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  const activeSites = sites.filter((s) => s.active);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sites & shifts"
        subtitle="Each shift has its own code. On the day, send the code to the clinical manager working that shift. It opens the list of clients marked “Don't respond” at that site, and only works on the shift date."
      />

      <Card title="Upcoming shifts">
        {shifts.length === 0 ? (
          <EmptyState>No shifts scheduled. Paste rows from the schedule sheet below.</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {shifts.map(({ shift, site }) => {
              const n = counts.get(site.id) ?? 0;
              const isToday = shift.shiftDate === today;
              return (
                <li key={shift.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatShiftDate(shift.shiftDate, { year: true })} · {site.name}
                      {isToday && <span className="ml-2"><Badge tone="green">Today</Badge></span>}
                    </p>
                    <p className="text-sm text-stone-600">
                      {[shift.meetTime && `Meet ${shift.meetTime}`, shift.returnTime && `return ${shift.returnTime}`].filter(Boolean).join(", ")}
                      {(shift.meetTime || shift.returnTime) && " · "}
                      <span className={n ? "font-medium text-amber-800" : ""}>{n} not responding at this site</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-stone-100 px-2 py-1 font-mono text-sm font-semibold tracking-wider" title="Shift code">
                      {formatShiftCode(shift.code)}
                    </span>
                    <CopyShiftMessage text={shiftMessage({ siteName: site.name, shiftDate: shift.shiftDate, meetTime: shift.meetTime, code: shift.code }, siteUrl)} />
                    <Link href={`/shift/${shift.code}`} className={smallButtonClass}>See list</Link>
                    <details>
                      <summary className={`${smallButtonClass} cursor-pointer list-none`}>More…</summary>
                      <div className="mt-2 flex gap-2">
                        <form action={shiftAction}>
                          <input type="hidden" name="shiftId" value={shift.id} />
                          <input type="hidden" name="intent" value="newCode" />
                          <button className={smallButtonClass} title="The old code stops working">New code</button>
                        </form>
                        <form action={shiftAction}>
                          <input type="hidden" name="shiftId" value={shift.id} />
                          <input type="hidden" name="intent" value="delete" />
                          <button className={`${smallButtonClass} text-red-700`}>Delete shift</button>
                        </form>
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Add shifts from the schedule">
          <ImportScheduleForm />
        </Card>
        <Card title="Add one shift">
          {activeSites.length ? <AddShiftForm sites={activeSites} /> : <EmptyState>Add a site first.</EmptyState>}
        </Card>
      </div>

      <Card title="Sites">
        {sites.length === 0 ? (
          <EmptyState>No sites yet. They are added automatically when you paste the schedule, or add one below.</EmptyState>
        ) : (
          <ul className="mb-4 divide-y divide-stone-100">
            {sites.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{s.name}</span>
                  {s.address && <span className="text-stone-500"> · {s.address}</span>}
                  {!s.active && <span className="ml-2"><Badge>Hidden</Badge></span>}
                  {(counts.get(s.id) ?? 0) > 0 && <span className="ml-2"><Badge tone="amber">{counts.get(s.id)} not responding</Badge></span>}
                </span>
                <form action={setSiteActive}>
                  <input type="hidden" name="siteId" value={s.id} />
                  <input type="hidden" name="active" value={s.active ? "false" : "true"} />
                  <button className={smallButtonClass}>{s.active ? "Hide" : "Show again"}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <AddSiteForm />
      </Card>
    </div>
  );
}
