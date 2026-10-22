import { PublicShell } from "@/components/ui";
import { CONSENT_TEXT } from "@/lib/intake";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Request help – ConnectCare" };

export default function IntakePage() {
  return (
    <PublicShell>
      <h1 className="text-2xl font-semibold text-stone-900">Ask for help</h1>
      <p className="mt-2 text-sm text-stone-700">
        Tell us a little about what you need. A case manager from the outreach team will follow up.
        Only first name is required.
      </p>
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <strong>In danger right now?</strong> Call <a className="underline" href="tel:911">911</a>.
        For a mental health crisis, call or text <a className="underline" href="tel:988">988</a>, any time.
      </div>
      <div className="mt-6">
        <IntakeForm consentText={CONSENT_TEXT} />
      </div>
    </PublicShell>
  );
}
