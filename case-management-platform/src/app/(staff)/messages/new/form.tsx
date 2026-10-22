"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { startThread } from "../actions";

export function NewMessageForm({ supervisor, caseManagers, clients, defaultClientId, defaultCaseManagerId }: {
  supervisor: boolean;
  caseManagers: { id: string; name: string }[];
  clients: { id: string; code: string }[];
  defaultClientId?: string;
  defaultCaseManagerId?: string;
}) {
  const [state, action, pending] = useActionState(startThread, undefined);
  return (
    <form action={action} className="space-y-3">
      {supervisor && (
        <div>
          <label className={labelClass} htmlFor="caseManagerId">To</label>
          <select id="caseManagerId" name="caseManagerId" required defaultValue={defaultCaseManagerId ?? ""} className={inputClass}>
            <option value="">Choose a case manager…</option>
            {caseManagers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={labelClass} htmlFor="subject">Subject</label>
        <input id="subject" name="subject" required maxLength={200} className={inputClass} placeholder="e.g. Need help finding a family shelter bed" />
      </div>
      <div>
        <label className={labelClass} htmlFor="clientId">About a client (optional)</label>
        <select id="clientId" name="clientId" defaultValue={defaultClientId ?? ""} className={inputClass}>
          <option value="">No specific client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="body">Message</label>
        <textarea id="body" name="body" required rows={5} maxLength={5000} className={inputClass} />
        <p className="mt-1 text-xs text-stone-500">Refer to clients by their CC number. Only you and the supervisors can see this conversation.</p>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Sending…" : "Send"}</button>
    </form>
  );
}
