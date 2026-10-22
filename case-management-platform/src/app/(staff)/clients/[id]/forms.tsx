"use client";

import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { CONTACT_TYPES, NEEDS, NOTE_KINDS, type NoteKind } from "@/lib/options";
import { addNote, addPlanItem, updateNote } from "../actions";

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const METHOD_LABEL: Record<NoteKind, string> = { met: "How", not_found: "How you tried", update: "" };
const WHERE_LABEL: Record<NoteKind, string> = { met: "Where you saw them", not_found: "Where you looked", update: "" };
const BODY_PLACEHOLDER: Record<NoteKind, string> = {
  met: "What you talked about, what was done, next steps.",
  not_found: "Optional. For example: not at the usual spot, left a message with the site staff.",
  update: "What you did for them. For example: called Here4You, they're on the bed list; sent the Medi-Cal form.",
};

/** A log entry as it is being edited. */
export type NoteDraft = {
  id: string;
  kind: NoteKind;
  contactDate: string;
  contactType: string;
  where?: string;
  body: string;
  needsAddressed: string[];
  followUpDate?: string | null;
};

/** Adds a log entry, or edits one when `editing` is given. */
export function NoteForm({ clientId, needs, lastPlace, editing, onDone }: {
  clientId: string;
  needs: string[];
  lastPlace?: string;
  editing?: NoteDraft;
  onDone?: () => void;
}) {
  const save = editing ? updateNote.bind(null, editing.id) : addNote.bind(null, clientId);
  const [state, action, pending] = useActionState(save, undefined);
  const [kind, setKind] = useState<NoteKind>(editing?.kind ?? "met");
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  useEffect(() => {
    if (!state?.ok) return;
    if (editing) {
      onDone?.();
    } else {
      ref.current?.reset();
      setKind("met");
    }
  }, [state, editing, onDone]);
  const methods = kind === "not_found" ? CONTACT_TYPES.filter((c) => c.key !== "other") : CONTACT_TYPES;
  // Needs to offer: the client's current needs, plus any an older entry mentioned.
  const needOptions = NEEDS.filter((n) => needs.includes(n.key) || editing?.needsAddressed.includes(n.key));
  return (
    <form
      ref={ref}
      // Submitted by hand so React doesn't reset the form before we know the save worked.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-3 rounded-md bg-stone-50 p-3"
    >
      <input type="hidden" name="kind" value={kind} />
      <div role="group" aria-label="Type of entry" className="grid grid-cols-3 gap-1 rounded-md bg-stone-200 p-1 text-sm">
        {NOTE_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`rounded px-2 py-1.5 font-medium ${kind === k.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-600">{NOTE_KINDS.find((k) => k.key === kind)?.hint}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor={id("date")}>Date</label>
          <input id={id("date")} name="contactDate" type="date" defaultValue={editing?.contactDate ?? todayLocal()} required className={inputClass} />
        </div>
        {kind !== "update" && (
          <div>
            <label className={labelClass} htmlFor={id("type")}>{METHOD_LABEL[kind]}</label>
            <select id={id("type")} name="contactType" defaultValue={editing?.contactType} className={inputClass}>
              {methods.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor={id("follow")}>Follow up on</label>
          <input id={id("follow")} name="followUpDate" type="date" defaultValue={editing?.followUpDate ?? undefined} className={inputClass} />
        </div>
      </div>
      {kind !== "update" && (
        <div>
          <label className={labelClass} htmlFor={id("where")}>
            {WHERE_LABEL[kind]} <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <input
            id={id("where")}
            name="where"
            maxLength={300}
            defaultValue={editing?.where}
            className={inputClass}
            placeholder={lastPlace ? `Last time: ${lastPlace}` : "For example: St. James Park, by the library"}
          />
        </div>
      )}
      <div>
        <label className={labelClass} htmlFor={id("body")}>
          Note {kind === "not_found" && <span className="font-normal text-stone-500">(optional)</span>}
        </label>
        <textarea
          id={id("body")}
          name="body"
          rows={3}
          required={kind !== "not_found"}
          defaultValue={editing?.body}
          className={inputClass}
          placeholder={BODY_PLACEHOLDER[kind]}
        />
      </div>
      {needOptions.length > 0 && kind !== "not_found" && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-stone-600">{kind === "update" ? "Needs worked on:" : "Needs discussed:"}</span>
          {needOptions.map((n) => (
            <label key={n.key} className="flex items-center gap-1">
              <input type="checkbox" name="needsAddressed" value={n.key} defaultChecked={editing?.needsAddressed.includes(n.key)} /> {n.label}
            </label>
          ))}
        </div>
      )}
      <ErrorText>{state?.error}</ErrorText>
      {!editing && state?.ok && !pending && <p role="status" className="text-sm text-emerald-800">✓ Added to the log.</p>}
      <div className="flex items-center gap-3">
        <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Add to log"}</button>
        {editing && (
          <button type="button" onClick={onDone} className="text-sm text-stone-600 underline">Cancel</button>
        )}
      </div>
    </form>
  );
}

/** "Edit" on the author's own log entries; shows the form in place of the entry. */
export function EditableNote({ draft, clientId, needs, children }: {
  draft: NoteDraft;
  clientId: string;
  needs: string[];
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  if (editing) return <NoteForm clientId={clientId} needs={needs} editing={draft} onDone={close} />;
  return (
    <div>
      {children}
      <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs text-brand-700 underline">
        Edit
      </button>
    </div>
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
