import Link from "next/link";
import { Badge, Card, EmptyState, formatDate, PageHeader, smallButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { pacificDate } from "@/lib/report";
import { requireShiftViewer } from "@/lib/auth";
import { formatShiftDate, normalizeShiftCode, shiftIsOpen } from "@/lib/shift-utils";
import { pacificToday, recordWrongShiftCode, shiftByCode, shiftCodeLocked, shiftList, type ShiftListEntry } from "@/lib/shifts";
import { recordCheck } from "../actions";

export default async function ShiftListPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireShiftViewer();
  const supervisor = user.role === "supervisor";
  const code = normalizeShiftCode((await params).code);
  const today = pacificToday();

  const locked = !supervisor && (await shiftCodeLocked(user.id));
  const found = locked ? null : await shiftByCode(code);
  const open = found ? shiftIsOpen(found.shift.shiftDate, today) : false;
  // Supervisors can preview any shift's list. Clinical managers only see it on the day.
  if (!found || (!open && !supervisor)) {
    if (!locked && !supervisor) await recordWrongShiftCode(user.id);
    return (
      <div className="space-y-5">
        <PageHeader title="Code not valid" back={{ href: "/shift", label: "Enter a code" }} />
        <EmptyState>
          {locked
            ? "Too many wrong codes. Wait an hour, or ask your supervisor for help."
            : found
              ? "This code is for a different day. Codes only work on the day of the shift."
              : "That code wasn't found. Check it with your supervisor."}
        </EmptyState>
      </div>
    );
  }

  const { shift, site } = found;
  const list = await shiftList(shift);
  await audit({ userId: user.id, action: "shift.viewed", detail: { shiftId: shift.id, clients: list.length } });
  const toFind = list.filter((e) => !e.check);
  const done = list.filter((e) => e.check);

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: supervisor ? "/sites" : "/shift", label: supervisor ? "Sites & shifts" : "Enter another code" }}
        title={site.name}
        subtitle={
          <>
            {formatShiftDate(shift.shiftDate, { year: true })}
            {shift.meetTime && ` · meet ${shift.meetTime}`}
            {shift.returnTime && `, return ${shift.returnTime}`}
            {site.address && <> · {site.address}</>}
          </>
        }
      />
      {!open && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview: this shift is on {formatShiftDate(shift.shiftDate)}. The list can change before then, and results can only be recorded on the day.
        </p>
      )}
      <p className="text-sm text-stone-600">
        These people&apos;s case managers haven&apos;t been able to reach them. If you find someone, mark them <strong>Found</strong> and ask them to get in touch with their case manager.
        Their case manager sees what you record.
      </p>

      <Card title={`To look for (${toFind.length})`}>
        {toFind.length === 0 ? (
          <EmptyState>{list.length ? "Everyone on the list has been checked. Thank you!" : "Nobody at this site is marked “Don't respond” right now."}</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {toFind.map((e) => <Person key={e.clientId} entry={e} code={shift.code} canRecord={open} />)}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card title={`Checked on this shift (${done.length})`}>
          <ul className="divide-y divide-stone-100">
            {done.map((e) => <Person key={e.clientId} entry={e} code={shift.code} canRecord={open} />)}
          </ul>
        </Card>
      )}
      {supervisor && <p className="text-xs text-stone-500"><Link href="/sites" className="underline">Back to the schedule</Link></p>}
    </div>
  );
}

function Person({ entry: e, code, canRecord }: { entry: ShiftListEntry; code: string; canRecord: boolean }) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1 text-sm">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-stone-900">
            {e.name}
            {e.pronouns && <span className="text-sm font-normal text-stone-600">({e.pronouns})</span>}
            <span className="font-mono text-sm font-normal text-stone-400">{e.clientCode}</span>
            {e.check?.result === "found" && <Badge tone="green">Found</Badge>}
            {e.check?.result === "not_here" && <Badge tone="amber">Not here</Badge>}
          </p>
          {e.tip && <p className="rounded bg-amber-50 px-2 py-1 text-amber-950"><span className="font-medium">Tip from case manager:</span> {e.tip}</p>}
          <p className="text-stone-700">
            {e.lastMet ? <>Last seen {formatDate(e.lastMet)}{e.lastPlace && <> at {e.lastPlace}</>}</> : "Not met yet"}
            {e.usuallyAt && <> · Usually: {e.usuallyAt}</>}
          </p>
          <p className="text-stone-500">
            {e.caseManager ? `Case manager: ${e.caseManager}` : "No case manager yet"}
            {e.markedAt && ` · marked not responding ${formatDate(pacificDate(e.markedAt))}`}
            {e.check && ` · ${e.check.result === "found" ? "found" : "checked"} by ${e.check.by}`}
          </p>
        </div>
        {canRecord && (
          e.check ? (
            <form action={recordCheck}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="clientId" value={e.clientId} />
              <input type="hidden" name="result" value="undo" />
              <button className={smallButtonClass}>Undo</button>
            </form>
          ) : (
            <details className="w-full sm:w-72">
              <summary className="cursor-pointer list-none rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700">
                Record what happened
              </summary>
              <form action={recordCheck} className="mt-2 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="clientId" value={e.clientId} />
                <label className="block">
                  <span className="text-stone-700">Note for their case manager (optional)</span>
                  <textarea name="note" rows={2} maxLength={2000} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1" />
                </label>
                <p className="text-xs text-stone-500">No health details here. Those go in the client&apos;s Box folder.</p>
                <div className="flex gap-2">
                  <button name="result" value="found" className="flex-1 rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">Found</button>
                  <button name="result" value="not_here" className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-800 hover:bg-stone-100">Not here</button>
                </div>
              </form>
            </details>
          )
        )}
      </div>
    </li>
  );
}
