"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { recoverSupervisor } from "./actions";

export function RecoverForm() {
  const [state, action, pending] = useActionState(recoverSupervisor, undefined);
  if (state?.password) {
    return (
      <div className="space-y-3 text-sm">
        <p>Done. Your temporary password is:</p>
        <code className="block rounded bg-stone-100 p-2 font-mono">{state.password}</code>
        <p>Sign in with it. You will set up two-step verification again and choose a new password.</p>
        <Link href="/login" className={buttonClass}>Go to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="code">Setup code (ADMIN_SETUP_CODE in Vercel)</label>
        <input id="code" name="code" required autoComplete="off" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="email">Supervisor email</label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>Reset my sign-in</button>
    </form>
  );
}
