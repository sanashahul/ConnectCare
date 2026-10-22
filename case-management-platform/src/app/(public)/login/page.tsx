import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { readSession } from "@/lib/session";
import { setupStatus } from "@/lib/setup";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const status = await setupStatus();
  if (!status.tablesReady || status.userCount === 0) redirect("/first-time-setup");
  const justSetUp = (await searchParams).setup === "done";
  const s = await readSession();
  if (s?.session.stage === "full") redirect("/dashboard");
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Staff sign in</h1>
        <p className="mb-5 text-sm text-stone-600">For case managers and supervisors. You will also need your authenticator app.</p>
        {justSetUp && (
          <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            Your supervisor account is ready. Sign in, then set up two-step verification with your phone.
          </p>
        )}
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Looking for help? <Link className="text-brand-700 underline" href="/intake">Fill out the request form</Link>.
      </p>
    </PublicShell>
  );
}
