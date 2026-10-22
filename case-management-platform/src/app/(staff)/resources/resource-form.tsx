"use client";

import { useActionState } from "react";
import { buttonClass, ErrorText, inputClass, labelClass } from "@/components/ui";
import { RESOURCE_CATEGORIES, type Resource } from "@/lib/resource-types";
import type { ResourceFormState } from "./actions";

export function ResourceForm({ action: serverAction, r }: {
  action: (s: ResourceFormState, f: FormData) => Promise<ResourceFormState>;
  r?: Resource;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={r?.name} className={inputClass} />
      </div>
      <fieldset>
        <legend className={labelClass}>Categories</legend>
        <div className="mt-1 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {RESOURCE_CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-center gap-1">
              <input type="checkbox" name="categories" value={c.key} defaultChecked={r?.categories.includes(c.key)} /> {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className={labelClass} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} required defaultValue={r?.description} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="county">County</label>
          <select id="county" name="county" defaultValue={r?.county ?? "Santa Clara"} className={inputClass}>
            <option>Santa Clara</option><option>San Mateo</option><option>Multi-county</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={r?.city ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={r?.address ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="phones">Phones (one per line, &quot;Label: number&quot;)</label>
          <textarea id="phones" name="phones" rows={3} className={inputClass}
            defaultValue={r?.phones.map((p) => (p.label && p.label !== "Main" ? `${p.label}: ${p.number}` : p.number)).join("\n")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="hours">Hours</label>
          <textarea id="hours" name="hours" rows={3} defaultValue={r?.hours ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="web">Website</label>
          <input id="web" name="web" defaultValue={r?.web ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="languages">Languages (comma separated)</label>
          <input id="languages" name="languages" defaultValue={r?.languages.join(", ")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="eligibility">Who it serves</label>
          <input id="eligibility" name="eligibility" defaultValue={r?.eligibility ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="notes">Notes</label>
          <input id="notes" name="notes" defaultValue={r?.notes ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="walkIn">Walk-in?</label>
          <select id="walkIn" name="walkIn" defaultValue={r?.walkIn === true ? "yes" : r?.walkIn === false ? "no" : ""} className={inputClass}>
            <option value="">Unknown</option><option value="yes">Yes</option><option value="no">No, call first or appointment</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="cost">Cost</label>
          <select id="cost" name="cost" defaultValue={r?.cost ?? ""} className={inputClass}>
            <option value="">Unknown</option><option value="free">Free</option><option value="sliding_scale">Sliding scale</option>
            <option value="low_cost">Low cost</option><option value="varies">Varies</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" name="acceptsMediCal" defaultChecked={!!r?.acceptsMediCal} /> Accepts Medi-Cal</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="isHotline" defaultChecked={!!r?.isHotline} /> Phone line (no walk-in location)</label>
        {r && r.conflicts.length > 0 && (
          <label className="flex items-center gap-1 text-amber-900"><input type="checkbox" name="clearConflicts" /> I confirmed the details; clear the &quot;guides disagree&quot; warning</label>
        )}
      </div>
      <p className="text-xs text-stone-500">Saving marks this resource as verified today.</p>
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Save resource"}</button>
    </form>
  );
}
