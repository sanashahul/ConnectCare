"use client";

import { useActionState } from "react";
import { IntakeFields } from "@/components/intake-fields";
import { buttonClass, ErrorText } from "@/components/ui";
import type { ClientProfile } from "@/lib/clients";
import type { ActionState } from "./actions";

export function ClientForm({ action: serverAction, defaults, submitLabel }: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  defaults?: Partial<ClientProfile> & { city?: string | null; needs?: string[]; urgent?: boolean };
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <IntakeFields mode="staff" defaults={defaults} errors={state?.fieldErrors} />
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}
