"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Badge, buttonClass, EmptyState, ErrorText, formatDate, inputClass } from "@/components/ui";
import { PRIORITIES, type Priority } from "@/lib/priorities";
import type { TodoItem } from "@/lib/todos";
import { addTask, completeTodo, deleteTask, saveTodoOrder, setPlanStatus, setTodoPriority } from "./todo-actions";

const KIND_LABEL = { task: "My task", plan: "Plan step", followup: "Follow-up" } as const;

const STEPS = [
  { key: "todo", label: "To do" },
  { key: "referred", label: "Referred" },
  { key: "connected", label: "Connected" },
  { key: "done", label: "Done" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

/** To do → Referred → Connected → Done. Clicking a step sets it; Done takes the item off the list. */
function StatusSteps({ status, onChange, readOnly }: { status: StepKey; onChange: (s: StepKey) => void; readOnly?: boolean }) {
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <div role="group" aria-label="Status" className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
      {STEPS.map((s, i) => {
        const reached = i <= current;
        const cls = `rounded-full border px-2 py-0.5 font-medium ${
          i === current ? "border-emerald-700 bg-emerald-700 text-white" : reached ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-500"
        }`;
        return (
          <span key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-stone-300" aria-hidden>→</span>}
            {readOnly ? (
              <span className={cls} aria-current={i === current ? "step" : undefined}>{s.label}</span>
            ) : (
              <button type="button" className={`${cls} hover:border-emerald-600`} aria-pressed={i === current} onClick={() => onChange(s.key)}>
                {s.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

const PRIORITY_STYLE: Record<Priority, { label: string; header: string; border: string; on: string }> = {
  urgent: { label: "Urgent", header: "bg-red-600 text-white", border: "border-l-red-600", on: "bg-red-600 text-white border-red-600" },
  high: { label: "High", header: "bg-orange-500 text-white", border: "border-l-orange-500", on: "bg-orange-500 text-white border-orange-500" },
  medium: { label: "Medium", header: "bg-sky-600 text-white", border: "border-l-sky-600", on: "bg-sky-600 text-white border-sky-600" },
};

export function TodoList({ items: initial, clients, today, readOnly = false }: {
  items: TodoItem[];
  clients: { id: string; name: string }[];
  today: string;
  /** Supervisor viewing someone else's list: shows their priorities and order, no changes. */
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  const saveOrder = (list: TodoItem[]) =>
    start(async () => {
      await saveTodoOrder(list.map((i) => i.key));
    });

  /** Moves an item to another spot within its own priority group. */
  function move(key: string, toKey: string) {
    const from = items.findIndex((i) => i.key === key);
    const to = items.findIndex((i) => i.key === toKey);
    if (from < 0 || to < 0 || from === to || items[from].priority !== items[to].priority) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
    saveOrder(next);
  }

  function changePriority(key: string, priority: Priority) {
    // Put it at the end of its new group.
    const it = items.find((i) => i.key === key);
    if (!it || it.priority === priority) return;
    const rest = items.filter((i) => i.key !== key);
    const lastOfGroup = rest.map((i) => PRIORITIES.indexOf(i.priority)).lastIndexOf(PRIORITIES.indexOf(priority));
    const insertAt = lastOfGroup >= 0 ? lastOfGroup + 1 : rest.findIndex((i) => PRIORITIES.indexOf(i.priority) > PRIORITIES.indexOf(priority));
    const next = [...rest];
    next.splice(insertAt < 0 ? next.length : insertAt, 0, { ...it, priority });
    setItems(next);
    start(async () => {
      await setTodoPriority(key, priority);
      await saveTodoOrder(next.map((i) => i.key));
    });
  }

  function changeStatus(key: string, status: StepKey) {
    if (status === "done") setItems((list) => list.filter((i) => i.key !== key));
    else setItems((list) => list.map((i) => (i.key === key ? { ...i, status } : i)));
    start(async () => {
      await setPlanStatus(key, status);
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
        <EmptyState>{readOnly ? "Nothing on this list right now." : "Nothing on your list. Add a task below, or add plan steps and follow-up dates on your clients."}</EmptyState>
      ) : (
        <>
          {!readOnly && (
            <p className="text-xs text-stone-500">
              Set each item to <strong>Urgent</strong>, <strong>High</strong>, or <strong>Medium</strong>. Within a group, drag (or use ↑ ↓) to change the order.
              Move plan steps along <strong>To do → Referred → Connected → Done</strong>. Tick to mark done.
            </p>
          )}
          {PRIORITIES.map((p) => {
            const group = items.filter((i) => i.priority === p);
            if (group.length === 0) return null;
            const style = PRIORITY_STYLE[p];
            return (
              <section key={p} aria-label={`${style.label} priority`}>
                <h3 className={`inline-flex items-center gap-2 rounded-t-md px-3 py-1 text-sm font-bold uppercase tracking-wide ${style.header}`}>
                  {style.label} <span className="rounded-full bg-white/25 px-1.5 text-xs">{group.length}</span>
                </h3>
                <ol className="divide-y divide-stone-100 rounded-b-md rounded-tr-md border border-stone-200">
                  {group.map((item, gi) => {
                    const overdue = item.dueDate && item.dueDate < today;
                    return (
                      <li
                        key={item.key}
                        draggable={!readOnly}
                        onDragStart={() => setDragging(item.key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragging) move(dragging, item.key);
                          setDragging(null);
                        }}
                        onDragEnd={() => setDragging(null)}
                        className={`flex flex-wrap items-start gap-3 border-l-4 bg-white px-3 py-2.5 ${style.border} ${dragging === item.key ? "opacity-50" : ""}`}
                      >
                        {readOnly ? (
                          <span className="mt-0.5 w-5 text-right text-sm font-semibold text-stone-500">{gi + 1}</span>
                        ) : (
                          <>
                            <span className="mt-1 cursor-grab select-none text-stone-400" aria-hidden title="Drag to reorder">⋮⋮</span>
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              aria-label={`Mark done: ${item.text}`}
                              onChange={() => complete(item.key)}
                            />
                          </>
                        )}
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium text-stone-900">{item.text}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                            <Badge tone={item.kind === "task" ? "gray" : item.kind === "plan" ? "brand" : "blue"}>{KIND_LABEL[item.kind]}</Badge>
                            {item.clientId && (
                              <Link href={`/clients/${item.clientId}`} className="font-semibold text-brand-700 underline">
                                {item.clientName ?? item.clientCode}
                              </Link>
                            )}
                            {item.need && <span>{item.need}</span>}
                            {item.dueDate && (
                              <span className={overdue ? "font-semibold text-red-700" : ""}>{overdue ? "Overdue: " : "Due "}{formatDate(item.dueDate)}</span>
                            )}
                          </div>
                          {item.kind === "plan" && item.status && (
                            <StatusSteps status={item.status} readOnly={readOnly} onChange={(s) => changeStatus(item.key, s)} />
                          )}
                        </div>
                        {readOnly ? null : <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <div role="group" aria-label="Priority" className="flex overflow-hidden rounded-md border border-stone-300 text-xs">
                            {PRIORITIES.map((p2) => (
                              <button
                                key={p2}
                                type="button"
                                onClick={() => changePriority(item.key, p2)}
                                aria-pressed={item.priority === p2}
                                className={`border-l border-stone-300 px-2 py-1 font-medium first:border-l-0 ${item.priority === p2 ? PRIORITY_STYLE[p2].on : "bg-white text-stone-600 hover:bg-stone-50"}`}
                              >
                                {PRIORITY_STYLE[p2].label}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => gi > 0 && move(item.key, group[gi - 1].key)} disabled={gi === 0} className="rounded px-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Move up">↑</button>
                          <button type="button" onClick={() => gi < group.length - 1 && move(item.key, group[gi + 1].key)} disabled={gi === group.length - 1} className="rounded px-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30" aria-label="Move down">↓</button>
                          {item.kind === "task" && (
                            <button type="button" onClick={() => remove(item.key)} className="rounded px-1.5 text-xs text-stone-400 hover:bg-stone-100" aria-label="Delete task">✕</button>
                          )}
                        </div>}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </>
      )}
      {!readOnly && <AddTaskForm clients={clients} />}
    </div>
  );
}

function AddTaskForm({ clients }: { clients: { id: string; name: string }[] }) {
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
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <button className={buttonClass} disabled={pending}>Add</button>
      <div className="w-full"><ErrorText>{state?.error}</ErrorText></div>
    </form>
  );
}
