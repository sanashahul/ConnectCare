import { decryptJson, encryptJson } from "./crypto";

export type AiSuggestion = {
  name: string;
  offers: string;
  contact: string;
  location: string;
  sourceUrl?: string;
  why: string;
};

/** A resource typed in for one client's plan (not in the shared directory). */
export type CustomResource = {
  name: string;
  phone?: string;
  address?: string;
  hours?: string;
  notes?: string;
};

export type PlanItemBody = {
  title: string;
  details?: string;
  suggestion?: AiSuggestion;
  custom?: CustomResource;
};

export const encryptPlanBody = (b: PlanItemBody) => encryptJson(b);
export const decryptPlanBody = (enc: string) => decryptJson<PlanItemBody>(enc);
