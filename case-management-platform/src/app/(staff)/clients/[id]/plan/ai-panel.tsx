"use client";

import { useState, useTransition } from "react";
import { Badge, buttonClass, Card, ErrorText, inputClass, smallButtonClass } from "@/components/ui";
import type { AiPlan } from "@/lib/ai";
import { needLabel } from "@/lib/options";
import { addAiPlanItem, runAiPlanner } from "../../actions";

const TIMEFRAME: Record<string, string> = { today: "Today", this_week: "This week", this_month: "This month", ongoing: "Ongoing" };

export function AiPanel({ clientId, enabled, payload, resourceNames }: {
  clientId: string;
  enabled: boolean;
  payload: string[];
  resourceNames: Record<string, string>;
}) {
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string>();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  if (!enabled) {
    return (
      <Card title="AI planning assistant">
        <p className="text-sm text-stone-600">
          The AI assistant is turned off. A supervisor can turn it on after your privacy office approves the AI vendor
          agreement (see PRIVACY.md). Directory matching above works without it.
        </p>
      </Card>
    );
  }

  function ask() {
    setError(undefined);
    start(async () => {
      const res = await runAiPlanner(clientId, question);
      if (res.ok) {
        setPlan(res.plan);
        setSearched(res.searched);
        setAdded(new Set());
      } else setError(res.error);
    });
  }

  function add(key: string, item: Parameters<typeof addAiPlanItem>[1]) {
    start(async () => {
      const res = await addAiPlanItem(clientId, item);
      if (res.ok) setAdded((s) => new Set(s).add(key));
      else setError(res.error);
    });
  }

  return (
    <Card title="AI planning assistant">
      <details className="mb-3 rounded-md bg-stone-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-stone-800">What is sent to the AI</summary>
        <ul className="mt-2 list-disc pl-5 text-stone-700">
          {payload.map((line) => <li key={line}>{line}</li>)}
          <li>The resource directory for this county (public information)</li>
          <li>Your question below, with names, phone numbers, emails, and dates removed</li>
        </ul>
        <p className="mt-2 text-stone-600">Never sent: name, contact details, intake answers, or case notes.</p>
      </details>
      <label className="block text-sm font-medium text-stone-800" htmlFor="ai-question">Anything specific? (optional)</label>
      <textarea
        id="ai-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={600}
        rows={2}
        className={inputClass}
        placeholder="e.g. Needs psych meds refilled this week and has no ID. Don't include names or other identifying details."
      />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={ask} disabled={pending} className={buttonClass}>{pending && !plan ? "Thinking… (up to a minute)" : "Draft a plan with AI"}</button>
        <span className="text-xs text-stone-500">AI can be wrong. You decide what goes in the plan.</span>
      </div>
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>

      {plan && (
        <div className="mt-4 space-y-4">
          <p className="rounded-md bg-brand-50 p-3 text-sm text-stone-800">{plan.summary}</p>

          {plan.steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Suggested steps</h3>
              <ol className="space-y-2">
                {plan.steps.map((s, i) => {
                  const key = `step-${i}`;
                  return (
                    <li key={key} className="rounded-md border border-stone-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{needLabel(s.need)}</Badge>
                        <Badge>{TIMEFRAME[s.timeframe]}</Badge>
                        {s.resourceId ? <Badge tone="green">From your directory</Badge> : null}
                      </div>
                      <p className="mt-1 font-medium">{s.action}</p>
                      {s.resourceId && <p className="text-stone-700">Resource: {resourceNames[s.resourceId] ?? s.resourceId}</p>}
                      <p className="text-stone-600">{s.why}</p>
                      <div className="mt-2">
                        {added.has(key) ? (
                          <span className="text-xs font-medium text-emerald-700">Added to plan ✓</span>
                        ) : (
                          <button className={smallButtonClass} disabled={pending} onClick={() => add(key, { need: s.need, title: s.action, resourceId: s.resourceId })}>
                            + Add to plan
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {plan.suggestions.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Possible resources not in your directory</h3>
              <p className="mb-2 text-sm text-amber-900">
                These came from the AI{searched ? " and a web search" : ""}. They are <strong>not verified</strong>. Call or check the source before
                sharing with the client. They stay off printouts until you mark them checked.
              </p>
              <ul className="space-y-2">
                {plan.suggestions.map((s, i) => {
                  const key = `sug-${i}`;
                  return (
                    <li key={key} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="amber">Unverified</Badge>
                        <Badge tone="brand">{needLabel(s.need)}</Badge>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                      <p className="mt-1">{s.offers}</p>
                      <p>Contact: {s.contact || "not found"} · {s.location}</p>
                      {s.sourceUrl && <p>Source: <a className="underline" href={s.sourceUrl} target="_blank" rel="noreferrer noopener">{s.sourceUrl}</a></p>}
                      <p className="text-stone-600">{s.why}</p>
                      <div className="mt-2">
                        {added.has(key) ? (
                          <span className="text-xs font-medium text-emerald-700">Added as unverified ✓</span>
                        ) : (
                          <button
                            className={smallButtonClass}
                            disabled={pending}
                            onClick={() => add(key, { need: s.need, title: `Check and connect with ${s.name}`, suggestion: s })}
                          >
                            + Add to plan (unverified)
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {plan.cautions.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Double-check</h3>
              <ul className="list-disc pl-5 text-sm text-stone-700">{plan.cautions.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
