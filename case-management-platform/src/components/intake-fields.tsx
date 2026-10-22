import { AGE_RANGES, CITIES, DISABILITY_ANSWERS, INSURANCE, INTAKE_NEEDS, LANGUAGES, OUTREACH_SITES, SLEEPING } from "@/lib/options";
import type { ClientProfile } from "@/lib/clients";
import { inputClass, labelClass } from "./ui";

type Defaults = Partial<ClientProfile> & { city?: string | null; needs?: string[]; urgent?: boolean };

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

function Select({ name, options, defaultValue, placeholder = "Choose…" }: {
  name: string; options: readonly string[]; defaultValue?: string | null; placeholder?: string;
}) {
  return (
    <select id={name} name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** Fields shared by the public intake form and the staff client form. */
export function IntakeFields({ mode, defaults = {}, errors = {} }: {
  mode: "public" | "staff";
  defaults?: Defaults;
  errors?: Record<string, string>;
}) {
  const you = mode === "public";
  return (
    <div className="space-y-6">
      {you && (
        <fieldset>
          <legend className={labelClass}>Who is filling out this form?</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="filledOutBy" value="self" defaultChecked /> I am asking for help for myself</label>
            <label className="flex items-center gap-2"><input type="radio" name="filledOutBy" value="helper" /> I am helping someone else</label>
          </div>
        </fieldset>
      )}
      {!you && <input type="hidden" name="filledOutBy" value={defaults.filledOutBy ?? "staff"} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">First name or nickname *</label>
          <input id="firstName" name="firstName" required maxLength={60} defaultValue={defaults.firstName} className={inputClass} />
          <FieldError msg={errors.firstName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">Last name <span className="font-normal text-stone-500">(optional)</span></label>
          <input id="lastName" name="lastName" maxLength={60} defaultValue={defaults.lastName} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="pronouns">Pronouns <span className="font-normal text-stone-500">(optional)</span></label>
          <input id="pronouns" name="pronouns" maxLength={40} placeholder="e.g. she/her, he/him, they/them" defaultValue={defaults.pronouns} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ageRange">Age</label>
          <Select name="ageRange" options={AGE_RANGES} defaultValue={defaults.ageRange} />
        </div>
        <div>
          <label className={labelClass} htmlFor="language">Preferred language</label>
          <Select name="language" options={LANGUAGES} defaultValue={defaults.language} />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">How can we reach {you ? "you" : "them"}?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="phone">Phone <span className="font-normal text-stone-500">(optional)</span></label>
            <input id="phone" name="phone" type="tel" maxLength={30} defaultValue={defaults.phone} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">Email <span className="font-normal text-stone-500">(optional)</span></label>
            <input id="email" name="email" type="email" maxLength={120} defaultValue={defaults.email} className={inputClass} />
            <FieldError msg={errors.email} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="howToReach">Other ways to find {you ? "you" : "them"}</label>
          <input id="howToReach" name="howToReach" maxLength={300} placeholder="e.g. at Hope's Corner on Thursdays" defaultValue={defaults.howToReach} className={inputClass} />
        </div>
        <fieldset>
          <legend className="text-sm text-stone-800">Is it OK to leave a message?</legend>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="okToLeaveMessage" value="yes" defaultChecked={defaults.okToLeaveMessage === true} /> Yes</label>
            <label className="flex items-center gap-2"><input type="radio" name="okToLeaveMessage" value="no" defaultChecked={defaults.okToLeaveMessage === false} /> No</label>
          </div>
        </fieldset>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="city">Which area {you ? "are you" : "are they"} in?</label>
          <Select name="city" options={CITIES.map((c) => c.city)} defaultValue={defaults.city} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sleeping">Where {you ? "are you" : "are they"} staying right now?</label>
          <Select name="sleeping" options={SLEEPING} defaultValue={defaults.sleeping} />
        </div>
        <div>
          <label className={labelClass} htmlFor="insurance">Health insurance</label>
          <Select name="insurance" options={INSURANCE} defaultValue={defaults.insurance} />
        </div>
        <div>
          <label className={labelClass} htmlFor="outreachSite">Where did {you ? "you" : "they"} hear about us?</label>
          <Select name="outreachSite" options={OUTREACH_SITES} defaultValue={defaults.outreachSite} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-stone-900">What help {you ? "do you" : "do they"} need? <span className="font-normal text-stone-500">Check all that apply.</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INTAKE_NEEDS.map((n) => (
            <label key={n.key} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50">
              <input type="checkbox" name="needs" value={n.key} defaultChecked={defaults.needs?.includes(n.key)} /> {n.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-stone-900">Anything else that helps us match services?</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="hasVehicle" defaultChecked={defaults.hasVehicle} /> Has a car or RV</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasPets" defaultChecked={defaults.hasPets} /> Has a pet</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasChildren" defaultChecked={defaults.hasChildren} /> Has children with {you ? "you" : "them"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="lgbtqCare" defaultChecked={defaults.lgbtqCare} /> {you ? "I would" : "Would"} like LGBTQ+ affirming care</label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="disability">{you ? "Do you have" : "Do they have"} a disability, or need any accommodations?</label>
          <Select name="disability" options={DISABILITY_ANSWERS} defaultValue={defaults.disability} placeholder="Optional" />
        </div>
        <div>
          <label className={labelClass} htmlFor="accessNeeds">If yes, what would help?</label>
          <input id="accessNeeds" name="accessNeeds" maxLength={1000} placeholder="e.g. wheelchair access, ASL interpreter, large print" defaultValue={defaults.accessNeeds} className={inputClass} />
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <input type="checkbox" name="urgent" defaultChecked={defaults.urgent} /> Something is urgent today
        </label>
        <input name="urgentDetails" maxLength={500} placeholder="What is urgent? (optional)" defaultValue={defaults.urgentDetails} className={`${inputClass} mt-2`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="otherInfo">Anything else {you ? "you'd like us to know" : "to note"}?</label>
        <textarea id="otherInfo" name="otherInfo" rows={3} maxLength={1500} defaultValue={defaults.otherInfo} className={inputClass} />
        {you && <p className="mt-1 text-xs text-stone-500">Share only what you are comfortable with. Please don&apos;t include Social Security numbers.</p>}
      </div>
    </div>
  );
}
