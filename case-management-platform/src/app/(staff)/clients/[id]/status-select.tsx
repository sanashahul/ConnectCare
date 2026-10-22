"use client";

import { PLAN_STATUSES } from "@/lib/options";

/** Saves as soon as a status is picked (no separate Update button). */
export function StatusSelect({ itemId, status, action }: { itemId: string; status: string; action: (form: FormData) => void }) {
  return (
    <form action={action}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="intent" value="status" />
      <label className="sr-only" htmlFor={`status-${itemId}`}>Status</label>
      <select
        id={`status-${itemId}`}
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-stone-300 px-1 py-1 text-xs"
      >
        {PLAN_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </form>
  );
}
