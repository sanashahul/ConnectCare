"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Badge, buttonClass, EmptyState, ErrorText, formatDate, inputClass } from "@/components/ui";
import type { TodoItem } from "@/lib/todos";
import { addTask, completeTodo, deleteTask, saveTodoOrder } from "./todo-actions";

const KIND_LABEL = { task: "My task", plan: "Plan step", followup: "Follow-up" } as const;

export function TodoList({ items: initial, clients, today }: {
  items: TodoItem[];
  clients: { id: string; code: string }[];
  today: string;
}) {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
    start(async () => {
      await saveTodoOrder(next.map((i) => i.key));
    });
  }

  function complete(key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    start(async () => {
      await completeTodo(key);
    });
  }

  function remove(key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    start(async () => {
      await deleteTask(key.slice("task:".length));
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState>Nothing on your list. Add a task below, or add plan steps and follow-up dates on your clients.</EmptyState>
      ) : (
        <>
          <p className="text-xs text-stone-500">Drag items (or use ↑ ↓) to put them in the order you want to work on them. Tick to mark done.</p>
          <ol className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {items.map((item, i) => {
              const overdue = item.dueDate && item.dueDate < today;
              return (
                <li
                  key={item.key}
                  draggable
                  onDragStart={() => setDragging(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragging !== null) move(dragging, i);
                    setDragging(null);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={`flex items-start gap-3 bg-white px-3 py-2.5 ${dragging === i ? "opacity-50" : ""}`}
                >
                  <span className="mt-1 cursor-grab select-none text-stone-400" aria-hidden title="Drag to reorder">⋮⋮</span>
                  <span className="mt-0.5 w-5 text-right text-sm font-semibold text-stone-500">{i + 1}</span>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    aria-label={`Mark done: ${item.text}`}
                    onChange={() => complete(item.key)}
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-stone-900">{item.text}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <Badge tone={item.kind === "task" ? "gray" : item.kind === "plan" ? "brand" : "blue"}>{KIND_LABEL[item.kind]}</Badge>
                      {item.need && <span>{item.need}</span>}
                      {item.clientId && (
                        <Link href={`/clients/${item.clientId}`} className="font-mono font-semibold text-brand-700 underline">
                          {item.clientCode}
                        </Link>
                      )}
                      {item.urgent && <Badge tone="red">Urgent</Badge>}
                      {item.dueDate && (
                        <span className={overdue ? "font-semibold text-red-700" : ""}>{overdue ? "Overdue: " : "Due "}{formatDate(item.dueDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="rounded px-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Move down">↓</button>
                    {item.kind === "task" && (
                      <button type="button" onClick={() => remove(item.key)} className="rounded px-1.5 text-xs text-stone-400 hover:bg-stone-100" aria-label="Delete task">✕</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <AddTaskForm clients={clients} />
    </div>
  );
}

function AddTaskForm({ clients }: { clients: { id: string; code: string }[] }) {
  const [state, action, pending] = useActionState(addTask, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-md bg-stone-50 p-3">
      <label className="min-w-56 flex-1 text-sm">
        <span className="mb-1 block font-medium text-stone-800">Add a task</span>
        <input name="text" required maxLength={500} className={inputClass} placeholder="e.g. Call Here4You about the bed list" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-stone-700">Due</span>
        <input name="dueDate" type="date" className={inputClass} />
      </label>
      {clients.length > 0 && (
        <label className="text-sm">
          <span className="mb-1 block text-stone-700">Client (optional)</span>
          <select name="clientId" className={inputClass}>
            <option value="">None</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </label>
      )}
      <button className={buttonClass} disabled={pending}>Add</button>
      <div className="w-full"><ErrorText>{state?.error}</ErrorText></div>
    </form>
  );
}
