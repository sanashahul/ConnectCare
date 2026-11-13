import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireShiftViewer } from "@/lib/auth";
import { formatShiftCode } from "@/lib/shift-utils";
import { pacificToday, upcomingShifts } from "@/lib/shifts";
import { ShiftCodeForm } from "./forms";

export default async function ShiftHome() {
  const user = await requireShiftViewer();
  const supervisor = user.role === "supervisor";
  const today = pacificToday();
  const todays = supervisor ? (await upcomingShifts(today)).filter((r) => r.shift.shiftDate === today) : [];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Today's shift"
        subtitle="Enter the code your supervisor sent you for today's shift. You'll see the people at that site whose case managers haven't been able to reach them."
      />
      <Card>
        <ShiftCodeForm />
      </Card>
      {supervisor && (
        <Card title="Today's shifts">
          {todays.length === 0 ? (
            <EmptyState>
              No shifts today. <Link href="/sites" className="text-brand-700 underline">See the schedule</Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {todays.map(({ shift, site }) => (
                <li key={shift.id} className="flex items-center justify-between py-2">
                  <span>{site.name}{shift.meetTime && ` · ${shift.meetTime}`}</span>
                  <Link href={`/shift/${shift.code}`} className="font-mono text-brand-700 underline">{formatShiftCode(shift.code)}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
