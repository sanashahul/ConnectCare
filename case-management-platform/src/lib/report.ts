// Monthly program report. Counts only: no names or other identifying details.
// Months are calendar months in Pacific time, where the team works.

export const REPORT_TZ = "America/Los_Angeles";

export type ReportInput = {
  clients: {
    id: string;
    createdAt: Date;
    assignedAt: Date | null;
    closedAt: Date | null;
    status: "new" | "active" | "closed";
    source: "public_form" | "staff" | "google_form";
    urgent: boolean;
    needs: string[];
  }[];
  notes: { clientId: string; kind: "met" | "not_found" | "update"; contactDate: string }[];
  planItems: { status: string; statusChangedAt: Date | null }[];
};

export type MonthlyReport = {
  month: string;
  requests: { total: number; urgent: number; bySource: Record<string, number> };
  assignment: { assigned: number; medianHours: number | null };
  firstContact: { met: number; notYet: number; averageDays: number | null; medianDays: number | null; within7Days: number };
  topNeeds: { need: string; count: number }[];
  planSteps: { connected: number; done: number };
  couldntFind: { guestsTried: number; guestsNotFound: number; share: number | null; attempts: number };
  activity: { met: number; notFound: number; updates: number; closed: number; activeAtEnd: number };
};

/** YYYY-MM-DD for an instant, in Pacific time. */
export function pacificDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function currentMonth(now = new Date()): string {
  return pacificDate(now).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function buildMonthlyReport(input: ReportInput, month: string): MonthlyReport {
  const inMonth = (date: string) => date.slice(0, 7) === month;
  const monthEnd = shiftMonth(month, 1) + "-01"; // first day after the month

  // Requests received this month.
  const received = input.clients.filter((c) => inMonth(pacificDate(c.createdAt)));
  const bySource: Record<string, number> = {};
  for (const c of received) bySource[c.source] = (bySource[c.source] ?? 0) + 1;

  const assignHours = received
    .filter((c) => c.assignedAt)
    .map((c) => Math.max(0, (c.assignedAt!.getTime() - c.createdAt.getTime()) / 3_600_000));

  // First "met" entry per client, for the clients received this month.
  const firstMet = new Map<string, string>();
  for (const n of input.notes) {
    if (n.kind !== "met") continue;
    const prev = firstMet.get(n.clientId);
    if (!prev || n.contactDate < prev) firstMet.set(n.clientId, n.contactDate);
  }
  const contactDays = received
    .filter((c) => firstMet.has(c.id))
    .map((c) => Math.max(0, dayDiff(pacificDate(c.createdAt), firstMet.get(c.id)!)));

  const needCounts = new Map<string, number>();
  for (const c of received) for (const n of c.needs) needCounts.set(n, (needCounts.get(n) ?? 0) + 1);

  // Plan steps whose status changed to Connected or Done this month.
  const changed = input.planItems.filter((p) => p.statusChangedAt && inMonth(pacificDate(p.statusChangedAt)));

  // Contact attempts this month.
  const monthNotes = input.notes.filter((n) => inMonth(n.contactDate));
  const tried = new Set(monthNotes.filter((n) => n.kind !== "update").map((n) => n.clientId));
  const notFound = new Set(monthNotes.filter((n) => n.kind === "not_found").map((n) => n.clientId));

  const activeAtEnd = input.clients.filter((c) => {
    if (!c.assignedAt || pacificDate(c.assignedAt) >= monthEnd) return false;
    return !c.closedAt || pacificDate(c.closedAt) >= monthEnd;
  }).length;

  return {
    month,
    requests: { total: received.length, urgent: received.filter((c) => c.urgent).length, bySource },
    assignment: { assigned: assignHours.length, medianHours: median(assignHours) },
    firstContact: {
      met: contactDays.length,
      notYet: received.length - contactDays.length,
      averageDays: contactDays.length ? contactDays.reduce((a, b) => a + b, 0) / contactDays.length : null,
      medianDays: median(contactDays),
      within7Days: contactDays.filter((d) => d <= 7).length,
    },
    topNeeds: [...needCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([need, count]) => ({ need, count })),
    planSteps: {
      connected: changed.filter((p) => p.status === "connected").length,
      done: changed.filter((p) => p.status === "done").length,
    },
    couldntFind: {
      guestsTried: tried.size,
      guestsNotFound: notFound.size,
      share: tried.size ? notFound.size / tried.size : null,
      attempts: monthNotes.filter((n) => n.kind === "not_found").length,
    },
    activity: {
      met: monthNotes.filter((n) => n.kind === "met").length,
      notFound: monthNotes.filter((n) => n.kind === "not_found").length,
      updates: monthNotes.filter((n) => n.kind === "update").length,
      closed: input.clients.filter((c) => c.closedAt && inMonth(pacificDate(c.closedAt))).length,
      activeAtEnd,
    },
  };
}
