import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { NEED_KEYS, needLabel } from "./options";
import type { NeedMatch } from "./resource-match";
import type { Resource } from "./resource-types";

// The AI assistant only ever receives the de-identified fields in AiProfile below,
// the public resource directory, and a redacted question. Never add names,
// contact details, dates of birth, case notes, or free-text intake answers here.

export const MODEL = "claude-opus-5-5";

/** On by default once an API key is configured; set AI_ENABLED=false to turn it off. */
export function aiEnabled() {
  return process.env.AI_ENABLED !== "false" && !!process.env.ANTHROPIC_API_KEY;
}

export type AiProfile = {
  county: string | null;
  needs: string[];
  ageRange: string | null;
  language: string | null;
  insurance: string | null;
  sleeping: string | null;
  urgent: boolean;
  hasVehicle: boolean;
  hasPets: boolean;
  hasChildren: boolean;
};

/** Human-readable list of exactly what is sent, shown to staff before they press the button. */
export function describeAiPayload(p: AiProfile): string[] {
  return [
    `County: ${p.county ?? "unknown"}`,
    `Needs: ${p.needs.map(needLabel).join(", ") || "none"}`,
    `Age range: ${p.ageRange ?? "unknown"}`,
    `Language: ${p.language ?? "unknown"}`,
    `Insurance: ${p.insurance ?? "unknown"}`,
    `Sleeping situation: ${p.sleeping ?? "unknown"}`,
    `Urgent: ${p.urgent ? "yes" : "no"}; vehicle: ${p.hasVehicle ? "yes" : "no"}; pets: ${p.hasPets ? "yes" : "no"}; children: ${p.hasChildren ? "yes" : "no"}`,
  ];
}

const PlanSchema = z.object({
  summary: z.string(),
  steps: z.array(
    z.object({
      need: z.string(),
      action: z.string(),
      resourceId: z.string().nullable(),
      why: z.string(),
      timeframe: z.enum(["today", "this_week", "this_month", "ongoing"]),
    }),
  ),
  suggestions: z.array(
    z.object({
      need: z.string(),
      name: z.string(),
      offers: z.string(),
      contact: z.string(),
      location: z.string(),
      sourceUrl: z.string(),
      why: z.string(),
    }),
  ),
  cautions: z.array(z.string()),
});
export type AiPlan = z.infer<typeof PlanSchema>;

const submitPlanTool: Anthropic.Beta.BetaTool = {
  name: "submit_plan",
  description:
    "Submit the draft care plan for the case manager. Call this exactly once, after any research, as your final action.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "steps", "suggestions", "cautions"],
    properties: {
      summary: { type: "string", description: "2-3 plain sentences for the case manager." },
      steps: {
        type: "array",
        description: "Ordered plan steps. Most urgent first.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["need", "action", "resourceId", "why", "timeframe"],
          properties: {
            need: { type: "string", enum: NEED_KEYS },
            action: { type: "string", description: "One concrete action, e.g. 'Walk in to BHUC for a medication refill'." },
            resourceId: {
              type: ["string", "null"],
              description: "id of a resource from the VETTED DIRECTORY, or null. Never invent ids.",
            },
            why: { type: "string" },
            timeframe: { type: "string", enum: ["today", "this_week", "this_month", "ongoing"] },
          },
        },
      },
      suggestions: {
        type: "array",
        description:
          "Resources NOT in the vetted directory that could fill a gap. These will be shown as unverified and must be checked by phone.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["need", "name", "offers", "contact", "location", "sourceUrl", "why"],
          properties: {
            need: { type: "string", enum: NEED_KEYS },
            name: { type: "string" },
            offers: { type: "string" },
            contact: {
              type: "string",
              description: "Phone or website exactly as found in a source. Empty string if you did not find one.",
            },
            location: { type: "string" },
            sourceUrl: { type: "string", description: "Page where you found it. Empty string if none." },
            why: { type: "string" },
          },
        },
      },
      cautions: { type: "array", items: { type: "string" }, description: "Things the case manager should double-check." },
    },
  },
};

