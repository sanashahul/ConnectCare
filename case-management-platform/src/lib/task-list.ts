import { NEXT_STATUS, nextStep, type PlanStatus } from "./plan-order";
import type { TodoItem } from "./todos";

// The Task list on a case manager's Home: one line per client, taken from the top of that client's
// Up next (the order the case manager arranged). Clients with something overdue, due today or urgent
// come first, then guests nobody has reached lately, so nobody slips through.

/** Lines shown before "Show more". */
export const TASK_LIST_SHOWN = 5;

export type TaskLine = {
  clientId: string;
  clientName: string;
  /** step = their next plan step; contact = not reached lately; first_contact = new and never met; choose = no open steps. */
  kind: "step" | "contact" | "first_contact" | "choose";
  text: string;
  stepId?: string;
  dueDate?: string;
  advance?: { status: PlanStatus; label: string };
  /** Overdue items for this client (any step, follow-up or to-do), shown as a red flag. */
  overdue: number;
  dueToday: boolean;
  urgent: boolean;
  notReached: number | null;
};

type Step = { id: string; clientId: string; status: string; dueDate: string | null; createdAt: Date | number; position: number | null; title: string };

function rank(l: TaskLine) {
  if (l.overdue > 0) return 0;
  if (l.dueToday) return 1;
  if (l.urgent) return 2;
  if (l.kind === "contact") return 3;
  if (l.kind === "first_contact") return 4;
  if (l.kind === "step") return 5;
  return 6;
}

export function buildTaskList(input: {
  clients: { id: string; name: string; urgent: boolean; notReached: number | null; notMetYet: boolean }[];
  steps: Step[];
  todos: TodoItem[];
  today: string;
}): TaskLine[] {
  const lines = input.clients.map((c): TaskLine => {
    const mine = input.todos.filter((t) => t.clientId === c.id);
    const flags = {
      overdue: mine.filter((t) => t.dueDate && t.dueDate < input.today).length,
      dueToday: mine.some((t) => t.dueDate === input.today),
      urgent: c.urgent || mine.some((t) => t.priority === "urgent"),
      notReached: c.notReached,
    };
    const base = { clientId: c.id, clientName: c.name, ...flags };
    if (c.notReached !== null) return { ...base, kind: "contact", text: `Contact ${c.name} and check in` };
    if (c.notMetYet) return { ...base, kind: "first_contact", text: `Contact ${c.name} for the first time` };
    const step = nextStep(input.steps.filter((s) => s.clientId === c.id));
    if (!step) return { ...base, kind: "choose", text: `Choose a next step for ${c.name}` };
    return {
      ...base,
      kind: "step",
      text: step.title,
      stepId: step.id,
      dueDate: step.dueDate ?? undefined,
      advance: NEXT_STATUS[step.status as PlanStatus],
    };
  });
  return lines.sort(
    (a, b) => rank(a) - rank(b) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.clientName.localeCompare(b.clientName),
  );
}
