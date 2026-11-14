import Link from "next/link";
import { PublicShell } from "@/components/ui";
import { ShiftCodeEntry } from "./form";

export const dynamic = "force-dynamic";

export default function ShiftCodePage() {
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Clinical manager</h1>
        <p className="mb-5 text-sm text-stone-600">
          Enter the shift code your supervisor sent you today. You&apos;ll see the people to look for at your site.
        </p>
        <ShiftCodeEntry />
        <p className="mt-4 text-xs text-stone-500">The code only works today. Please don&apos;t share it, and sign out when your shift ends.</p>
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Staff with an account? <Link className="text-brand-700 underline" href="/login">Sign in here</Link>.
      </p>
    </PublicShell>
  );
}
