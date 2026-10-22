"use server";

import { testAiConnection } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";

export async function runAiTest(): Promise<{ ok: boolean; message: string }> {
  const user = await requireSupervisor();
  const result = await testAiConnection();
  await audit({ userId: user.id, action: "setup.ai_tested", detail: { ok: result.ok } });
  return result;
}
