"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { openShift } from "./actions";

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
