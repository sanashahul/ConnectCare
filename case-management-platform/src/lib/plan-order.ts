// How care plan steps are grouped and ordered, kept in one place so the client page, the home
// page and "This week" agree on what a client's next step is. Safe to import from the browser.

export type PlanStatus = "todo" | "referred" | "connected" | "done" | "unable";

/** Plan sections, in the order they appear. Labels are written for someone new to case management. */
export const PLAN_SECTIONS = [
  { status: "todo", title: "Up next", hint: "Steps to take. Focus on the first few." },
  { status: "referred", title: "Waiting to hear back", hint: "You made the referral. Check back with the guest or the provider." },
  { status: "connected", title: "Connected", hint: "The guest has started getting this help. Mark done once it's settled." },
  { status: "done", title: "Done", hint: "" },
  { status: "unable", title: "Couldn't connect", hint: "Tried and it didn't work out. Worth trying another resource?" },
] as const satisfies readonly { status: PlanStatus; title: string; hint: string }[];

/** How many To do steps to show before the rest go under "Later". */
export const FOCUS_COUNT = 3;

/** The one-tap button that moves a step forward. */
export const NEXT_STATUS: Partial<Record<PlanStatus, { status: PlanStatus; label: string }>> = {
  todo: { status: "referred", label: "Mark referred →" },
  referred: { status: "connected", label: "Mark connected →" },
  connected: { status: "done", label: "Mark done ✓" },
};

const STATUS_RANK: Record<PlanStatus, number> = { todo: 0, referred: 1, connected: 2, done: 3, unable: 4 };

/** Steps with a due date first (soonest first), then To do before Referred before Connected, then oldest first. */
export function sortSteps<T extends { status: string; dueDate: string | null; createdAt: Date | number }>(steps: T[]): T[] {
  const time = (d: Date | number) => (typeof d === "number" ? d : d.getTime());
  return [...steps].sort(
    (a, b) =>
      (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
      STATUS_RANK[a.status as PlanStatus] - STATUS_RANK[b.status as PlanStatus] ||
      time(a.createdAt) - time(b.createdAt),
  );
}

export const OPEN_STATUSES = ["todo", "referred", "connected"] as const;
export const isOpen = (status: string) => (OPEN_STATUSES as readonly string[]).includes(status);

/** The single step to show as "Next" for a client, or undefined when nothing is open. */
export function nextStep<T extends { status: string; dueDate: string | null; createdAt: Date | number }>(steps: T[]): T | undefined {
  return sortSteps(steps.filter((s) => isOpen(s.status)))[0];
}

/** Done / total per need, for the progress line at the top of the plan. "Couldn't connect" steps don't count. */
export function progressByNeed(steps: { need: string; status: string }[]): { need: string; done: number; total: number }[] {
  const out = new Map<string, { done: number; total: number }>();
  for (const s of steps) {
    if (s.status === "unable") continue;
    const p = out.get(s.need) ?? { done: 0, total: 0 };
    p.total++;
    if (s.status === "done") p.done++;
    out.set(s.need, p);
  }
  return [...out.entries()].map(([need, p]) => ({ need, ...p }));
}
