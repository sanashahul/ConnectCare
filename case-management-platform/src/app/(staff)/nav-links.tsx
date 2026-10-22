"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 ${active ? "bg-brand-50 font-semibold text-brand-800" : "text-stone-700 hover:bg-stone-100"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
