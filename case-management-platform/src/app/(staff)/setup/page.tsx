import { and, count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { aiEnabled } from "@/lib/ai";
import { requireSupervisor } from "@/lib/auth";
import { encryptionKeyConfigured } from "@/lib/crypto";
import { AiTestButton } from "./ai-test";

type Status = "ok" | "todo" | "off";

function Item({ status, title, children }: { status: Status; title: string; children?: React.ReactNode }) {
  const icon = { ok: "✓", todo: "!", off: "–" }[status];
  const tone = {
    ok: "bg-emerald-100 text-emerald-800",
    todo: "bg-amber-100 text-amber-900",
    off: "bg-stone-100 text-stone-600",
  }[status];
  return (
    <li className="flex gap-3 py-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone}`} aria-hidden>{icon}</span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-stone-900">
          {title} <span className="sr-only">({status === "ok" ? "done" : status === "todo" ? "needs attention" : "off"})</span>
        </p>
        {children && <div className="mt-0.5 text-stone-600">{children}</div>}
      </div>
    </li>
  );
}

export default async function SetupPage() {
  await requireSupervisor();
  const production = process.env.NODE_ENV === "production";
  const keyOk = encryptionKeyConfigured();
  const [{ n: resourceCount }] = await db.select({ n: count() }).from(schema.resources).where(eq(schema.resources.active, true));
  const users = await db.select().from(schema.users).where(eq(schema.users.active, true));
  const cms = users.filter((u) => u.role === "case_manager");
  const no2fa = users.filter((u) => !u.totpEnabled);
  const googleSecret = (process.env.GOOGLE_FORM_WEBHOOK_SECRET ?? "").length >= 32;
  const [lastGoogle] = await db
    .select({ at: schema.auditLog.at })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.action, "intake.submitted"), sql`${schema.auditLog.detail}->>'source' = 'google_form'`))
    .orderBy(desc(schema.auditLog.at))
    .limit(1);
  const ai = aiEnabled();
  const aiOff = process.env.AI_ENABLED === "false";

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Setup check"
        subtitle="Everything the platform needs to run. Work down the list until every line is green. Step-by-step help is in DEPLOY.md."
      />
      <Card title="1. The app">
        <ul className="divide-y divide-stone-100">
          <Item status="ok" title="Database connected">This page loaded data from the database.</Item>
          <Item status={keyOk ? "ok" : "todo"} title="Encryption key set">
            {keyOk ? "Client information is encrypted before it is saved." : "Set DATA_ENCRYPTION_KEY in the server settings."}
          </Item>
          <Item status={production ? "ok" : "todo"} title="Running in production mode">
            {production ? "Secure sign-in cookies are on." : "This is a development server. Do not enter real client information here."}
          </Item>
          <Item status={resourceCount > 0 ? "ok" : "todo"} title={`Resource directory loaded (${resourceCount})`}>
            {resourceCount > 0 ? <Link className="underline" href="/resources">View resources</Link> : "Run npm run db:seed-resources on the server."}
          </Item>
        </ul>
      </Card>

      <Card title="2. Your team">
        <ul className="divide-y divide-stone-100">
          <Item status={cms.length > 0 ? "ok" : "todo"} title={`Case manager accounts (${cms.length})`}>
            {cms.length > 0 ? cms.map((u) => u.name).join(", ") : <>Add your case managers on the <Link className="underline" href="/team">Team page</Link>.</>}
          </Item>
          <Item status={no2fa.length === 0 ? "ok" : "todo"} title="Everyone has two-step verification">
            {no2fa.length === 0
              ? "All active accounts use an authenticator app."
              : `Waiting on: ${no2fa.map((u) => u.name).join(", ")}. They set it up the first time they sign in.`}
          </Item>
        </ul>
      </Card>

      <Card title="3. Google Form">
        <ul className="divide-y divide-stone-100">
          <Item status={googleSecret ? "ok" : "todo"} title="Connection password set on the server">
            {googleSecret
              ? "GOOGLE_FORM_WEBHOOK_SECRET is set. Use the same value as CONNECTCARE_SECRET in the Google script."
              : "Set GOOGLE_FORM_WEBHOOK_SECRET in the server settings (at least 32 characters)."}
          </Item>
          <Item status={lastGoogle ? "ok" : "todo"} title="A Google Form submission has arrived">
            {lastGoogle
              ? `Most recent: ${formatDate(lastGoogle.at)} at ${lastGoogle.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`
              : "None yet. After setting up the Google script, fill out the form once yourself and reload this page."}
          </Item>
        </ul>
      </Card>

      <Card title="4. AI assistant">
        <ul className="divide-y divide-stone-100">
          <Item status={ai ? "ok" : aiOff ? "off" : "todo"} title={ai ? "AI assistant is on" : aiOff ? "AI assistant is turned off" : "AI key not set"}>
            {ai ? <AiTestButton /> : aiOff ? "AI_ENABLED is false." : "Add ANTHROPIC_API_KEY in the server settings to turn it on."}
          </Item>
        </ul>
      </Card>
    </div>
  );
}
