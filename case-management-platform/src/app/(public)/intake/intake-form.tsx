"use client";

import { useActionState } from "react";
import { IntakeFields } from "@/components/intake-fields";
import { buttonClass, ErrorText } from "@/components/ui";
import { INTAKE_TEXT, type IntakeLang } from "@/lib/intake-i18n";
import { submitIntake } from "./actions";

export function IntakeForm({ lang }: { lang: IntakeLang }) {
  const [state, action, pending] = useActionState(submitIntake, undefined);
  const T = INTAKE_TEXT[lang];
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="formLang" value={lang} />
      <IntakeFields mode="public" errors={state?.fieldErrors} lang={lang} />
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-3 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>{T.consent}</span>
      </label>
      <ErrorText>{state?.error}</ErrorText>
      <button className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>{pending ? T.sending : T.send}</button>
    </form>
  );
}