const SYSTEM = `You help street-medicine case managers in Santa Clara and San Mateo counties, California, plan care for people experiencing homelessness.

You receive a de-identified client profile, matches from the team's VETTED DIRECTORY, and the gaps the directory could not fill. Draft a short, practical plan.

Rules:
- Prefer vetted directory resources. Reference them only by the exact id given. Never invent ids.
- Put anything that is not in the vetted directory in "suggestions", never in steps' resourceId. Each suggestion will be labeled unverified for the case manager.
- Never invent phone numbers, addresses, hours, or eligibility rules. Only report contact details you found in a source; otherwise leave contact empty and say how to find it.
- Respect the client's county: Santa Clara and San Mateo have separate shelter, behavioral health, and benefits systems.
- If the profile suggests immediate danger or a mental health crisis, the first step is the crisis line (988) or the county mobile crisis team.
- Keep steps short and doable. 3-8 steps is usually right.
- Finish by calling submit_plan once.`;

function compactResource(r: Resource) {
  return {
    id: r.id,
    name: r.name,
    categories: r.categories,
    county: r.county,
    city: r.city,
    hours: r.hours,
    walkIn: r.walkIn,
    cost: r.cost,
    languages: r.languages,
    eligibility: r.eligibility,
    description: r.description,
  };
}

export type AiResult = { ok: true; plan: AiPlan; searched: boolean } | { ok: false; error: string };

export async function draftPlanWithAi(input: {
  profile: AiProfile;
  matches: NeedMatch[];
  directory: Resource[];
  question?: string;
}): Promise<AiResult> {
  if (!aiEnabled()) return { ok: false, error: "The AI assistant is turned off for this site." };

  const client = new Anthropic();
  const webSearch = process.env.AI_WEB_SEARCH !== "false";
  const directoryIds = new Set(input.directory.map((r) => r.id));

  const userContent = [
    "CLIENT PROFILE (de-identified):",
    JSON.stringify(input.profile, null, 2),
    "",
    "DIRECTORY MATCHES AND GAPS BY NEED:",
    JSON.stringify(
      input.matches.map((m) => ({ need: m.need, matchIds: m.matches.map((x) => x.resource.id), gaps: m.gaps })),
      null,
      2,
    ),
    "",
    "VETTED DIRECTORY (resources available in this county):",
    JSON.stringify(input.directory.map(compactResource)),
    input.question ? `\nCASE MANAGER'S QUESTION:\n${input.question}` : "",
    webSearch
      ? "\nYou may use web search to look for real resources that fill the gaps. Cite the page in sourceUrl."
      : "\nWeb search is not available. Suggestions outside the directory must have empty contact unless you are certain, and should say how to find the service.",
  ].join("\n");

  const tools: Anthropic.Beta.BetaToolUnion[] = [submitPlanTool];
  if (webSearch) {
    tools.unshift({
      type: "web_search_20260209",
      name: "web_search",
      max_uses: 5,
      user_location: { type: "approximate", region: "California", country: "US" },
    });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userContent }];
  let searched = false;

  try {
    for (let turn = 0; turn < 5; turn++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: SYSTEM,
        tools,
        tool_choice: { type: "auto" },
        messages,
      });

      if (response.stop_reason === "refusal") {
        return { ok: false, error: "The AI declined this request. Use the directory matches instead." };
      }
      if (response.content.some((b) => b.type === "server_tool_use")) searched = true;

      const submit = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_plan",
      );
      if (submit) {
        const parsed = PlanSchema.safeParse(submit.input);
        if (!parsed.success) return { ok: false, error: "The AI returned an unexpected format. Please try again." };
        const plan = parsed.data;
        // Defense in depth: any id not in the vetted directory is dropped.
        for (const step of plan.steps) if (step.resourceId && !directoryIds.has(step.resourceId)) step.resourceId = null;
        return { ok: true, plan, searched };
      }

      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason === "pause_turn") continue;
      if (response.stop_reason === "max_tokens") return { ok: false, error: "The AI response was too long. Please try again." };
      messages.push({ role: "user", content: "Please call submit_plan now with your draft plan." });
    }
    return { ok: false, error: "The AI did not finish a plan. Please try again." };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "The AI service is busy. Try again in a minute." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "The AI service is not configured correctly." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: `The AI service returned an error (${err.status}).` };
    return { ok: false, error: "Could not reach the AI service." };
  }
}
