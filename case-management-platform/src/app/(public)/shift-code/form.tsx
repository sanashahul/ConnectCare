"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { enterShiftCode } from "./actions";

export function ShiftCodeEntry() {
  const [state, action, pending] = useActionState(enterShiftCode, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorText>{state?.error}</ErrorText>
      <div>
        <label className={labelClass} htmlFor="code">Shift code</label>
        <input
          id="code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC-123"
          className={`${inputClass} font-mono text-lg uppercase tracking-widest`}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="name">Your name</label>
        <input id="name" name="name" required maxLength={60} autoComplete="name" defaultValue={state?.name} key={state?.name} className={inputClass} />
      </div>
      <button className={`${buttonClass} w-full`} disabled={pending}>{pending ? "Checking…" : "Open today's list"}</button>
    </form>
  );
}
