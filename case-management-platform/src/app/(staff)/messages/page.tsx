import Link from "next/link";
import { Badge, buttonClass, Card, EmptyState, formatDate, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listThreads } from "@/lib/messages";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser();
  const supervisor = user.role === "supervisor";
  const show = (await searchParams).show === "resolved" ? "resolved" : "open";
  const threads = await listThreads(user, { resolved: show === "resolved" });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Messages"
        subtitle={supervisor ? "Messages from your case managers." : "Your messages with the supervisors."}
        actions={<Link href="/messages/new" className={buttonClass}>{supervisor ? "+ Message a case manager" : "+ Message a supervisor"}</Link>}
      />
      <div className="mb-3 flex gap-2 text-sm">
        <Link href="/messages" className={show === "open" ? "font-semibold underline" : "underline"}>Open</Link>
        <Link href="/messages?show=resolved" className={show === "resolved" ? "font-semibold underline" : "underline"}>Resolved</Link>
      </div>
      <Card>
        {threads.length === 0 ? (
          <EmptyState>{show === "open" ? "No open conversations." : "No resolved conversations."}</EmptyState>
        ) : (
          <ul className="-mx-3 divide-y divide-stone-100">
            {threads.map((t) => (
              <li key={t.thread.id}>
                <Link href={`/messages/${t.thread.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 hover:bg-stone-50">
                  {t.unread ? <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-label="Unread" /> : <span className="w-2.5" />}
                  <span className={`min-w-0 flex-1 truncate ${t.unread ? "font-semibold text-stone-900" : "text-stone-800"}`}>{t.subject}</span>
                  {supervisor && <span className="text-sm text-stone-600">{t.caseManagerName}</span>}
                  {t.clientName && <Badge tone="brand">{t.clientName}</Badge>}
                  {t.unread && <Badge tone="blue">New</Badge>}
                  <span className="text-xs text-stone-500">{formatDate(t.thread.lastMessageAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
