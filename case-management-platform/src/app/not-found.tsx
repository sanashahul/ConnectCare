import Link from "next/link";
import { PublicShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PublicShell>
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-stone-700">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className="mt-4 inline-block text-brand-700 underline">Go to dashboard</Link>
    </PublicShell>
  );
}
