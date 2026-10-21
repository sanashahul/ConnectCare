"use client";

import { useActionState } from "react";
import { smallButtonClass } from "@/components/ui";
import { addPlanItem } from "../../actions";

export function AddResourceToPlan({ clientId, need, resourceId, resourceName }: {
  clientId: string; need: string; resourceId: string; resourceName: string;
}) {
  const [state, action, pending] = useActionState(addPlanItem.bind(null, clientId), undefined);
  if (state?.ok) return <span className="text-xs font-medium text-emerald-700">Added to plan ✓</span>;
  return (
    <form action={action}>
      <input type="hidden" name="need" value={need} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="title" value={`Connect with ${resourceName}`} />
      <button className={smallButtonClass} disabled={pending}>{pending ? "Adding…" : "+ Add to plan"}</button>
      {state?.error && <span className="ml-2 text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
