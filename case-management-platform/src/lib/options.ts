// Shared option lists for intake, client profiles, and resource matching.

export const NEEDS = [
  { key: "medical", label: "Medical care", resourceCategories: ["medical"] },
  { key: "dental_vision", label: "Dental, vision, or hearing", resourceCategories: ["dental", "vision_hearing"] },
  { key: "mental_health", label: "Mental health", resourceCategories: ["mental_health", "crisis"] },
  { key: "substance_use", label: "Substance use support", resourceCategories: ["substance_use"] },
  { key: "shelter", label: "Shelter tonight", resourceCategories: ["shelter", "safe_parking"] },
  { key: "housing", label: "Housing (longer term)", resourceCategories: ["housing"] },
  { key: "food", label: "Food", resourceCategories: ["food"] },
  { key: "hygiene", label: "Showers, laundry, clothing", resourceCategories: ["showers_hygiene", "laundry", "clothing", "restrooms_wifi"] },
  { key: "benefits", label: "Benefits (Medi-Cal, CalFresh, cash aid)", resourceCategories: ["benefits"] },
  { key: "documents_phone", label: "ID, documents, or a phone", resourceCategories: ["phone_id_documents"] },
  { key: "transit", label: "Transportation", resourceCategories: ["transit"] },
  { key: "employment", label: "Work or job training", resourceCategories: ["employment"] },
  { key: "legal", label: "Legal help", resourceCategories: ["legal"] },
  { key: "safety", label: "Safety (violence or abuse)", resourceCategories: ["domestic_violence"] },
  { key: "pets", label: "Pet care", resourceCategories: ["pets"] },
] as const;

export type NeedKey = (typeof NEEDS)[number]["key"];
export const NEED_KEYS = NEEDS.map((n) => n.key) as NeedKey[];
export const needLabel = (key: string) => NEEDS.find((n) => n.key === key)?.label ?? key;

export const CITIES = [
  { city: "Mountain View", county: "Santa Clara" },
  { city: "Sunnyvale", county: "Santa Clara" },
  { city: "San Jose", county: "Santa Clara" },
  { city: "Milpitas", county: "Santa Clara" },
  { city: "Palo Alto", county: "Santa Clara" },
  { city: "Santa Clara", county: "Santa Clara" },
  { city: "Other Santa Clara County", county: "Santa Clara" },
  { city: "East Palo Alto", county: "San Mateo" },
  { city: "Menlo Park", county: "San Mateo" },
  { city: "Redwood City", county: "San Mateo" },
  { city: "Other San Mateo County", county: "San Mateo" },
  { city: "Other / not sure", county: null },
] as const;

export function countyForCity(city: string | null | undefined): string | null {
  return CITIES.find((c) => c.city === city)?.county ?? null;
}

export const OUTREACH_SITES = [
  "Hope's Corner (Mountain View)",
  "Hope for the Unhoused (Milpitas)",
  "Neighborhood Hands (San Jose)",
  "WeHOPE (East Palo Alto)",
  "Helping Hands (Sunnyvale Library)",
  "Other",
] as const;

export const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Prefer not to say"] as const;

export const LANGUAGES = ["English", "Spanish", "Vietnamese", "Chinese", "Tagalog", "Other"] as const;

export const INSURANCE = ["Medi-Cal", "Medicare", "Private insurance", "None", "Not sure"] as const;

export const SLEEPING = [
  "Outside / street",
  "Vehicle or RV",
  "Shelter",
  "Staying with friends or family",
  "Housed but at risk of losing it",
  "Other",
  "Prefer not to say",
] as const;

export const CONTACT_TYPES = [
  { key: "in_person", label: "In person" },
  { key: "outreach_site", label: "At outreach site" },
  { key: "phone", label: "Phone call" },
  { key: "text", label: "Text message" },
  { key: "other", label: "Other" },
] as const;

export const PLAN_STATUSES = [
  { key: "todo", label: "To do" },
  { key: "referred", label: "Referred" },
  { key: "connected", label: "Connected" },
  { key: "done", label: "Done" },
  { key: "unable", label: "Could not connect" },
] as const;
export const planStatusLabel = (k: string) => PLAN_STATUSES.find((s) => s.key === k)?.label ?? k;
