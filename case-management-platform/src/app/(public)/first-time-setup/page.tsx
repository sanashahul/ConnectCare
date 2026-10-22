import { redirect } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { setupStatus } from "@/lib/setup";
import { FirstSupervisorForm, SecretValues } from "./forms";

export const dynamic = "force-dynamic";

function Step({ done, title, children }: { done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
        {done ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-stone-900">{title}</p>
        {!done && children && <div className="mt-1 space-y-2 text-stone-700">{children}</div>}
      </div>
    </li>
  );
}

export default async function FirstTimeSetupPage() {
  const s = await setupStatus();
  if (s.userCount > 0) redirect("/login");
  const missing = [
    !s.keyOk && "DATA_ENCRYPTION_KEY",
    !s.googleSecretOk && "GOOGLE_FORM_WEBHOOK_SECRET",
    !s.setupCodeOk && "ADMIN_SETUP_CODE",
  ].filter((x): x is string => !!x);
  const ready = s.tablesReady && missing.length === 0;

  return (
    <PublicShell>
      <h1 className="text-2xl font-semibold">First-time setup</h1>
      <p className="mt-1 text-sm text-stone-600">
        This page only works until the first account exists. Follow each step, then reload this page.
      </p>
      <ol className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white px-4">
        <Step done={s.dbConfigured} title="1. Connect a database">
          <p>In Vercel, open your project → <strong>Storage</strong> → <strong>Create Database</strong> → <strong>Neon</strong> (free plan) → connect it to this project.</p>
        </Step>
        <Step done={missing.length === 0} title="2. Add the secret settings">
          <p>
            In Vercel, open <strong>Settings → Environment Variables</strong>. Add each name below with its value
            (made in your browser just now, nothing is sent anywhere). Save the values in a password manager too.
          </p>
          <SecretValues names={missing} />
          <p className="text-amber-900">
            Keep DATA_ENCRYPTION_KEY safe and never change it: client information can&apos;t be read without it.
          </p>
        </Step>
        <Step done={s.tablesReady} title="3. Redeploy">
          <p>
            In Vercel, open <strong>Deployments</strong>, click the <strong>⋯</strong> menu on the latest one → <strong>Redeploy</strong>.
            This creates the database tables and loads your resource directory. Wait until it says Ready, then reload this page.
          </p>
          {s.dbConfigured && !s.dbReachable && <p className="text-red-700">The database can&apos;t be reached. Check that it is connected to this project.</p>}
        </Step>
        <Step done={false} title="4. Create your supervisor account">
          {ready ? <FirstSupervisorForm /> : <p>Finish steps 1–3 first.</p>}
        </Step>
      </ol>
    </PublicShell>
  );
}
