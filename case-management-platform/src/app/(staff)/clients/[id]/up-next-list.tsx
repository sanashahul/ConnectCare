"use client";

import { useEffect, useState, useTransition } from "react";
import { FOCUS_COUNT } from "@/lib/plan-order";
import { reorderUpNext } from "../actions";

/**
 * Up next in the case manager's order. Drag a step by its handle, or use ↑ ↓ (easier on phones).
 * The first few are the focus; the rest sit under "Later" until opened. The order is saved and
 * the top step is what the Home Task list shows for this client.
 */
export function UpNextList({ clientId, items }: { clientId: string; items: { id: string; node: React.ReactNode }[] }) {
  const ids = items.map((i) => i.id).join(",");
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [showLater, setShowLater] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  // Steps added, finished or reset on the server replace the local order.
  useEffect(() => setOrder(ids ? ids.split(",") : []), [ids]);

  const node = new Map(items.map((i) => [i.id, i.node]));
  const save = (next: string[]) => {
    setOrder(next);
    start(async () => {
      await reorderUpNext(clientId, next);
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    if (to >= FOCUS_COUNT) setShowLater(true);
    save(next);
  };

  const later = Math.max(0, order.length - FOCUS_COUNT);
  const visible = showLater ? order : order.slice(0, FOCUS_COUNT);

  return (
    <ol className="space-y-2" aria-label="Up next, in order">
      {visible.map((id, index) => (
        <li key={id}>
          {index === FOCUS_COUNT && (
            <p className="mb-2 mt-3 border-t border-dashed border-stone-300 pt-2 text-xs font-medium text-stone-500">Later</p>
          )}
          <div
            draggable
            onDragStart={(e) => {
              setDragging(id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) move(order.indexOf(dragging), index);
              setDragging(null);
            }}
            className={`flex items-stretch gap-2 rounded-md ${dragging === id ? "opacity-50" : ""}`}
          >
            <div className="flex w-7 shrink-0 flex-col items-center justify-center gap-1 text-stone-500">
              <span className="cursor-grab select-none text-lg leading-none" title="Drag to reorder" aria-hidden>
                ⠿
              </span>
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="rounded px-1 text-xs hover:bg-stone-100 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === order.length - 1}
                className="rounded px-1 text-xs hover:bg-stone-100 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1">{node.get(id)}</div>
          </div>
        </li>
      ))}
      {later > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setShowLater((v) => !v)}
            className="w-full rounded-md border border-dashed border-stone-300 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            {showLater ? "Hide later steps" : `Later (${later}). Focus on the ${Math.min(FOCUS_COUNT, order.length)} above first.`}
          </button>
        </li>
      )}
    </ol>
  );
}
