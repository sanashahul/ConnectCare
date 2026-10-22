"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { NEEDS } from "@/lib/options";
import { assignResource, type AssignState } from "../actions";

export function AssignToClientForm({ resourceId, clients, defaultNeed }: {
  resourceId: string;
  clients: { id: string; label: string }[];
  defaultNeed: string;
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assignResource.bind(null, resourceId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  if (clients.length === 0) {
    return <p className="text-sm text-stone-600">You don&apos;t have any active clients to add this to yet.</p>;
  }
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="clientId">Client</label>
          <select id="clientId" name="clientId" required className={inputClass} defaultValue="">
            <option value="" disabled>Choose a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="need">For which need</label>
          <select id="need" name="need" className={inputClass} defaultValue={defaultNeed}>
            {NEEDS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="title">Step <span className="font-normal text-stone-500">(optional)</span></label>
          <input id="title" name="title" maxLength={500} className={inputClass} placeholder="Leave blank for “Connect with …”" />
        </div>
        <div>
          <label className={labelClass} htmlFor="dueDate">Due <span className="font-normal text-stone-500">(optional)</span></label>
          <input id="dueDate" name="dueDate" type="date" className={inputClass} />
        </div>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && state.clientId && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          Added to {state.clientName}&apos;s plan as a To do step.{" "}
          <Link href={`/clients/${state.clientId}`} className="font-semibold underline">Open their plan</Link>
        </p>
      )}
      <button className={buttonClass} disabled={pending}>{pending ? "Adding…" : "Add to client's plan"}</button>
    </form>
  );
}
