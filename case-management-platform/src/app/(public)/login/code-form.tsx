"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import type { FormState } from "./actions";

export function CodeForm({ action: serverAction, label }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  label: string;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorText>{state?.error}</ErrorText>
      <div>
        <label className={labelClass} htmlFor="code">6-digit code</label>
        <input
          id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}"
          maxLength={7} required autoFocus className={`${inputClass} text-center text-lg tracking-widest`}
        />
      </div>
      <button className={`${buttonClass} w-full`} disabled={pending}>{pending ? "Checking…" : label}</button>
    </form>
  );
}
