"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import type { TodoItem } from "@/lib/todos";
import { completeTodo } from "./todo-actions";

/** The few things to do today: overdue, due today, or Urgent. One tap to finish. */
export function TodayList({ items: initial, more, today }: { items: TodoItem[]; more: number; today: string }) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  function done(key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    start(async () => {
      await completeTodo(key);
    });
  }

  if (items.length === 0) {
    return <EmptyState>Nothing overdue, due today, or urgent. Nice work.</EmptyState>;
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
        {items.map((item) => {
          const overdue = item.dueDate && item.dueDate < today;
          return (
            <li key={item.key} className="flex items-center gap-3 bg-white px-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-stone-900">{item.text}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                  {item.clientId && (
                    <Link href={`/clients/${item.clientId}`} className="font-semibold text-brand-700 underline">{item.clientName ?? item.clientCode}</Link>
                  )}
                  {overdue ? (
                    <Badge tone="red">Overdue · {formatDate(item.dueDate)}</Badge>
                  ) : item.dueDate === today ? (
                    <Badge tone="amber">Due today</Badge>
                  ) : null}
                  {item.priority === "urgent" && <Badge tone="red">Urgent</Badge>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => done(item.key)}
                className="shrink-0 rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                aria-label={`Mark done: ${item.text}`}
              >
                ✓ Done
              </button>
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <p className="text-sm"><Link href="/tasks" className="text-brand-700 underline">{more} more for today in All tasks →</Link></p>
      )}
    </div>
  );
}
