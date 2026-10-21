import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { readSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const s = await readSession();
  if (s?.session.stage === "full") redirect("/dashboard");
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Staff sign in</h1>
        <p className="mb-5 text-sm text-stone-600">For case managers and supervisors. You will also need your authenticator app.</p>
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Looking for help? <Link className="text-brand-700 underline" href="/intake">Fill out the request form</Link>.
      </p>
    </PublicShell>
  );
}
