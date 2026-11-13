import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, secondaryButtonClass } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "@/app/(staff)/clients/[id]/print/print-sheet";
import { audit } from "@/lib/audit";
import { requireShiftViewer } from "@/lib/auth";
import { withProfile } from "@/lib/clients";
import { printSheetData } from "@/lib/print-plan";
import { normalizeShiftCode } from "@/lib/shift-utils";
import { shiftClient } from "@/lib/shifts";

/**
 * The case manager's resource sheet for someone on the clinical manager's shift list, so it can
 * be handed over if they're found. Same sheet as the case manager prints: no last name, contact
 * details or notes.
 */
export default async function ShiftPlanPage({ params }: { params: Promise<{ code: string; clientId: string }> }) {
  const user = await requireShiftViewer();
  const { code: raw, clientId } = await params;
  const code = normalizeShiftCode(raw);
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) notFound();
  const access = await shiftClient(user, code, clientId, { allowPreview: true });
  if (!access) notFound();
  const client = withProfile(access.client);
  const { entries, hotlines } = await printSheetData(client, "plan");
  const caseManager = client.assignedToId ? await db.query.users.findFirst({ where: eq(schema.users.id, client.assignedToId) }) : null;
  await audit({ userId: user.id, action: "shift.plan_viewed", clientId, detail: { shiftId: access.shift.id } });

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <Link href={`/shift/${code}`} className={secondaryButtonClass}>← Back to the list</Link>
        <span className="text-stone-600">Resource plan from {caseManager ? `${caseManager.name.split(" ")[0]}, their case manager` : "their case manager"}.</span>
        <span className="ml-auto"><PrintButton /></span>
        <p className="w-full text-xs text-stone-500">
          Hand this to them if you find them. It has no last name, contact details, or notes.
        </p>
      </div>
      <PrintSheet
        title="Resources for you"
        prepared={`Prepared ${formatDate(new Date())} by your case manager${caseManager ? `, ${caseManager.name.split(" ")[0]}` : ""}. Hours change, so call before you go.`}
        clientCode={client.clientCode}
        hotlines={hotlines}
        entries={entries}
        emptyText="Their case manager hasn't added plan steps yet."
      />
    </div>
  );
}
