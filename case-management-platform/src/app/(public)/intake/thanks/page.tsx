import Link from "next/link";
import { PublicShell } from "@/components/ui";
import { CLIENT_CODE_PATTERN } from "@/lib/client-code";
import { INTAKE_TEXT, intakeLang } from "@/lib/intake-i18n";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ id?: string; lang?: string }> }) {
  const { id, lang: langParam } = await searchParams;
  const lang = intakeLang(langParam);
  const T = INTAKE_TEXT[lang];
  const code = id && CLIENT_CODE_PATTERN.test(id) ? id : null;
  return (
    <PublicShell>
      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm" lang={lang}>
        <h1 className="text-2xl font-semibold text-stone-900">{T.thanksTitle}</h1>
        {code && (
          <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-4 text-center">
            <p className="text-sm text-stone-700">{T.requestNumber}</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-brand-800">{code}</p>
            <p className="mt-1 text-sm text-stone-600">{T.writeItDown}</p>
          </div>
        )}
        <p className="mt-4 text-stone-700">{T.willReach}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
          <li>{T.emergency} <a className="underline" href="tel:911">911</a></li>
          <li>{T.crisisLine} <a className="underline" href="tel:988">988</a></li>
          <li>{T.anyService} <a className="underline" href="tel:211">211</a></li>
          <li>{T.shelterLine} <a className="underline" href="tel:408-385-2400">408-385-2400</a> {T.shelterHours}</li>
        </ul>
        <Link href={lang === "en" ? "/intake" : `/intake?lang=${lang}`} className="mt-6 inline-block text-sm text-brand-700 underline">{T.another}</Link>
      </div>
    </PublicShell>
  );
}
