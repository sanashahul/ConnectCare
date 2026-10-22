// Shared by the server and the browser (no database imports here).
export const PRIORITIES = ["urgent", "high", "medium"] as const;
export type Priority = (typeof PRIORITIES)[number];
