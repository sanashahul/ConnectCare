"use client";

import { buttonClass } from "@/components/ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button onClick={() => window.print()} className={buttonClass}>{label}</button>;
}
