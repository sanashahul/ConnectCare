"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { CONTACT_TYPES, NEEDS } from "@/lib/options";
import { addNote, addPlanItem } from "../actions";

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function NoteForm({ clientId, needs }: { clientId: string; needs: string[] }) {
  const [state, action, pending] = useActionState(addNote.bind(null, clientId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-md bg-stone-50 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="contactDate">Date</label>
          <input id="contactDate" name="contactDate" type="date" defaultValue={todayLocal()} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactType">Type</label>
          <select id="contactType" name="contactType" className={inputClass}>
            {CONTACT_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="followUpDate">Follow up on</label>
          <input id="followUpDate" name="followUpDate" type="date" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="body">Note</label>
        <textarea id="body" name="body" rows={3} required className={inputClass} placeholder="What you talked about, what was done, next steps." />
      </div>
      {needs.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-stone-600">Needs discussed:</span>
          {NEEDS.filter((n) => needs.includes(n.key)).map((n) => (
            <label key={n.key} className="flex items-center gap-1"><input type="checkbox" name="needsAddressed" value={n.key} /> {n.label}</label>
          ))}
        </div>
      )}
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Add to log"}</button>
    </form>
  );
}

export function AddPlanItemForm({ clientId, needs, resources }: {
  clientId: string;
  needs: string[];
  resources: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addPlanItem.bind(null, clientId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const ordered = [...NEEDS.filter((n) => needs.includes(n.key)), ...NEEDS.filter((n) => !needs.includes(n.key))];
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-md bg-stone-50 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="need">Need</label>
          <select id="need" name="need" className={inputClass}>
            {ordered.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="dueDate">Due</label>
          <input id="dueDate" name="dueDate" type="date" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="title">Step</label>
        <input id="title" name="title" required maxLength={500} className={inputClass} placeholder="e.g. Call Here4You together for a shelter bed" />
      </div>
      <div>
        <label className={labelClass} htmlFor="resourceId">Resource (optional)</label>
        <select id="resourceId" name="resourceId" className={inputClass}>
          <option value="">None</option>
          {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Add step"}</button>
    </form>
  );
}
