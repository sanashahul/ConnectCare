"use client";

import { useState } from "react";

export type PlanTab = { key: string; label: string; count: number; hint: string; content: React.ReactNode };

/** A row of buttons (Up next, Waiting, Connected, Done); tapping one shows just those steps. */
export function PlanTabs({ tabs, initial }: { tabs: PlanTab[]; initial: string }) {
  const [current, setCurrent] = useState(initial);
  const tab = tabs.find((t) => t.key === current) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label="Care plan steps" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = t.key === tab.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`plan-tab-${t.key}`}
              aria-selected={selected}
              aria-controls="plan-tab-panel"
              onClick={() => setCurrent(t.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : t.count
                    ? "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                    : "border-stone-200 bg-white text-stone-400 hover:bg-stone-50"
              }`}
            >
              {t.label} <span className={selected ? "text-white/80" : "text-stone-500"}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="plan-tab-panel" aria-labelledby={`plan-tab-${tab.key}`} className="mt-3">
        {tab.hint && <p className="mb-2 text-xs text-stone-500">{tab.hint}</p>}
        {tab.count === 0 ? <p className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-600">Nothing here right now.</p> : tab.content}
      </div>
    </div>
  );
}
