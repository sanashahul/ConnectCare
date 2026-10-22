"use client";

import { startTransition, useActionState, useState } from "react";
import { assignClient, type AssignClientState } from "@/app/(staff)/clients/actions";
import { buttonClass, ErrorText } from "@/components/ui";

export type CaseManagerOption = { id: string; name: string; load: number };

/**
 * Assign a client to a case manager. Submitted through onSubmit rather than the form's action prop:
 * React resets a form after an action runs, which made the dropdown snap back to the old case manager
 * and look unsaved even though the save went through.
 * In the intake queue the server redirects back with a confirmation banner; on a client page the
 * confirmation shows under the dropdown.
 */
export function AssignCaseManager({ clientId, current, caseManagers, variant }: {
  clientId: string;
  current: string | null;
  caseManagers: CaseManagerOption[];
  variant: "queue" | "client";
}) {
  const [state, action, pending] = useActionState<AssignClientState, FormData>(assignClient, undefined);
  const [value, setValue] = useState(current ?? "");
  const [touched, setTouched] = useState(false);
  const saved = state?.ok ? state.assigneeId ?? "" : current ?? "";
  const queue = variant === "queue";
  const id = `assignee-${clientId}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className={queue ? "w-full max-w-xs space-y-2" : "space-y-2"}
    >
      <input type="hidden" name="clientId" value={clientId} />
      {queue && <input type="hidden" name="from" value="queue" />}
      <label htmlFor={id} className={queue ? "block text-sm text-stone-700" : "sr-only"}>{queue ? "Assign to" : "Case manager"}</label>
      <div className="flex items-stretch gap-2">
        <select
          id={id}
          name="assigneeId"
          value={value}
          required={queue}
          disabled={pending}
          onChange={(e) => {
            setValue(e.target.value);
            setTouched(true);
          }}
          className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 py-2 text-sm"
        >
          <option value="">{queue ? "Choose case manager…" : "Unassigned"}</option>
          {caseManagers.map((cm) => (
            <option key={cm.id} value={cm.id}>
              {cm.name} ({cm.load} active)
            </option>
          ))}
        </select>
        <button className={buttonClass} disabled={pending || (!queue && value === saved) || (queue && !value)}>
          {pending ? "Saving…" : queue ? "Assign" : "Save"}
        </button>
      </div>
      {!pending && <ErrorText>{state?.error}</ErrorText>}
      {!pending && state?.ok && value === saved && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✓ Saved. {state.assigneeName ? `${state.assigneeName} is now the case manager.` : "This client is unassigned and back in the intake queue."}
        </p>
      )}
      {!queue && touched && value !== saved && !pending && (
        <p className="text-xs text-amber-800">Not saved yet. Press Save to confirm.</p>
      )}
    </form>
  );
}
