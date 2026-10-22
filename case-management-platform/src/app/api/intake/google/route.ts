import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { encryptProfile, insertClient } from "@/lib/clients";
import {
  GooglePayloadSchema,
  mapGooglePayload,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifySignature,
} from "@/lib/google-intake";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY = 20_000;

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const secret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  // The endpoint does not exist unless a secret is configured.
  if (!secret || secret.length < 32) return json(404, { error: "Not found" });
  if (!(await rateLimit("google-intake", 300, 60 * 60_000))) return json(429, { error: "Too many requests" });

  const body = await request.text();
  if (body.length > MAX_BODY) return json(413, { error: "Too large" });
  const ok = verifySignature(secret, request.headers.get(TIMESTAMP_HEADER), body, request.headers.get(SIGNATURE_HEADER));
  if (!ok) {
    await audit({ action: "google_intake.rejected", detail: { reason: "signature" } });
    return json(401, { error: "Bad signature" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const parsed = GooglePayloadSchema.safeParse(raw);
  if (!parsed.success) return json(422, { error: parsed.error.issues[0]?.message ?? "Invalid submission" });
  if (!parsed.data.answers.consent) return json(422, { error: "Consent is required" });

  const externalId = `google:${parsed.data.responseId}`;
  const existing = await db.query.clients.findFirst({ where: eq(schema.clients.externalId, externalId) });
  if (existing) return json(200, { clientCode: existing.clientCode, duplicate: true });

  const m = mapGooglePayload(parsed.data);
  const row = await insertClient({
    source: "google_form",
    externalId,
    status: "new",
    county: m.county,
    city: m.city,
    needs: m.needs,
    urgent: m.urgent,
    profileEnc: encryptProfile(m.profile),
  });
  await audit({ action: "intake.submitted", clientId: row.id, detail: { source: "google_form" } });
  return json(201, { clientCode: row.clientCode });
}
