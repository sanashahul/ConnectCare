"use client";

import { useActionState, useState } from "react";
import { buttonClass, ErrorText, inputClass, secondaryButtonClass, smallButtonClass } from "@/components/ui";
import { moveHealthToBox, setBoxFolder } from "../actions";

/**
 * The client's Box folder: optional. Most clients don't need one. When a client does, staff
 * make a folder in Stanford Box named with the client ID, share it with the people working
 * the case, and paste the link here.
 */
export function BoxFolder({ clientId, clientCode, url, healthInBox, hasHealthDetails, boxMode }: {
  clientId: string;
  clientCode: string;
  url: string | null;
  healthInBox: boolean;
  hasHealthDetails: boolean;
  /** PHI_IN_BOX is on: every client's identifying details are kept in Box. */
  boxMode: boolean;
}) {
  const [editing, setEditing] = useState(!url);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof setBoxFolder>[1], form: FormData) => {
      const result = await setBoxFolder(clientId, prev, form);
      if (result?.ok) setEditing(false);
      return result;
    },
    undefined,
  );

  return (
    <div className="space-y-3 text-sm">
      {url && !editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open in Box ↗</a>
          <button type="button" onClick={() => setEditing(true)} className="text-brand-700 underline">Change link</button>
        </div>
      ) : (
        <form action={action} className="space-y-2">
          {!url && (
            <p className="text-stone-600">
              {boxMode
                ? "Names, contact details, and health details for every client are kept in Box. "
                : "Optional. Use a Box folder when this client has health details or documents (IDs, records) to keep. "}
              In Stanford Box, make a folder named <span className="font-mono">{clientCode}</span>, share it with the people
              working this case, then paste the folder link here.
            </p>
          )}
          <input
            name="boxFolderUrl"
            type="url"
            inputMode="url"
            defaultValue={url ?? ""}
            placeholder="https://stanford.app.box.com/folder/…"
            aria-label="Box folder link"
            className={inputClass}
          />
          <ErrorText>{state?.error}</ErrorText>
          <div className="flex flex-wrap gap-2">
            <button className={smallButtonClass} disabled={pending}>{pending ? "Saving…" : "Save link"}</button>
            {url && (
              <button type="button" onClick={() => setEditing(false)} className="text-stone-600 underline">Cancel</button>
            )}
          </div>
          {url && !healthInBox && <p className="text-xs text-stone-500">To remove the link, clear the box and save.</p>}
        </form>
      )}

      {url && !boxMode && (healthInBox ? (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sky-950">Health details for this client are kept in Box, not in this app.</p>
      ) : (
        <MoveHealth clientId={clientId} hasHealthDetails={hasHealthDetails} />
      ))}
    </div>
  );
}

function MoveHealth({ clientId, hasHealthDetails }: { clientId: string; hasHealthDetails: boolean }) {
  const [state, action, pending] = useActionState(moveHealthToBox, undefined);
  return (
    <details className="rounded-md border border-stone-200 px-3 py-2">
      <summary className="cursor-pointer font-medium text-brand-700">Move health details to Box</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="clientId" value={clientId} />
        <p className="text-stone-600">
          {hasHealthDetails
            ? "Copy what's under \"All details\" in the profile (disability, accommodations, insurance, PCP, LGBTQ+ care, urgent need, and additional information) into the Box folder first. This removes those details from the app for good, and they won't be asked for here again."
            : "There are no health details saved in the app for this client. This keeps them out of the app from now on."}
        </p>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="copied" required className="mt-1" />
          <span>I copied anything that needs keeping into the Box folder.</span>
        </label>
        <ErrorText>{state?.error}</ErrorText>
        <button className={secondaryButtonClass} disabled={pending}>{pending ? "Moving…" : "Remove from the app"}</button>
      </form>
    </details>
  );
}
