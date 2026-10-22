"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass, smallButtonClass } from "@/components/ui";
import { createUser, resetPassword, type TeamState } from "./actions";

function Created({ state }: { state: TeamState }) {
  if (!state?.created) return null;
  return (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
      <p className="font-semibold">{state.created.reset ? "Password reset" : "Account created"} for {state.created.email}</p>
      <p className="mt-1">Temporary password: <code className="rounded bg-white px-1 font-mono">{state.created.password}</code></p>
      <p className="mt-1 text-stone-600">Share it in person or by phone, not by email or text. It is shown only once. They will set their own password and two-step verification when they sign in.</p>
    </div>
  );
}

export function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="name">Name</label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="role">Role</label>
          <select id="role" name="role" className={inputClass}>
            <option value="case_manager">Case manager</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <Created state={state} />
      <button className={buttonClass} disabled={pending}>Create account</button>
    </form>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <button className={smallButtonClass} disabled={pending}>Reset password</button>
      </form>
      <div className="mt-2"><Created state={state} /></div>
    </div>
  );
}
