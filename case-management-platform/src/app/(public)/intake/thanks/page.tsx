import Link from "next/link";
import { PublicShell } from "@/components/ui";
import { CLIENT_CODE_PATTERN } from "@/lib/client-code";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const code = id && CLIENT_CODE_PATTERN.test(id) ? id : null;
  return (
    <PublicShell>
      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Thank you. We got your request.</h1>
        {code && (
          <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-4 text-center">
            <p className="text-sm text-stone-700">Your request number</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-brand-800">{code}</p>
            <p className="mt-1 text-sm text-stone-600">Write it down or take a photo. Mention it when you talk to the outreach team.</p>
          </div>
        )}
        <p className="mt-4 text-stone-700">A case manager will reach out. While you wait:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
          <li>Emergency: call <a className="underline" href="tel:911">911</a></li>
          <li>Mental health crisis: call or text <a className="underline" href="tel:988">988</a></li>
          <li>Any service, 24 hours: call <a className="underline" href="tel:211">211</a></li>
          <li>Shelter in Santa Clara County: Here4You <a className="underline" href="tel:408-385-2400">408-385-2400</a> (9 am to 7 pm daily)</li>
        </ul>
        <Link href="/intake" className="mt-6 inline-block text-sm text-brand-700 underline">Fill out another form</Link>
      </div>
    </PublicShell>
  );
}
