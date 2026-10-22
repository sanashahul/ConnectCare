"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import { TASK_LIST_SHOWN, type TaskLine } from "@/lib/task-list";
import { setPlanStatus } from "./todo-actions";

const actionClass = "shrink-0 rounded-md border px-3 py-1.5 text-sm font-semibold";

/**
 * One line per client: the top of their Up next (as the case manager arranged it). Read-only for a
 * supervisor looking at someone else's Home, with a message link instead of the action button.
 */
export function TaskList({ lines, today, readOnly = false }: { lines: TaskLine[]; today: string; readOnly?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (lines.length === 0) return <EmptyState>No clients yet. New guests appear here once they are assigned.</EmptyState>;
  const shown = showAll ? lines : lines.slice(0, TASK_LIST_SHOWN);

  function advance(line: TaskLine) {
    if (!line.stepId || !line.advance) return;
    setBusy(line.clientId);
    start(async () => {
      await setPlanStatus(`plan:${line.stepId}`, line.advance!.status as "referred" | "connected" | "done");
      setBusy(null);
    });
  }

  return (
    <div className="space-y-2">
      <ol className="divide-y divide-stone-100 rounded-md border border-stone-200">
        {shown.map((line) => {
          const overdueStep = line.dueDate && line.dueDate < today;
          return (
            <li key={line.clientId} className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className={`font-medium ${line.kind === "choose" ? "text-stone-600" : "text-stone-900"}`}>{line.text}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/clients/${line.clientId}`} className="font-semibold text-brand-700 underline">{line.clientName}</Link>
                  {line.overdue > 0 && <Badge tone="red">{line.overdue} overdue</Badge>}
                  {line.dueToday && <Badge tone="amber">Due today</Badge>}
                  {line.urgent && <Badge tone="red">Urgent</Badge>}
                  {line.notReached !== null && <Badge tone="amber">Not reached in {line.notReached} days</Badge>}
                  {line.kind === "first_contact" && <Badge tone="blue">New to you</Badge>}
                  {line.dueDate && !overdueStep && <span className="text-stone-500">Due {formatDate(line.dueDate)}</span>}
                </div>
              </div>
              {readOnly ? (
                <Link href={`/messages/new?client=${line.clientId}`} className={`${actionClass} border-stone-300 text-stone-700 hover:bg-stone-50`}>
                  Message about this
                </Link>
              ) : line.kind === "step" && line.advance ? (
                <button
                  type="button"
                  onClick={() => advance(line)}
                  disabled={pending && busy === line.clientId}
                  className={`${actionClass} border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50`}
                >
                  {pending && busy === line.clientId ? "Saving…" : line.advance.label}
                </button>
              ) : line.kind === "choose" ? (
                <Link href={`/clients/${line.clientId}#add-step`} className={`${actionClass} border-stone-300 text-stone-700 hover:bg-stone-50`}>
                  Add a step
                </Link>
              ) : (
                <Link href={`/clients/${line.clientId}?log=1#log`} className={`${actionClass} border-brand-600 text-brand-700 hover:bg-brand-50`}>
                  Log contact
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {lines.length > TASK_LIST_SHOWN && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-brand-700 underline">
          {showAll ? "Show fewer" : `Show ${lines.length - TASK_LIST_SHOWN} more`}
        </button>
      )}
    </div>
  );
}
