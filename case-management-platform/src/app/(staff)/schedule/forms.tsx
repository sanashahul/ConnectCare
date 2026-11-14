"use client";

import { useActionState, useState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass, smallButtonClass } from "@/components/ui";
import { addShift } from "./actions";

export function AddShiftForm({ siteNames }: { siteNames: string[] }) {
  const [state, action, pending] = useActionState(addShift, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="siteName">Site</label>
          <input id="siteName" name="siteName" required list="site-names" placeholder="Hope's Corner" autoComplete="off" className={inputClass} />
          <datalist id="site-names">
            {siteNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
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
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">✓ {state.ok}</p>}
      <button className={buttonClass} disabled={pending}>Add shift</button>
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
