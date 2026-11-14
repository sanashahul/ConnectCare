import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, secondaryButtonClass } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { printSheetData } from "@/lib/print-plan";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "./print-sheet";

export default async function PrintPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; source?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  // No name is stored for clients whose details are kept in Box; the app shows their ID instead.
  const hasName = client.profile.firstName !== client.clientCode;
  const showName = hasName && sp.name === "1";
  const source = sp.source === "matches" ? "matches" : "plan";

  const { entries, hotlines } = await printSheetData(client, source);
  await audit({ userId: user.id, action: "client.printed", clientId: id, detail: { source, showName } });

  const q = (o: Record<string, string>) => `?${new URLSearchParams({ source, ...(showName ? { name: "1" } : {}), ...o })}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <Link href={`/clients/${id}`} className={secondaryButtonClass}>← Back</Link>
        <span className="text-stone-600">Include:</span>
        <Link href={q({ source: "plan" })} className={source === "plan" ? "font-semibold underline" : "underline"}>Steps in the care plan</Link>
        <Link href={q({ source: "matches" })} className={source === "matches" ? "font-semibold underline" : "underline"}>Top directory matches for each need</Link>
        {hasName && (
          <>
            <span className="mx-2 text-stone-300">|</span>
            <Link href={`?${new URLSearchParams({ source, ...(showName ? {} : { name: "1" }) })}`} className="underline">
              {showName ? "Remove first name" : "Add first name"}
            </Link>
          </>
        )}
        <span className="ml-auto"><PrintButton /></span>
        <p className="w-full text-xs text-stone-500">The printout has no last name, contact details, or notes, in case it is lost.</p>
      </div>

      <PrintSheet
        title={`Resources for you${showName ? `, ${client.profile.firstName}` : ""}`}
        prepared={`Prepared ${formatDate(new Date())} by your case manager, ${user.name.split(" ")[0]}. Hours change, so call before you go.`}
        clientCode={client.clientCode}
        hotlines={hotlines}
        entries={entries}
      />
    </div>
  );
}
