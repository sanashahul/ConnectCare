import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { CurrentUser } from "./auth";
import { displayName, type ClientProfile } from "./clients";
import { decryptJson, decryptString } from "./crypto";

// Conversations between a case manager and the supervisors. A case manager sees their own
// threads; every supervisor sees all threads. Subjects and messages are encrypted.

export function canAccessThread(user: { id: string; role: string }, thread: { caseManagerId: string }) {
  return user.role === "supervisor" || thread.caseManagerId === user.id;
}

const visibleTo = (user: CurrentUser) =>
  user.role === "supervisor" ? undefined : eq(schema.messageThreads.caseManagerId, user.id);

/** Unread = the latest message is from someone else and arrived after this person last opened the thread. */
const unreadFor = (userId: string) =>
  and(
    ne(schema.messageThreads.lastAuthorId, userId),
    or(isNull(schema.threadReads.lastReadAt), gt(schema.messageThreads.lastMessageAt, schema.threadReads.lastReadAt)),
  );

export async function listThreads(user: CurrentUser, opts: { resolved?: boolean; limit?: number } = {}) {
  const cm = alias(schema.users, "cm");
  const rows = await db
    .select({
      thread: schema.messageThreads,
      caseManagerName: cm.name,
      clientCode: schema.clients.clientCode,
      clientProfileEnc: schema.clients.profileEnc,
      unread: sql<boolean>`coalesce(${unreadFor(user.id)}, false)`,
    })
    .from(schema.messageThreads)
    .innerJoin(cm, eq(schema.messageThreads.caseManagerId, cm.id))
    .leftJoin(schema.clients, eq(schema.messageThreads.clientId, schema.clients.id))
    .leftJoin(
      schema.threadReads,
      and(eq(schema.threadReads.threadId, schema.messageThreads.id), eq(schema.threadReads.userId, user.id)),
    )
    .where(and(visibleTo(user), opts.resolved === undefined ? undefined : eq(schema.messageThreads.resolved, opts.resolved)))
    .orderBy(desc(schema.messageThreads.lastMessageAt))
    .limit(opts.limit ?? 200);
  return rows.map(({ clientProfileEnc, ...r }) => ({
    ...r,
    subject: decryptString(r.thread.subjectEnc),
    clientName: clientProfileEnc ? displayName(decryptJson<ClientProfile>(clientProfileEnc)) : null,
  }));
}

export async function unreadThreadCount(user: CurrentUser): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.messageThreads)
    .leftJoin(
      schema.threadReads,
      and(eq(schema.threadReads.threadId, schema.messageThreads.id), eq(schema.threadReads.userId, user.id)),
    )
    .where(and(visibleTo(user), unreadFor(user.id)));
  return n;
}

export async function markThreadRead(threadId: string, userId: string) {
  await db
    .insert(schema.threadReads)
    .values({ threadId, userId, lastReadAt: new Date() })
    .onConflictDoUpdate({ target: [schema.threadReads.threadId, schema.threadReads.userId], set: { lastReadAt: new Date() } });
}
