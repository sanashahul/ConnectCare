"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonClass, ErrorText, inputClass, labelClass, smallButtonClass } from "@/components/ui";
import { addQuickNote, openShift } from "./actions";

export function ShiftCodeForm() {
  const [state, action, pending] = useActionState(openShift, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className={labelClass} htmlFor="code">Shift code</label>
      <input
        id="code"
        name="code"
        required
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="ABC-123"
        className={`${inputClass} max-w-xs font-mono text-lg uppercase tracking-widest`}
      />
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Opening…" : "Open the list"}</button>
    </form>
  );
}

/** One-line quick note for the case manager. Clears itself after saving. */
export function QuickNoteForm({ code, clientId }: { code: string; clientId: string }) {
  const [state, action, pending] = useActionState(addQuickNote, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="mt-2 flex flex-wrap items-start gap-2">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="body"
        required
        maxLength={2000}
        placeholder="Quick note for their case manager (no health details)"
        aria-label="Quick note"
        className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm"
      />
      <button disabled={pending} className={smallButtonClass}>{pending ? "Saving…" : "Add note"}</button>
      {state?.error && <p role="alert" className="w-full text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
