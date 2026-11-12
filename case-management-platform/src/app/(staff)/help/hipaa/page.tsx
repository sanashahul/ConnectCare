import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "What counts as HIPAA information – ConnectCare" };

// Plain-language staff guide, linked from the Box folder card. Not legal advice: the
// Privacy Office has the final word on what the program must protect.

const IDENTIFIERS = [
  "Names, including nicknames",
  "Street addresses, cross streets, encampment or camp locations, and ZIP codes (city or county alone is fine)",
  "Dates tied to the person, such as birth date, hospital admission or discharge, or date of death (a year alone is fine)",
  "Phone numbers",
  "Email addresses",
  "Social Security numbers",
  "Medical record numbers",
  "Health plan or Medi-Cal ID numbers",
  "Other account numbers, such as a bank or benefits case number",
  "Driver's license, state ID, or other certificate or license numbers",
  "Vehicle license plates or VINs",
  "Device serial numbers, such as a phone's IMEI",
  "Web links or IP addresses that point to the person",
  "Fingerprints, voice recordings, or other biometrics",
  "Photos of their face, or anything similar",
  "Any other number, code, or detail that could single the person out (a distinctive tattoo, a rare job, a well-known nickname)",
];

export default async function HipaaGuidePage() {
  await requireUser();
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="What counts as HIPAA information" subtitle="A quick guide for deciding what belongs in a client's Box folder" />

      <Card title="The short version">
        <div className="space-y-3 text-sm text-stone-800">
          <p>
            HIPAA protects <strong>health information that can be tied to a specific person</strong>. This is called protected
            health information, or PHI. It is PHI when both parts are there:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Something about the person&apos;s health, health care, or paying for health care, <strong>and</strong></li>
            <li>Something that identifies them (see the list below).</li>
          </ol>
          <p>
            In this program, most of what we learn about a client&apos;s health counts, because we always know who they are.
            <strong> When in doubt, put it in Box.</strong>
          </p>
        </div>
      </Card>

      <Card title="Health information to keep in Box">
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-800">
          <li>Diagnoses, conditions, symptoms, injuries, and wounds</li>
          <li>Medications and prescriptions</li>
          <li>Mental health and substance use details</li>
          <li>Disability and the accommodations they need</li>
          <li>Pregnancy, sexual health, HIV, and test results</li>
          <li>Their doctor, clinic, or primary care provider (PCP), and appointments</li>
          <li>Hospital or ER visits, and treatment they received</li>
          <li>Insurance or Medi-Cal details and ID numbers</li>
          <li>Medical records, discharge papers, photos of IDs or insurance cards, and other documents</li>
        </ul>
      </Card>

      <Card title="Details that identify someone">
        <p className="mb-2 text-sm text-stone-700">
          HIPAA lists 18 kinds of identifiers. These are the ones that come up in outreach work:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-800">
          {IDENTIFIERS.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </Card>

      <Card title="Where to check in this app">
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-800">
          <li>
            <strong>Profile</strong> (Edit profile): disability, accommodations, insurance, PCP, LGBTQ+ care, most urgent need,
            and anything else they told us.
          </li>
          <li><strong>Contact log notes</strong>: edit or rewrite any note that describes their health.</li>
          <li><strong>Care plan steps</strong>: step titles and details, such as &ldquo;Refill insulin at Valley Clinic&rdquo;.</li>
          <li><strong>Messages and tasks</strong> about the client.</li>
        </ul>
        <p className="mt-3 text-sm text-stone-700">
          It&apos;s fine to keep need categories (like &ldquo;Medical care&rdquo;) and plain next steps (like &ldquo;Go to clinic
          Tuesday&rdquo;). Write the details in Box.
        </p>
      </Card>

      <Card title="Learn more">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            <a className="text-brand-700 underline" href="https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html" target="_blank" rel="noopener noreferrer">
              HHS: Summary of the HIPAA Privacy Rule
            </a>
          </li>
          <li>
            <a className="text-brand-700 underline" href="https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html" target="_blank" rel="noopener noreferrer">
              HHS: The 18 identifiers (de-identification guidance)
            </a>
          </li>
          <li>
            <a className="text-brand-700 underline" href="https://privacy.stanford.edu" target="_blank" rel="noopener noreferrer">
              Stanford University Privacy Office
            </a>{" "}
            for questions about our program
          </li>
        </ul>
        <p className="mt-3 text-xs text-stone-500">This guide is a summary, not legal advice. Ask the Privacy Office if you&apos;re unsure.</p>
        <p className="mt-3 text-sm"><Link href="/dashboard" className="text-brand-700 underline">Back to home</Link></p>
      </Card>
    </div>
  );
}
