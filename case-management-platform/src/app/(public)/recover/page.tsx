import { notFound } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { RecoverForm } from "./form";

export const dynamic = "force-dynamic";

export default function RecoverPage() {
  if ((process.env.ADMIN_SETUP_CODE ?? "").length < 12) notFound();
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Supervisor sign-in recovery</h1>
        <p className="mb-4 text-sm text-stone-600">
          For a supervisor who lost their phone. Case managers: ask your supervisor to reset you from the Team page.
        </p>
        <RecoverForm />
      </div>
    </PublicShell>
  );
}
