"use client";

import { useState } from "react";
import { smallButtonClass } from "@/components/ui";

export type PrintEntry = {
  key: string;
  need: string;
  needLabel: string;
  step?: string;
  name?: string;
  description?: string;
  eligibility?: string;
  phones: { label: string; number: string }[];
  contact?: string;
  address?: string;
  hours?: string;
  web?: string;
  defaultChecked: boolean;
  disabled?: boolean;
  /** Shown on screen only, never printed. */
  note?: string;
};

export function PrintSheet({ title, prepared, clientCode, hotlines, entries }: {
  title: string;
  prepared: string;
  clientCode: string;
  hotlines: { number: string; label: string }[];
  entries: PrintEntry[];
}) {
  const [checked, setChecked] = useState(() => new Set(entries.filter((e) => e.defaultChecked && !e.disabled).map((e) => e.key)));
  const toggle = (key: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const selectable = entries.filter((e) => !e.disabled);
  const needs = [...new Set(entries.map((e) => e.need))];

  return (
    <>
      <div className="no-print mx-auto mb-3 flex max-w-[8.5in] flex-wrap items-center gap-2 text-sm text-stone-700">
        <span>
          <strong>{entries.filter((e) => checked.has(e.key)).length}</strong> of {selectable.length} on the printout. Untick anything you don&apos;t want printed.
        </span>
        <button type="button" className={smallButtonClass} onClick={() => setChecked(new Set(selectable.map((e) => e.key)))}>Select all</button>
        <button type="button" className={smallButtonClass} onClick={() => setChecked(new Set())}>Select none</button>
      </div>

      <article className="mx-auto max-w-[8.5in] bg-white p-8 text-[13px] leading-snug text-black shadow-sm print:p-0 print:shadow-none">
        <header className="mb-3 border-b border-black pb-2">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs">{prepared}</p>
          <p className="text-xs">Your client ID: <strong className="font-mono">{clientCode}</strong> (mention it when you contact the outreach team)</p>
        </header>
        <section className="mb-3 grid grid-cols-2 gap-2 rounded border border-black p-2 sm:grid-cols-5">
          <div><p className="font-bold">911</p><p className="text-xs">Emergency</p></div>
          {hotlines.map((h) => (
            <div key={h.number}><p className="font-bold">{h.number}</p><p className="text-xs">{h.label}</p></div>
          ))}
        </section>

        {entries.length === 0 && (
          <p className="no-print text-stone-500">Nothing in the care plan yet. Add steps on the client page, or switch to &quot;Top directory matches&quot;.</p>
        )}

        {needs.map((need) => {
          const list = entries.filter((e) => e.need === need);
          const anyChecked = list.some((e) => checked.has(e.key));
          return (
            <section key={need} className={`mb-3 break-inside-avoid ${anyChecked ? "" : "print:hidden"}`}>
              <h2 className="mb-1 border-b border-stone-400 text-sm font-bold uppercase tracking-wide">{list[0].needLabel}</h2>
              <ul className="space-y-2">
                {list.map((e) => {
                  const on = checked.has(e.key);
                  return (
                    <li key={e.key} className={`flex gap-2 break-inside-avoid ${on ? "" : "opacity-40 print:hidden"}`}>
                      <input
                        type="checkbox"
                        className="no-print mt-1 h-4 w-4 shrink-0"
                        checked={on}
                        disabled={e.disabled}
                        onChange={() => toggle(e.key)}
                        aria-label={`Include ${e.name ?? e.step} on the printout`}
                      />
                      <div className="grid flex-1 grid-cols-5 gap-3">
                        <div className={e.name ? "col-span-3" : "col-span-5"}>
                          {e.name && <p className="font-bold">{e.name}</p>}
                          {e.step && <p className={e.name ? "italic" : "font-bold"}>{e.name ? `Next step: ${e.step}` : e.step}</p>}
                          {e.description && <p>{e.description}</p>}
                          {e.eligibility && <p className="text-xs">Who: {e.eligibility}</p>}
                          {e.note && <p className="no-print text-xs text-amber-800">{e.note}</p>}
                        </div>
                        {e.name && (
                          <div className="col-span-2 text-xs">
                            {e.phones.map((p, j) => (
                              <p key={j}><strong>{p.label && p.label !== "Main" ? `${p.label}: ` : "Call: "}</strong>{p.number}</p>
                            ))}
                            {e.contact && <p>{e.contact}</p>}
                            {e.address && <p>{e.address}</p>}
                            {e.hours && <p>{e.hours}</p>}
                            {e.web && <p>{e.web}</p>}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <footer className="mt-4 border-t border-stone-400 pt-1 text-[10px]">
          Any service, 24 hours: call 211. Information checked by the outreach team; programs can change without notice.
        </footer>
      </article>
    </>
  );
}
