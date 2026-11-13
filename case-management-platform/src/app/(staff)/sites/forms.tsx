"use client";

import { useActionState, useState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass, smallButtonClass } from "@/components/ui";
import { addShift, addSite, importSchedule, type SitesState } from "./actions";

function Result({ state }: { state: SitesState }) {
  if (state?.error) return <ErrorText>{state.error}</ErrorText>;
  if (state?.ok) return <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">✓ {state.ok}</p>;
  return null;
}

export function ImportScheduleForm() {
  const [state, action, pending] = useActionState(importSchedule, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className={labelClass} htmlFor="schedule">Paste rows from the schedule sheet</label>
      <textarea
        id="schedule"
        name="schedule"
        rows={5}
        className={`${inputClass} font-mono text-xs`}
        placeholder={"Saturday, November 14, 2026\tMeet at LKSC at 7:15 am, return to LKSC at 10:30 am\tHope's Corner: 748 Mercy St, Mountain View, CA 94041"}
      />
      <p className="text-xs text-stone-500">
        Select the date, time and site columns in Google Sheets, copy, and paste here. New sites are added from the site column. Shifts already on the schedule are skipped.
      </p>
      <Result state={state} />
      <button className={buttonClass} disabled={pending}>{pending ? "Adding…" : "Add these shifts"}</button>
    </form>
  );
}

export function AddShiftForm({ sites }: { sites: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addShift, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="siteId">Site</label>
          <select id="siteId" name="siteId" required className={inputClass} defaultValue="">
            <option value="" disabled>Pick a site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="shiftDate">Date</label>
          <input id="shiftDate" name="shiftDate" type="date" required className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="meetTime">Meet time</label>
          <input id="meetTime" name="meetTime" placeholder="7:15 am" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="returnTime">Return time</label>
          <input id="returnTime" name="returnTime" placeholder="10:30 am" className={inputClass} />
        </div>
      </div>
      <Result state={state} />
      <button className={buttonClass} disabled={pending}>Add shift</button>
    </form>
  );
}

export function AddSiteForm() {
  const [state, action, pending] = useActionState(addSite, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">Site name</label>
          <input id="name" name="name" required placeholder="Hope's Corner" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="address">Address</label>
          <input id="address" name="address" placeholder="748 Mercy St, Mountain View, CA 94041" className={inputClass} />
        </div>
      </div>
      <Result state={state} />
      <button className={buttonClass} disabled={pending}>Add site</button>
    </form>
  );
}

/** Copies the ready-to-send text for a shift (site, date, code, where to enter it). */
export function CopyShiftMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={smallButtonClass}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied ✓" : "Copy message to send"}
    </button>
  );
}
