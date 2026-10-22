import Link from "next/link";
import { logout } from "@/app/(public)/login/actions";
import { requireUser } from "@/lib/auth";
import { unreadThreadCount } from "@/lib/messages";
import { NavLinks } from "./nav-links";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser({ allowPasswordChange: true });
  const supervisor = user.role === "supervisor";
  const unread = await unreadThreadCount(user);
  const links = [
    { href: "/dashboard", label: "Home" },
    ...(supervisor ? [{ href: "/intake-queue", label: "Intake queue" }, { href: "/clients", label: "All clients" }] : []),
    { href: "/resources", label: "Resources" },
    { href: "/messages", label: "Messages", badge: unread },
    ...(supervisor ? [{ href: "/reports", label: "Reports" }, { href: "/team", label: "Team" }, { href: "/audit", label: "Audit log" }, { href: "/setup", label: "Setup check" }] : []),
  ];
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">CC</div>
            <span className="font-semibold text-stone-800">ConnectCare</span>
          </Link>
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/account/password" className="text-stone-600 hover:underline">
              {user.name} <span className="text-stone-400">({supervisor ? "Supervisor" : "Case manager"})</span>
            </Link>
            <form action={logout}>
              <button className="text-stone-600 underline hover:text-stone-900">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
