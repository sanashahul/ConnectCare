import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card, EmptyState, PageHeader, smallButtonClass } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { formatShiftCode, formatShiftDate, shiftMessage } from "@/lib/shift-utils";
import { listSites, notRespondingCounts, pacificToday, upcomingShifts } from "@/lib/shifts";
import { shiftAction } from "./actions";
import { AddShiftForm, CopyShiftMessage } from "./forms";

export default async function SchedulePage() {
  await requireSupervisor();
  const today = pacificToday();
  const [sites, shifts, counts] = await Promise.all([listSites(), upcomingShifts(today), notRespondingCounts()]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const siteUrl = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shift schedule"
        subtitle="Add each outreach shift. It gets its own code. On the day, send the code to the clinical manager working that shift. It opens the list of clients marked “Don't respond” at that site, and only works on the shift date."
      />

      <Card title="Add one shift">
        <AddShiftForm siteNames={sites.map((s) => s.name)} />
      </Card>

      <Card title="Upcoming shifts">
        {shifts.length === 0 ? (
          <EmptyState>No shifts scheduled yet. Add one above.</EmptyState>
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

    </div>
  );
}
