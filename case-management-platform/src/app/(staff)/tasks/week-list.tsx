"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import { NEXT_STATUS } from "@/lib/plan-order";
import { PRIORITIES, type Priority } from "@/lib/priorities";
import type { TodoItem } from "@/lib/todos";
import { completeTodo, setPlanStatus, setTodoPriority } from "../dashboard/todo-actions";

type Group = { key: string; title: string; open: boolean; items: TodoItem[] };

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Splits items by when they're due. Undated and later items start closed. */
export function groupByWeek(items: TodoItem[], today: string): Group[] {
  const weekEnd = addDays(today, 7);
  const groups: Group[] = [
    { key: "overdue", title: "Overdue", open: true, items: [] },
    { key: "today", title: "Today", open: true, items: [] },
    { key: "week", title: "This week", open: true, items: [] },
    { key: "later", title: "Later", open: false, items: [] },
    { key: "none", title: "No date", open: false, items: [] },
  ];
  const pick = (i: TodoItem) =>
    !i.dueDate ? 4 : i.dueDate < today ? 0 : i.dueDate === today ? 1 : i.dueDate <= weekEnd ? 2 : 3;
  for (const i of [...items].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))) groups[pick(i)].items.push(i);
  return groups;
}

const KIND_LABEL: Record<TodoItem["kind"], string> = { plan: "Plan step", followup: "Follow-up", task: "To-do" };
const STATUS_LABEL = { todo: "To do", referred: "Waiting to hear back", connected: "Connected" } as const;

/** Everything open, by when it's due. Read-only when a supervisor looks at a case manager's list. */
export function WeekList({ items: initial, today, readOnly = false }: { items: TodoItem[]; today: string; readOnly?: boolean }) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  if (items.length === 0) return <EmptyState>Nothing open. Nice work.</EmptyState>;

  function finish(item: TodoItem) {
    const next = item.kind === "plan" && item.status ? NEXT_STATUS[item.status] : undefined;
    if (next && next.status !== "done") {
      setItems((list) => list.map((i) => (i.key === item.key ? { ...i, status: next.status as TodoItem["status"] } : i)));
    } else {
      setItems((list) => list.filter((i) => i.key !== item.key));
    }
    start(async () => {
      if (next) await setPlanStatus(item.key, next.status as "referred" | "connected" | "done");
      else await completeTodo(item.key);
    });
  }

  function prioritize(item: TodoItem, priority: Priority) {
    setItems((list) => list.map((i) => (i.key === item.key ? { ...i, priority } : i)));
    start(async () => {
      await setTodoPriority(item.key, priority);
    });
  }

  return (
    <div className="space-y-4">
      {groupByWeek(items, today).map((g) =>
        g.items.length === 0 ? null : (
          <details key={g.key} open={g.open} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-stone-900">
              <span className="inline-block w-3 text-stone-500 transition group-open:rotate-90">▸</span>
              {g.title} <span className="font-normal text-stone-500">({g.items.length})</span>
            </summary>
            <ul className="ml-5 mt-2 divide-y divide-stone-100 rounded-md border border-stone-200">
              {g.items.map((item) => {
                const next = item.kind === "plan" && item.status ? NEXT_STATUS[item.status] : undefined;
                return (
                  <li key={item.key} className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium text-stone-900">{item.text}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                        {item.clientId && (
                          <Link href={`/clients/${item.clientId}`} className="font-semibold text-brand-700 underline">{item.clientName ?? item.clientCode}</Link>
                        )}
                        <span>
                          {KIND_LABEL[item.kind]}
                          {item.kind === "plan" && item.status ? `: ${STATUS_LABEL[item.status]}` : ""}
                        </span>
                        {item.dueDate && g.key !== "today" && <span>{g.key === "overdue" ? "Was due" : "Due"} {formatDate(item.dueDate)}</span>}
                        {item.priority === "urgent" && <Badge tone="red">Urgent</Badge>}
                        {item.priority === "high" && <Badge tone="amber">High</Badge>}
                      </div>
                    </div>
                    {!readOnly && (
                      <>
                        <label className="sr-only" htmlFor={`prio-${item.key}`}>Priority</label>
                        <select
                          id={`prio-${item.key}`}
                          value={item.priority}
                          onChange={(e) => prioritize(item, e.target.value as Priority)}
                          className="rounded border border-stone-300 px-1 py-1 text-xs text-stone-700"
                        >
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => finish(item)}
                          className="shrink-0 rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          {next?.label ?? "✓ Done"}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ),
      )}
    </div>
  );
}
