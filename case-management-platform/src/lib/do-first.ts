import { NEXT_STATUS, type PlanStatus } from "./plan-order";
import type { TodoItem } from "./todos";

// "Do these first" on a case manager's home page: a short list with at most one item per client,
// so one guest with many open steps doesn't crowd out everyone else.

export const DO_FIRST_MAX = 5;

export type DoFirstReason = "overdue" | "today" | "urgent" | "not_reached" | "new";
const RANK: Record<DoFirstReason, number> = { overdue: 0, today: 1, urgent: 2, not_reached: 3, new: 4 };

export type DoFirstItem = {
  key: string;
  clientId: string;
  clientName: string;
  text: string;
  reason: DoFirstReason;
  dueDate?: string;
  /** For not_reached: days since anyone met them. */
  days?: number;
  /** done = tick off; advance = move a plan step to its next status; log = open the contact log. */
  action: "done" | "advance" | "log";
  advance?: { status: PlanStatus; label: string };
};

export function pickDoFirst(
  input: {
    todos: TodoItem[];
    clients: { id: string; name: string; notReached: number | null; notMetYet: boolean }[];
    today: string;
  },
  max = DO_FIRST_MAX,
): { items: DoFirstItem[]; more: number } {
  const best = new Map<string, DoFirstItem>();
  const consider = (item: DoFirstItem) => {
    const prev = best.get(item.clientId);
    if (
      !prev ||
      RANK[item.reason] < RANK[prev.reason] ||
      (RANK[item.reason] === RANK[prev.reason] && (item.dueDate ?? "9999") < (prev.dueDate ?? "9999"))
    ) {
      best.set(item.clientId, item);
    }
  };

  for (const t of input.todos) {
    if (!t.clientId) continue; // personal tasks live in "My own to-dos"
    const reason: DoFirstReason | null =
      t.dueDate && t.dueDate < input.today ? "overdue" : t.dueDate === input.today ? "today" : t.priority === "urgent" ? "urgent" : null;
    if (!reason) continue;
    const advance = t.kind === "plan" && t.status ? NEXT_STATUS[t.status] : undefined;
    consider({
      key: t.key,
      clientId: t.clientId,
      clientName: t.clientName ?? t.clientCode ?? "Client",
      text: t.text,
      reason,
      dueDate: t.dueDate,
      action: advance ? "advance" : "done",
      advance,
    });
  }
  for (const c of input.clients) {
    if (c.notReached !== null) {
      consider({ key: `reach:${c.id}`, clientId: c.id, clientName: c.name, text: `Find ${c.name} and check in`, reason: "not_reached", days: c.notReached, action: "log" });
    } else if (c.notMetYet) {
      consider({ key: `meet:${c.id}`, clientId: c.id, clientName: c.name, text: `Find ${c.name} and log a first contact`, reason: "new", action: "log" });
    }
  }

  const all = [...best.values()].sort(
    (a, b) => RANK[a.reason] - RANK[b.reason] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.clientName.localeCompare(b.clientName),
  );
  return { items: all.slice(0, max), more: Math.max(0, all.length - max) };
}
