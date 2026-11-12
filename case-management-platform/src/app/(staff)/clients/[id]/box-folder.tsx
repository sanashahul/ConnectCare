"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { buttonClass, ErrorText, formatDate, inputClass, secondaryButtonClass, smallButtonClass } from "@/components/ui";
import { confirmHealthInBox, setBoxFolder } from "../actions";

/**
 * The client's Box folder: optional. Most clients don't need one. When a client does, staff
 * make a folder in Stanford Box named with the client ID, share it with the people working
 * the case, and paste the link here.
 */
export function BoxFolder({ clientId, clientCode, url, confirmed, healthLeft, boxMode }: {
  clientId: string;
  clientCode: string;
  url: string | null;
  /** Who confirmed this client's HIPAA information is in Box, and when. */
  confirmed: { by?: string; at?: string } | null;
  /** Profile health answers still filled in. */
  healthLeft: string[];
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
          {url && !confirmed && <p className="text-xs text-stone-500">To remove the link, clear the box and save.</p>}
        </form>
      )}

      {url && !boxMode && (confirmed ? (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sky-950">
          HIPAA information for this client is kept in Box.{" "}
          <span className="text-sky-800">
            Confirmed{confirmed.by ? ` by ${confirmed.by}` : ""}{confirmed.at ? ` on ${formatDate(confirmed.at)}` : ""}.
          </span>
        </p>
      ) : (
        <ConfirmHealthInBox clientId={clientId} healthLeft={healthLeft} />
      ))}
    </div>
  );
}

/** The case manager moves and deletes the information themselves; this only records that they did. */
function ConfirmHealthInBox({ clientId, healthLeft }: { clientId: string; healthLeft: string[] }) {
  const [state, action, pending] = useActionState(confirmHealthInBox, undefined);
  return (
    <details className="rounded-md border border-stone-200 px-3 py-2">
      <summary className="cursor-pointer font-medium text-brand-700">Confirm HIPAA information is in Box</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="clientId" value={clientId} />
        <p className="text-stone-700">Before you confirm, do these yourself:</p>
        <ol className="list-decimal space-y-1 pl-5 text-stone-700">
          <li>Copy this client&apos;s HIPAA information into the Box folder.</li>
          <li>
            Delete it from this app: the profile (<Link href={`/clients/${clientId}/edit`} className="text-brand-700 underline">Edit profile</Link>),
            contact log notes, care plan steps, and messages.
          </li>
        </ol>
        <p>
          <Link href="/help/hipaa" target="_blank" className="text-brand-700 underline">What counts as HIPAA information?</Link>
        </p>
        {healthLeft.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-950">
            The profile still has: <strong>{healthLeft.join(", ")}</strong>. Clear these in Edit profile first.
          </p>
        )}
        <label className="flex items-start gap-2">
          <input type="checkbox" name="confirmed" required className="mt-1" />
          <span>I moved all HIPAA information for this client into the Box folder and deleted it from this app.</span>
        </label>
        <ErrorText>{state?.error}</ErrorText>
        <button className={secondaryButtonClass} disabled={pending}>{pending ? "Saving…" : "Confirm"}</button>
      </form>
    </details>
  );
}
