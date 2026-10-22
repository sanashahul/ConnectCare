import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Badge, Card, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { decryptString } from "@/lib/crypto";
import { canAccessThread, markThreadRead } from "@/lib/messages";
import { setResolved } from "../actions";
import { ReplyForm } from "./reply-form";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const thread = await db.query.messageThreads.findFirst({ where: eq(schema.messageThreads.id, id) });
  if (!thread || !canAccessThread(user, thread)) notFound();
  await markThreadRead(id, user.id);

  const [msgs, cm, client] = await Promise.all([
    db
      .select({ m: schema.messages, author: schema.users.name, role: schema.users.role })
      .from(schema.messages)
      .innerJoin(schema.users, eq(schema.messages.authorId, schema.users.id))
      .where(eq(schema.messages.threadId, id))
      .orderBy(asc(schema.messages.createdAt)),
    db.query.users.findFirst({ where: eq(schema.users.id, thread.caseManagerId) }),
    thread.clientId ? db.query.clients.findFirst({ where: eq(schema.clients.id, thread.clientId) }) : null,
  ]);
  const supervisor = user.role === "supervisor";

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        back={{ href: "/messages", label: "Messages" }}
        title={decryptString(thread.subjectEnc)}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {supervisor ? `With ${cm?.name ?? "case manager"}` : "With the supervisors"}
            {client && (
              <Link href={`/clients/${client.id}`} className="font-mono font-semibold text-brand-700 underline">{client.clientCode}</Link>
            )}
            {thread.resolved && <Badge tone="green">Resolved</Badge>}
          </span>
        }
        actions={
          <form action={setResolved}>
            <input type="hidden" name="threadId" value={id} />
            <input type="hidden" name="resolved" value={thread.resolved ? "false" : "true"} />
            <button className={secondaryButtonClass}>{thread.resolved ? "Reopen" : "Mark resolved"}</button>
          </form>
        }
      />
      <Card>
        <ol className="space-y-3">
          {msgs.map(({ m, author, role }) => {
            const mine = m.authorId === user.id;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-brand-50" : "bg-stone-100"}`}>
                  <p className="mb-0.5 text-xs text-stone-500">
                    {mine ? "You" : author}{role === "supervisor" && !mine ? " (supervisor)" : ""} ·{" "}
                    {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="whitespace-pre-wrap text-stone-900">{decryptString(m.bodyEnc)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <Card><ReplyForm threadId={id} /></Card>
    </div>
  );
}
