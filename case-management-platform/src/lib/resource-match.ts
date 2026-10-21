import { NEEDS } from "./options";
import type { Resource } from "./resource-types";

// Deterministic matching against the vetted directory. No AI, no network.

export type MatchProfile = {
  city?: string | null;
  county?: string | null;
  needs: string[];
  language?: string;
  insurance?: string;
  ageRange?: string;
  urgent?: boolean;
  hasChildren?: boolean;
};

export type ScoredResource = { resource: Resource; score: number; reasons: string[] };
export type NeedMatch = { need: string; matches: ScoredResource[]; gaps: string[] };

const YOUNG = new Set(["Under 18", "18-24"]);

export function scoreResource(r: Resource, p: MatchProfile): ScoredResource | null {
  const reasons: string[] = [];
  let score = 0;

  if (p.county && r.county !== p.county && r.county !== "Multi-county") return null;
  if (p.city && r.city === p.city) {
    score += 4;
    reasons.push(`In ${p.city}`);
  } else if (p.county && r.county === p.county) {
    score += 2;
    reasons.push(`${p.county} County`);
  } else if (r.county === "Multi-county") {
    score += 1;
  }

  const lang = p.language && p.language !== "English" && p.language !== "Other" ? p.language : null;
  if (lang && r.languages.includes(lang)) {
    score += 2;
    reasons.push(`${lang} available`);
  }
  if (p.insurance === "None" && (r.cost === "free" || r.cost === "sliding_scale")) {
    score += 1;
    reasons.push(r.cost === "free" ? "Free" : "Sliding scale");
  }
  if (p.insurance === "Medi-Cal" && r.acceptsMediCal) {
    score += 1;
    reasons.push("Accepts Medi-Cal");
  }
  if (p.urgent && r.walkIn) {
    score += 1;
    reasons.push("Walk-in");
  }
  if (r.categories.includes("youth")) {
    if (p.ageRange && YOUNG.has(p.ageRange)) {
      score += 2;
      reasons.push("Serves young people");
    } else if (p.ageRange && p.ageRange !== "Prefer not to say") {
      return null;
    }
  }
  if (r.categories.includes("families") && !p.hasChildren) score -= 2;

  return { resource: r, score, reasons };
}

export function matchResources(resources: Resource[], p: MatchProfile, perNeed = 5): NeedMatch[] {
  const lang = p.language && p.language !== "English" && p.language !== "Other" ? p.language : null;
  return p.needs.map((need) => {
    const def = NEEDS.find((n) => n.key === need);
    const cats: readonly string[] = def?.resourceCategories ?? [];
    const matches = resources
      .filter((r) => !r.categories.includes("emergency") && r.categories.some((c) => cats.includes(c)))
      .map((r) => scoreResource(r, p))
      .filter((m): m is ScoredResource => m !== null)
      .sort((a, b) => b.score - a.score || a.resource.name.localeCompare(b.resource.name))
      .slice(0, perNeed);

    const gaps: string[] = [];
    if (matches.length === 0) gaps.push("No resource in the directory matches this need in the client's area.");
    else {
      if (matches.every((m) => m.resource.isHotline)) gaps.push("Only phone lines found; no in-person location.");
      if (lang && !matches.some((m) => m.resource.languages.includes(lang)))
        gaps.push(`None of the matches list ${lang} services.`);
      if (p.city && p.city !== "Other / not sure" && !p.city.startsWith("Other") && !matches.some((m) => m.resource.city === p.city))
        gaps.push(`Nothing listed in ${p.city} itself.`);
    }
    return { need, matches, gaps };
  });
}

// Printout header lines, in order, by county. 911 is always printed separately.
const HEADER_IDS: Record<string, string[]> = {
  "Santa Clara": ["988-suicide-crisis-line", "trust-mobile-crisis-team", "here4you-hotline", "211"],
  "San Mateo": ["988-suicide-crisis-line", "starvista-crisis-line", "211"],
  default: ["988-suicide-crisis-line", "211"],
};

/** Header numbers for a printout, by county. Missing (archived) entries are skipped. */
export function emergencyNumbers(resources: Resource[], county: string | null) {
  const ids = HEADER_IDS[county ?? ""] ?? HEADER_IDS.default;
  return ids.map((id) => resources.find((r) => r.id === id)).filter((r): r is Resource => !!r);
}
