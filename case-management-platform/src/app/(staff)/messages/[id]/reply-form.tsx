"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonClass, ErrorText, inputClass } from "@/components/ui";
import { reply } from "../actions";

export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState(reply.bind(null, threadId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <label className="sr-only" htmlFor="reply">Reply</label>
      <textarea id="reply" name="body" required rows={3} maxLength={5000} className={inputClass} placeholder="Write a reply…" />
      <ErrorText>{state?.error}</ErrorText>
      <button className={buttonClass} disabled={pending}>{pending ? "Sending…" : "Send reply"}</button>
    </form>
  );
}
