"use client";

import { useActionState } from "react";
import { IntakeFields } from "@/components/intake-fields";
import { buttonClass, ErrorText } from "@/components/ui";
import type { ClientProfile } from "@/lib/clients";
import type { ActionState } from "./actions";

export function ClientForm({ action: serverAction, defaults, submitLabel, askConsent = false }: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  defaults?: Partial<ClientProfile> & { city?: string | null; needs?: string[]; urgent?: boolean };
  submitLabel: string;
  /** New clients added by staff: the case manager confirms the client agreed. */
  askConsent?: boolean;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <IntakeFields mode="staff" defaults={defaults} errors={state?.fieldErrors} />
      {askConsent && (
        <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-stone-800">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            I explained to the client what we write down, why, and who can see it, and that they can say no or ask us to
            delete it later. <strong>The client agreed.</strong>
          </span>
        </label>
      )}
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}
