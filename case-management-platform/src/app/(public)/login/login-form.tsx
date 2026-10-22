"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorText>{state?.error}</ErrorText>
      <div>
        <label className={labelClass} htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.email} key={state?.email} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <button className={`${buttonClass} w-full`} disabled={pending}>{pending ? "Checking…" : "Continue"}</button>
    </form>
  );
}
