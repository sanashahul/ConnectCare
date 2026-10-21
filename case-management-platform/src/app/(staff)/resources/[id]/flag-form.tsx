"use client";

import { useActionState } from "react";
import { ErrorText, inputClass, secondaryButtonClass } from "@/components/ui";
import { flagResource } from "../actions";

export function FlagForm({ resourceId }: { resourceId: string }) {
  const [state, action, pending] = useActionState(flagResource.bind(null, resourceId), undefined);
  if (state?.ok) return <p className="text-sm text-emerald-700">Thanks. Your supervisor will check it.</p>;
  return (
    <form action={action} className="space-y-2">
      <textarea name="message" rows={2} maxLength={1000} required className={inputClass}
        placeholder="e.g. Phone number disconnected; now closed on Fridays. No client names, please." />
      <ErrorText>{state?.error}</ErrorText>
      <button className={secondaryButtonClass} disabled={pending}>Report problem</button>
    </form>
  );
}
