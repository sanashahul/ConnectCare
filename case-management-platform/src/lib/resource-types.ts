export type Resource = {
  id: string;
  name: string;
  categories: string[];
  description: string;
  county: "Santa Clara" | "San Mateo" | "Multi-county" | string;
  city: string | null;
  address: string | null;
  phones: { label: string; number: string }[];
  web: string | null;
  hours: string | null;
  walkIn: boolean | null;
  cost: "free" | "sliding_scale" | "low_cost" | "varies" | null;
  acceptsMediCal: boolean | null;
  languages: string[];
  eligibility: string | null;
  isHotline: boolean;
  sources: string[];
  lastVerified: string | null;
  conflicts: { field: string; values: { value: string; source: string }[] }[];
  notes: string | null;
};

export const RESOURCE_CATEGORIES: { key: string; label: string }[] = [
  { key: "emergency", label: "Emergency" },
  { key: "crisis", label: "Crisis" },
  { key: "medical", label: "Medical" },
  { key: "dental", label: "Dental" },
  { key: "vision_hearing", label: "Vision & hearing" },
  { key: "mental_health", label: "Mental health" },
  { key: "substance_use", label: "Substance use" },
  { key: "shelter", label: "Shelter" },
  { key: "housing", label: "Housing" },
  { key: "safe_parking", label: "Safe parking" },
  { key: "food", label: "Food" },
  { key: "showers_hygiene", label: "Showers & hygiene" },
  { key: "laundry", label: "Laundry" },
  { key: "clothing", label: "Clothing" },
  { key: "restrooms_wifi", label: "Restrooms, Wi-Fi, charging" },
  { key: "benefits", label: "Benefits" },
  { key: "transit", label: "Transit" },
  { key: "pets", label: "Pets" },
  { key: "domestic_violence", label: "Domestic violence" },
  { key: "youth", label: "Youth" },
  { key: "families", label: "Families" },
  { key: "lgbtq", label: "LGBTQ+ affirming" },
  { key: "legal", label: "Legal" },
  { key: "employment", label: "Employment" },
  { key: "phone_id_documents", label: "Phone, ID & documents" },
  { key: "other", label: "Other" },
];
export const categoryLabel = (k: string) => RESOURCE_CATEGORIES.find((c) => c.key === k)?.label ?? k;
