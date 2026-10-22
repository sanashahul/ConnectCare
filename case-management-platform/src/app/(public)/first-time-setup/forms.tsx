"use client";

import { useActionState, useEffect, useState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass, smallButtonClass } from "@/components/ui";
import { createFirstSupervisor } from "./actions";

function randomValue(bytes: number) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generates secrets in this browser only; nothing is sent to the server. */
export function SecretValues({ names }: { names: string[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string>();
  useEffect(() => {
    setValues(Object.fromEntries(names.map((n) => [n, randomValue(n === "ADMIN_SETUP_CODE" ? 15 : 32)])));
  }, [names]);
  return (
    <div className="space-y-2">
      {names.map((n) => (
        <div key={n} className="rounded-md border border-stone-200 bg-stone-50 p-2">
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-semibold">{n}</code>
            <button
              type="button"
              className={smallButtonClass}
              onClick={async () => {
                await navigator.clipboard.writeText(values[n] ?? "");
                setCopied(n);
              }}
            >
              {copied === n ? "Copied ✓" : "Copy value"}
            </button>
          </div>
          <code className="mt-1 block break-all font-mono text-xs text-stone-700">{values[n] ?? "…"}</code>
        </div>
      ))}
    </div>
  );
}

export function FirstSupervisorForm() {
  const [state, action, pending] = useActionState(createFirstSupervisor, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="code">Setup code (the ADMIN_SETUP_CODE value from Vercel)</label>
        <input id="code" name="code" required autoComplete="off" className={inputClass} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">Your name</label>
          <input id="name" name="name" required defaultValue={state?.name} key={`n${state?.name}`} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">Your work email</label>
          <input id="email" name="email" type="email" required autoComplete="username" defaultValue={state?.email} key={`e${state?.email}`} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">Choose a password (12+ characters)</label>
          <input id="password" name="password" type="password" required autoComplete="new-password" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="confirm">Password again</label>
          <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
        </div>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Creating…" : "Create supervisor account"}</button>
    </form>
  );
}
