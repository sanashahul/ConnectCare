"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="current">Current (or temporary) password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="next">New password</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="confirm">New password again</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>Save password</button>
    </form>
  );
}
