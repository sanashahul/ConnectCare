"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const [resourceChoice, setResourceChoice] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setResourceChoice("");
    }
  }, [state]);
  const ordered = [...NEEDS.filter((n) => needs.includes(n.key)), ...NEEDS.filter((n) => !needs.includes(n.key))];
  const typing = resourceChoice === "__custom";
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
        <label className={labelClass} htmlFor="resourceId">Resource</label>
        <select
          id="resourceId"
          name="resourceId"
          value={resourceChoice}
          onChange={(e) => setResourceChoice(e.target.value)}
          className={inputClass}
        >
          <option value="">No resource (just a step)</option>
          <option value="__custom">✎ Type in a resource…</option>
          <optgroup label="From the resource directory">
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </optgroup>
        </select>
      </div>
      {typing && (
        <div className="space-y-3 rounded-md border border-stone-200 bg-white p-3">
          <div>
            <label className={labelClass} htmlFor="customName">Resource name *</label>
            <input id="customName" name="customName" required maxLength={200} className={inputClass} placeholder="e.g. St. Vincent de Paul clothing closet" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="customPhone">Phone</label>
              <input id="customPhone" name="customPhone" maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="customHours">Hours</label>
              <input id="customHours" name="customHours" maxLength={300} className={inputClass} placeholder="e.g. Mon–Fri 9 am to 3 pm" />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="customAddress">Address</label>
            <input id="customAddress" name="customAddress" maxLength={300} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="customNotes">What they offer / notes</label>
            <input id="customNotes" name="customNotes" maxLength={1000} className={inputClass} placeholder="Shown on the client's printout" />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input type="checkbox" name="addToDirectory" /> Also add to the resource directory so the whole team can use it
          </label>
        </div>
      )}
      <div>
        <label className={labelClass} htmlFor="title">Step {resourceChoice ? <span className="font-normal text-stone-500">(optional)</span> : null}</label>
        <input
          id="title"
          name="title"
          maxLength={500}
          required={!resourceChoice}
          className={inputClass}
          placeholder={resourceChoice ? "Leave blank for “Connect with …”" : "e.g. Bring your ID to the Thursday appointment"}
        />
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Add step"}</button>
    </form>
  );
}
