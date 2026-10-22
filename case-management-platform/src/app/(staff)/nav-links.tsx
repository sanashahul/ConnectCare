"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; badge?: number }[] }) {
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
            {/* The count is worked out before an open conversation is marked read, so hide it there. */}
            {l.badge && !/^\/messages\/[0-9a-f-]{36}$/.test(path) ? (
              <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white" aria-label={`${l.badge} unread`}>
                {l.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
