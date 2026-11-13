"use client";

import { useActionState, useState } from "react";
import { ErrorText, formatDate, smallButtonClass } from "@/components/ui";
import { clearNotResponding, markNotResponding } from "../actions";

/**
 * The case manager's "Don't respond" button. The site is filled in from where the client was
 * last seen; the clinical manager on that site's next shift gets them on their list.
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
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">Not responding · clinical team looking at {current.siteName}</p>
            <p className="text-amber-900">
              Marked {formatDate(current.at)}{current.by && ` by ${current.by}`}.{" "}
              {current.nextShift ? `Next shift there: ${current.nextShift}.` : "No shift scheduled there yet."}
            </p>
            {current.tip && <p className="mt-1">Tip for the clinical manager: {current.tip}</p>}
          </div>
          <form action={clearNotResponding}>
            <input type="hidden" name="clientId" value={clientId} />
            <button className={smallButtonClass}>They responded</button>
          </form>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-50">
        Don&apos;t respond
      </button>
    );
  }

  const suggested = sites.find((s) => s.id === suggestedSiteId);
  return (
    <form action={action} className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-950">Ask the clinical team to look for this client</p>
      {sites.length === 0 ? (
        <p className="text-amber-900">No outreach sites are set up yet. Ask your supervisor to add the shift schedule under Sites &amp; shifts.</p>
      ) : (
        <>
          <label className="block">
            <span className="text-stone-700">Site where they were last seen</span>
            <select name="siteId" required defaultValue={suggested?.id ?? ""} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1">
              <option value="" disabled>Pick a site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-stone-600">
              {suggested
                ? `Filled in from where they were last seen${lastPlace ? ` (“${lastPlace}”)` : ""}.`
                : lastPlace
                  ? `Last seen at “${lastPlace}”, which isn't one of the sites. Pick the closest one.`
                  : "No place last seen on record. Pick the site where they usually are."}
            </span>
          </label>
          <label className="block">
            <span className="text-stone-700">Tip to help find them (optional)</span>
            <input name="tip" maxLength={500} placeholder="e.g. usually by the side entrance, has a gray dog" className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1" />
            <span className="mt-1 block text-xs text-stone-600">The clinical manager sees this, their first name and last initial, and where they were last seen. No health details.</span>
          </label>
          <ErrorText>{state?.error}</ErrorText>
          <div className="flex gap-2">
            <button disabled={pending} className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800">Mark as not responding</button>
            <button type="button" onClick={() => setOpen(false)} className={smallButtonClass}>Cancel</button>
          </div>
        </>
      )}
    </form>
  );
}
