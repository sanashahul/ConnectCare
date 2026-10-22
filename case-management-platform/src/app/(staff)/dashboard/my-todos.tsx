"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Badge, buttonClass, ErrorText, formatDate, inputClass } from "@/components/ui";
import type { TodoItem } from "@/lib/todos";
import { addTask, completeTodo } from "./todo-actions";

/** Tasks the person wrote for themselves (optionally about a client), with a quick add form. */
export function MyTodos({ items: initial, clients, today, readOnly = false }: {
  items: TodoItem[];
  clients: { id: string; name: string }[];
  today: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  function done(key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    start(async () => {
      await completeTodo(key);
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-stone-600">{readOnly ? "None." : "Nothing here. Add reminders for yourself below."}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((t) => (
            <li key={t.key} className="flex items-start gap-2 text-sm">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => done(t.key)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-400 hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:border-stone-400 disabled:hover:bg-transparent"
                aria-label={`Done: ${t.text}`}
              />
              <span className="min-w-0 flex-1">
                <span className="text-stone-900">{t.text}</span>
                <span className="ml-1 inline-flex flex-wrap gap-1 align-middle text-xs">
                  {t.clientId && (
                    <Link href={`/clients/${t.clientId}`} className="text-brand-700 underline">{t.clientName ?? t.clientCode}</Link>
                  )}
                  {t.dueDate &&
                    (t.dueDate < today ? <Badge tone="red">Overdue</Badge> : t.dueDate === today ? <Badge tone="amber">Today</Badge> : <span className="text-stone-500">{formatDate(t.dueDate)}</span>)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && <AddTaskForm clients={clients} />}
    </div>
  );
}

export function AddTaskForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addTask, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2 rounded-md bg-stone-50 p-2">
      <label className="sr-only" htmlFor="task-text">New to-do</label>
      <input id="task-text" name="text" required maxLength={500} className={inputClass} placeholder="Add a to-do, e.g. Call Here4You" />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="task-due">Due</label>
        <input id="task-due" name="dueDate" type="date" className={`${inputClass} w-auto flex-1`} />
        {clients.length > 0 && (
          <>
            <label className="sr-only" htmlFor="task-client">Client</label>
            <select id="task-client" name="clientId" className={`${inputClass} w-auto flex-1`}>
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        <button className={buttonClass} disabled={pending}>Add</button>
      </div>
      <ErrorText>{state?.error}</ErrorText>
    </form>
  );
}
