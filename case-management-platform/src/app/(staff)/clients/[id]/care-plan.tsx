import Link from "next/link";
import { Badge, formatDate, smallButtonClass } from "@/components/ui";
import { needLabel, PLAN_STATUSES } from "@/lib/options";
import type { PlanItemBody } from "@/lib/plan";
import { FOCUS_COUNT, NEXT_STATUS, PLAN_SECTIONS, progressByNeed, sortSteps, type PlanStatus } from "@/lib/plan-order";
import { updatePlanItem } from "../actions";
import { PlanTabs } from "./plan-tabs";

export type PlanStep = {
  id: string;
  need: string;
  status: PlanStatus;
  dueDate: string | null;
  createdAt: Date;
  resourceId: string | null;
  verified: boolean;
  aiSuggested: boolean;
  body: PlanItemBody;
};

/**
 * The care plan, with a button for each stage (Up next, Waiting, Connected, Done). Up next shows
 * the first few To do steps; the rest wait under "Later".
 */
export function CarePlan({ steps, resourceName, today }: { steps: PlanStep[]; resourceName: Map<string, string>; today: string }) {
  const progress = progressByNeed(steps);
  return (
    <div className="space-y-4">
      {progress.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-700">
            <span className="font-medium">
              {progress.reduce((n, p) => n + p.done, 0)} of {progress.reduce((n, p) => n + p.total, 0)} steps done
            </span>{" "}
            <span className="text-xs text-stone-500">(by need)</span>
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="Progress by need">
            {progress.map((p) => (
              <li key={p.need} className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                <span className="font-medium">{needLabel(p.need)}</span>: {p.done} of {p.total} done
              </li>
            ))}
          </ul>
        </details>
      )}
      <PlanTabs
        initial={PLAN_SECTIONS.find((sec) => sec.status !== "done" && steps.some((st) => st.status === sec.status))?.status ?? "todo"}
        tabs={PLAN_SECTIONS.filter((sec) => sec.status !== "unable" || steps.some((st) => st.status === "unable")).map((section) => {
          const inSection = sortSteps(steps.filter((st) => st.status === section.status));
          const finished = section.status === "done" || section.status === "unable";
          let content: React.ReactNode = <StepList steps={inSection} resourceName={resourceName} today={today} compact={finished} />;
          if (section.status === "todo") {
            const focus = inSection.slice(0, FOCUS_COUNT);
            const later = inSection.slice(FOCUS_COUNT);
            content = (
              <>
                <StepList steps={focus} resourceName={resourceName} today={today} />
                {later.length > 0 && (
                  <details className="mt-2 rounded-md border border-dashed border-stone-300 px-3 py-2">
                    <summary className="cursor-pointer text-sm text-stone-700">
                      Later ({later.length}). Focus on the {focus.length} above first.
                    </summary>
                    <div className="mt-2">
                      <StepList steps={later} resourceName={resourceName} today={today} />
                    </div>
                  </details>
                )}
              </>
            );
          }
          return { key: section.status, label: section.short, count: inSection.length, hint: section.hint, content };
        })}
      />
    </div>
  );
}

function StepList({ steps, resourceName, today, compact = false }: {
  steps: PlanStep[];
  resourceName: Map<string, string>;
  today: string;
  compact?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {steps.map((s) => (
        <li key={s.id}>
          <StepCard step={s} resourceName={resourceName} today={today} compact={compact} />
        </li>
      ))}
    </ul>
  );
}

export function StepCard({ step, resourceName, today, compact = false }: {
  step: PlanStep;
  resourceName: Map<string, string>;
  today: string;
  compact?: boolean;
}) {
  const next = NEXT_STATUS[step.status];
  const overdue = step.dueDate && step.dueDate < today && (step.status === "todo" || step.status === "referred" || step.status === "connected");
  const resource = step.resourceId ? resourceName.get(step.resourceId) ?? "Resource" : step.body.custom?.name ?? step.body.suggestion?.name;
  const hasDetails = !!(step.body.custom || step.body.suggestion || step.body.details);
  return (
    <div className={`rounded-md border bg-white p-3 ${step.verified ? "border-stone-200" : "border-amber-300 bg-amber-50"} ${compact ? "py-2" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${compact ? "text-sm text-stone-600" : "text-stone-900"}`}>{step.body.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <Badge tone="brand">{needLabel(step.need)}</Badge>
            {step.dueDate && (overdue ? <Badge tone="red">Overdue · {formatDate(step.dueDate)}</Badge> : <span>Due {formatDate(step.dueDate)}</span>)}
            {!step.verified && <Badge tone="amber">AI suggestion: check before using</Badge>}
            {step.aiSuggested && step.verified && <Badge tone="blue">From AI</Badge>}
            {resource &&
              (step.resourceId ? (
                <Link href={`/resources/${step.resourceId}`} className="text-brand-700 underline">{resource}</Link>
              ) : (
                <span>{resource}</span>
              ))}
          </div>
        </div>
        {next && !compact && (
          <form action={updatePlanItem}>
            <input type="hidden" name="itemId" value={step.id} />
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="status" value={next.status} />
            <button className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">{next.label}</button>
          </form>
        )}
      </div>

      {!step.verified && (
        <form action={updatePlanItem} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="itemId" value={step.id} />
          <input type="hidden" name="intent" value="verify" />
          <input name="verifyNote" placeholder="How did you confirm? e.g. called, open Mon-Fri" className="min-w-60 flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-sm" />
          <button className={smallButtonClass}>I checked this, it&apos;s correct</button>
        </form>
      )}

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-stone-500">{hasDetails ? "Details and more options" : "More options"}</summary>
        <div className="mt-2 space-y-2 text-sm">
          {step.body.custom && (
            <div className="text-stone-700">
              <p><strong>{step.body.custom.name}</strong>{step.body.custom.notes ? `: ${step.body.custom.notes}` : ""}</p>
              {[step.body.custom.phone, step.body.custom.address, step.body.custom.hours].filter(Boolean).length > 0 && (
                <p>{[step.body.custom.phone, step.body.custom.address, step.body.custom.hours].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          )}
          {step.body.suggestion && (
            <div className="text-stone-700">
              <p><strong>{step.body.suggestion.name}</strong>: {step.body.suggestion.offers}</p>
              <p>Contact: {step.body.suggestion.contact || "not found, look up before sharing"} · {step.body.suggestion.location}</p>
              {step.body.suggestion.sourceUrl && (
                <p>Source: <a className="underline" href={step.body.suggestion.sourceUrl} target="_blank" rel="noreferrer noopener">{step.body.suggestion.sourceUrl}</a></p>
              )}
            </div>
          )}
          {step.body.details && <p className="whitespace-pre-wrap text-stone-600">{step.body.details}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-stone-500">Move to:</span>
            {PLAN_STATUSES.filter((st) => st.key !== step.status).map((st) => (
              <form key={st.key} action={updatePlanItem}>
                <input type="hidden" name="itemId" value={step.id} />
                <input type="hidden" name="intent" value="status" />
                <input type="hidden" name="status" value={st.key} />
                <button className={smallButtonClass}>{st.label}</button>
              </form>
            ))}
          </div>
          <form action={updatePlanItem}>
            <input type="hidden" name="itemId" value={step.id} />
            <input type="hidden" name="intent" value="delete" />
            <button className="text-xs text-stone-500 underline">Remove this step</button>
          </form>
        </div>
      </details>
    </div>
  );
}
