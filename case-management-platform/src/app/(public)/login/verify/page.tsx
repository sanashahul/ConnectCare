import { redirect } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { readSession } from "@/lib/session";
import { logout, verifyCode } from "../actions";
import { CodeForm } from "../code-form";

export default async function VerifyPage() {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.session.stage === "full") redirect("/dashboard");
  if (!s.user.totpEnabled) redirect("/login/setup-2fa");
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Two-step verification</h1>
        <p className="mb-5 text-sm text-stone-600">Open your authenticator app and enter the code for ConnectCare.</p>
        <CodeForm action={verifyCode} label="Verify" />
        <form action={logout} className="mt-4 text-center">
          <button className="text-sm text-stone-500 underline">Cancel</button>
        </form>
        <p className="mt-4 text-xs text-stone-500">Lost your phone? Ask your supervisor to reset two-step verification.</p>
      </div>
    </PublicShell>
  );
}
