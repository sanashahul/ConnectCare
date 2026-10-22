import { headers } from "next/headers";
import { db, schema } from "@/db";

// Record WHO did WHAT to WHICH record. Never pass names, contact details, or note text in `detail`.
export async function audit(entry: {
  userId?: string | null;
  action: string;
  clientId?: string | null;
  detail?: Record<string, unknown>;
}) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  } catch {
    // Outside a request (scripts): no IP.
  }
  await db.insert(schema.auditLog).values({
    userId: entry.userId ?? null,
    action: entry.action,
    clientId: entry.clientId ?? null,
    detail: entry.detail ?? null,
    ip,
  });
}

export async function requestIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}
