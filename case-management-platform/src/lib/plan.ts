import { decryptJson, encryptJson } from "./crypto";

export type AiSuggestion = {
  name: string;
  offers: string;
  contact: string;
  location: string;
  sourceUrl?: string;
  why: string;
};

export type PlanItemBody = {
  title: string;
  details?: string;
  suggestion?: AiSuggestion;
};

export const encryptPlanBody = (b: PlanItemBody) => encryptJson(b);
export const decryptPlanBody = (enc: string) => decryptJson<PlanItemBody>(enc);
