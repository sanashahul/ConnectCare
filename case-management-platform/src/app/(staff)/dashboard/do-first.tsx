"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import type { DoFirstItem } from "@/lib/do-first";
import { completeTodo, setPlanStatus } from "./todo-actions";

const REASON: Record<DoFirstItem["reason"], (i: DoFirstItem) => { label: string; tone: "red" | "amber" | "blue" }> = {
  overdue: (i) => ({ label: `Overdue · ${formatDate(i.dueDate)}`, tone: "red" }),
  today: () => ({ label: "Due today", tone: "amber" }),
  urgent: () => ({ label: "Urgent", tone: "red" }),
  not_reached: (i) => ({ label: `Not reached in ${i.days} days`, tone: "amber" }),
  new: () => ({ label: "New to you", tone: "blue" }),
};

/** A few things to do first, at most one per client. */
export function DoFirst({ items: initial, more }: { items: DoFirstItem[]; more: number }) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  function act(item: DoFirstItem) {
    setItems((list) => list.filter((i) => i.key !== item.key));
    start(async () => {
      if (item.action === "advance" && item.advance) await setPlanStatus(item.key, item.advance.status as "referred" | "connected" | "done");
      else await completeTodo(item.key);
    });
  }

  if (items.length === 0) {
    return <EmptyState>Nothing urgent right now. Pick a client below to keep things moving.</EmptyState>;
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
        {items.map((item) => {
          const reason = REASON[item.reason](item);
          return (
            <li key={item.key} className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-stone-900">{item.text}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/clients/${item.clientId}`} className="font-semibold text-brand-700 underline">{item.clientName}</Link>
                  <Badge tone={reason.tone}>{reason.label}</Badge>
                </div>
              </div>
              {item.action === "log" ? (
                <Link
                  href={`/clients/${item.clientId}?log=1#log`}
                  className="shrink-0 rounded-md border border-brand-600 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Log contact
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => act(item)}
                  className="shrink-0 rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  aria-label={`${item.advance?.label ?? "Done"}: ${item.text}`}
                >
                  {item.advance?.label ?? "✓ Done"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <p className="text-sm text-stone-600">
          {more} more client{more === 1 ? " needs" : "s need"} attention. See your clients below.
        </p>
      )}
    </div>
  );
}
