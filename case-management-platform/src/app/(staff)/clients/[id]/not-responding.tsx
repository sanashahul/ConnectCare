"use client";

import { useActionState, useState } from "react";
import { formatDate, smallButtonClass } from "@/components/ui";
import { clearNotResponding, markNotResponding } from "../actions";

/**
 * The case manager's small "Don't respond" button, under Last seen. The site is filled in from
 * where the client was last seen; the clinical manager on that site's next shift gets them on their list.
 */
export function NotResponding({ clientId, sites, suggestedSiteId, lastPlace, current }: {
  clientId: string;
  sites: { id: string; name: string }[];
  suggestedSiteId?: string;
  lastPlace?: string;
  current: { siteName: string; at: Date | null; by?: string; tip?: string; nextShift?: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof markNotResponding>>, form: FormData) => {
      const r = await markNotResponding(clientId, prev, form);
      if (r?.ok) setOpen(false);
      return r;
    },
    undefined,
  );

  if (current) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-900">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium">Not responding</span>
        <span>
          Clinical team looking at {current.siteName}
          {current.nextShift ? ` (next shift ${current.nextShift})` : " (no shift scheduled yet)"}
          {current.at && ` · marked ${formatDate(current.at)}${current.by ? ` by ${current.by}` : ""}`}
          {current.tip && ` · tip: ${current.tip}`}
        </span>
        <form action={clearNotResponding}>
          <input type="hidden" name="clientId" value={clientId} />
          <button className="text-stone-600 underline hover:text-stone-900">They responded</button>
        </form>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className={smallButtonClass} title="Ask the clinical team to look for this client at their outreach site">
          Don&apos;t respond
        </button>
      </div>
    );
  }

  const suggested = sites.find((s) => s.id === suggestedSiteId);
  return (
    <form action={action} className="mt-2 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-2 text-xs">
      <p className="font-medium text-stone-800">Ask the clinical team to look for them</p>
      {sites.length === 0 ? (
        <p className="text-stone-600">No outreach shifts are on the schedule yet. Ask your supervisor to add one.</p>
      ) : (
        <>
          <select name="siteId" required defaultValue={suggested?.id ?? ""} aria-label="Site" className="w-full rounded border border-stone-300 bg-white px-2 py-1">
            <option value="" disabled>Pick a site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-stone-500">
            {suggested ? "Filled in from where they were last seen." : lastPlace ? `Last seen at “${lastPlace}”. Pick the closest site.` : "Pick the site where they usually are."}
          </p>
          <input name="tip" maxLength={500} aria-label="Tip" placeholder="Tip to help find them (optional, no health details)" className="w-full rounded border border-stone-300 bg-white px-2 py-1" />
          {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
        </>
      )}
      <div className="flex gap-2">
        {sites.length > 0 && (
          <button disabled={pending} className="rounded bg-amber-700 px-2 py-1 font-medium text-white hover:bg-amber-800">Send to clinical team</button>
        )}
        <button type="button" onClick={() => setOpen(false)} className={smallButtonClass}>Cancel</button>
      </div>
    </form>
  );
}
