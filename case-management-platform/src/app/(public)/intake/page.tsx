import Link from "next/link";
import { PublicShell } from "@/components/ui";
import { INTAKE_LANGS, INTAKE_TEXT, intakeLang } from "@/lib/intake-i18n";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Request help – ConnectCare" };

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = intakeLang((await searchParams).lang);
  const T = INTAKE_TEXT[lang];
  return (
    <PublicShell>
      <LanguageSwitch current={lang} />
      <h1 className="text-2xl font-semibold text-stone-900" lang={lang}>{T.title}</h1>
      <p className="mt-2 text-sm text-stone-700" lang={lang}>{T.intro}</p>
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900" lang={lang}>
        <strong>{T.danger}</strong> {T.call} <a className="underline" href="tel:911">911</a>.{" "}
        {T.crisis} <a className="underline" href="tel:988">988</a>, {T.anyTime}
      </div>
      <div className="mt-6" lang={lang}>
        {/* key: switching language starts a fresh form */}
        <IntakeForm key={lang} lang={lang} />
      </div>
    </PublicShell>
  );
}

function LanguageSwitch({ current }: { current: string }) {
  return (
    <nav aria-label="Language" className="mb-4 flex flex-wrap gap-2 text-sm">
      {INTAKE_LANGS.map((l) => (
        <Link
          key={l.key}
          href={l.key === "en" ? "/intake" : `/intake?lang=${l.key}`}
          lang={l.key}
          aria-current={l.key === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1 ${l.key === current ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
