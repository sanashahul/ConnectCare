"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { encryptString } from "@/lib/crypto";
import { canAccessThread, markThreadRead } from "@/lib/messages";

export type MessageState = { error?: string; ok?: boolean } | undefined;

const NewThread = z.object({
  subject: z.string().trim().min(1, "Add a short subject.").max(200),
  body: z.string().trim().min(1, "Write your message.").max(5000),
  clientId: z.string().optional().transform((v) => v || null),
  caseManagerId: z.string().optional().transform((v) => v || null),
});

export async function startThread(_: MessageState, form: FormData): Promise<MessageState> {
  const user = await requireUser();
  const parsed = NewThread.safeParse({
    subject: form.get("subject"),
    body: form.get("body"),
    clientId: form.get("clientId") ?? undefined,
    caseManagerId: form.get("caseManagerId") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Case managers write to the supervisors; supervisors pick which case manager to write to.
  let caseManagerId = user.id;
  if (user.role === "supervisor") {
    const cm = d.caseManagerId
      ? await db.query.users.findFirst({ where: and(eq(schema.users.id, d.caseManagerId), eq(schema.users.role, "case_manager")) })
      : null;
    if (!cm) return { error: "Choose the case manager to message." };
    caseManagerId = cm.id;
  }
  if (d.clientId) {
    const client = await getClientForUser(user, d.clientId);
    if (!client) return { error: "You can only link one of your own clients." };
  }

  const now = new Date();
  const threadId = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.messageThreads)
      .values({
        caseManagerId,
        createdById: user.id,
        clientId: d.clientId,
        subjectEnc: encryptString(d.subject),
        lastAuthorId: user.id,
        lastMessageAt: now,
      })
      .returning({ id: schema.messageThreads.id });
    await tx.insert(schema.messages).values({ threadId: t.id, authorId: user.id, bodyEnc: encryptString(d.body), createdAt: now });
    return t.id;
  });
  await markThreadRead(threadId, user.id);
  await audit({ userId: user.id, action: "message.thread_started", clientId: d.clientId, detail: { threadId } });
  redirect(`/messages/${threadId}`);
}

async function threadOr404(threadId: string) {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  const thread = await db.query.messageThreads.findFirst({ where: eq(schema.messageThreads.id, threadId) });
  if (!thread || !canAccessThread(user, thread)) notFound();
  return { user, thread };
}

export async function reply(threadId: string, _: MessageState, form: FormData): Promise<MessageState> {
  const { user, thread } = await threadOr404(threadId);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Write your reply." };
  if (body.length > 5000) return { error: "That message is too long." };
  const now = new Date();
  await db.insert(schema.messages).values({ threadId, authorId: user.id, bodyEnc: encryptString(body), createdAt: now });
  await db
    .update(schema.messageThreads)
    .set({ lastAuthorId: user.id, lastMessageAt: now, resolved: false })
    .where(eq(schema.messageThreads.id, threadId));
  await markThreadRead(threadId, user.id);
  await audit({ userId: user.id, action: "message.reply", clientId: thread.clientId, detail: { threadId } });
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function setResolved(form: FormData) {
  const threadId = String(form.get("threadId"));
  const { user } = await threadOr404(threadId);
  const resolved = form.get("resolved") === "true";
  await db.update(schema.messageThreads).set({ resolved }).where(eq(schema.messageThreads.id, threadId));
  await audit({ userId: user.id, action: resolved ? "message.resolved" : "message.reopened", detail: { threadId } });
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
}
