"use client";

import { useState, useTransition } from "react";
import { smallButtonClass } from "@/components/ui";
import { runAiTest } from "./actions";

export function AiTestButton() {
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button className={smallButtonClass} disabled={pending} onClick={() => start(async () => setResult(await runAiTest()))}>
        {pending ? "Testing…" : "Test AI connection"}
      </button>
      {result && <span className={result.ok ? "text-emerald-700" : "text-red-700"}>{result.message}</span>}
    </span>
  );
}
