import { AGE_RANGES, CITIES, DISABILITY_ANSWERS, INSURANCE, INTAKE_NEEDS, LANGUAGES, OUTREACH_SITES, SLEEPING } from "@/lib/options";
import type { ClientProfile } from "@/lib/clients";
import { INTAKE_TEXT, optionText, type IntakeLang } from "@/lib/intake-i18n";
import { inputClass, labelClass } from "./ui";

type Defaults = Partial<ClientProfile> & { city?: string | null; needs?: string[]; urgent?: boolean };

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

function Select({ name, options, defaultValue, placeholder, lang = "en" }: {
  name: string; options: readonly string[]; defaultValue?: string | null; placeholder?: string; lang?: IntakeLang;
}) {
  return (
    <select id={name} name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">{placeholder ?? INTAKE_TEXT[lang].choose}</option>
      {/* Values stay in English so answers reach case managers in English. */}
      {options.map((o) => <option key={o} value={o}>{optionText(lang, o)}</option>)}
    </select>
  );
}

/** Fields shared by the public intake form and the staff client form. The public form can be in Spanish or Vietnamese. */
export function IntakeFields({ mode, defaults = {}, errors = {}, lang = "en" }: {
  mode: "public" | "staff";
  defaults?: Defaults;
  errors?: Record<string, string>;
  lang?: IntakeLang;
}) {
  const you = mode === "public";
  const T = INTAKE_TEXT[you ? lang : "en"];
  const opt = <span className="font-normal text-stone-500">{T.optional}</span>;
  return (
    <div className="space-y-6">
      {you && (
        <fieldset>
          <legend className={labelClass}>{T.whoFilling}</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="filledOutBy" value="self" defaultChecked /> {T.forMyself}</label>
            <label className="flex items-center gap-2"><input type="radio" name="filledOutBy" value="helper" /> {T.helpingSomeone}</label>
          </div>
        </fieldset>
      )}
      {!you && <input type="hidden" name="filledOutBy" value={defaults.filledOutBy ?? "staff"} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">{T.firstName}</label>
          <input id="firstName" name="firstName" required maxLength={60} defaultValue={defaults.firstName} className={inputClass} />
          <FieldError msg={errors.firstName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">{T.lastName} {opt}</label>
          <input id="lastName" name="lastName" maxLength={60} defaultValue={defaults.lastName} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="pronouns">{T.pronouns} {opt}</label>
          <input id="pronouns" name="pronouns" maxLength={40} placeholder={T.pronounsExample} defaultValue={defaults.pronouns} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ageRange">{T.age}</label>
          <Select name="ageRange" options={AGE_RANGES} defaultValue={defaults.ageRange} lang={lang} />
        </div>
        <div>
          <label className={labelClass} htmlFor="language">{T.language}</label>
          <Select name="language" options={LANGUAGES} defaultValue={defaults.language} lang={lang} />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">{you ? T.reachYou : "How can we reach them?"}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="phone">{T.phone} {opt}</label>
            <input id="phone" name="phone" type="tel" maxLength={30} defaultValue={defaults.phone} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">{T.email} {opt}</label>
            <input id="email" name="email" type="email" maxLength={120} defaultValue={defaults.email} className={inputClass} />
            <FieldError msg={errors.email} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="howToReach">{you ? T.otherWays : "Other ways to find them"}</label>
          <input id="howToReach" name="howToReach" maxLength={300} placeholder={T.otherWaysExample} defaultValue={defaults.howToReach} className={inputClass} />
        </div>
        <fieldset>
          <legend className="text-sm text-stone-800">{T.okMessage}</legend>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="okToLeaveMessage" value="yes" defaultChecked={defaults.okToLeaveMessage === true} /> {optionText(lang, "Yes")}</label>
            <label className="flex items-center gap-2"><input type="radio" name="okToLeaveMessage" value="no" defaultChecked={defaults.okToLeaveMessage === false} /> {optionText(lang, "No")}</label>
          </div>
        </fieldset>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="city">{you ? T.area : "Which area are they in?"}</label>
          <Select name="city" options={CITIES.map((c) => c.city)} defaultValue={defaults.city} lang={lang} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sleeping">{you ? T.staying : "Where are they staying right now?"}</label>
          <Select name="sleeping" options={SLEEPING} defaultValue={defaults.sleeping} lang={lang} />
        </div>
        <div>
          <label className={labelClass} htmlFor="insurance">{T.insurance}</label>
          <Select name="insurance" options={INSURANCE} defaultValue={defaults.insurance} lang={lang} />
        </div>
        <div>
          <label className={labelClass} htmlFor="outreachSite">{you ? T.heard : "Where did they hear about us?"}</label>
          <Select name="outreachSite" options={OUTREACH_SITES} defaultValue={defaults.outreachSite} lang={lang} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-stone-900">{you ? T.needs : "What help do they need?"} <span className="font-normal text-stone-500">{T.checkAll}</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INTAKE_NEEDS.map((n) => (
            <label key={n.key} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50">
              <input type="checkbox" name="needs" value={n.key} defaultChecked={defaults.needs?.includes(n.key)} /> {optionText(lang, n.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-stone-900">{T.match}</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="hasVehicle" defaultChecked={defaults.hasVehicle} /> {T.hasCar}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasPets" defaultChecked={defaults.hasPets} /> {T.hasPet}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasChildren" defaultChecked={defaults.hasChildren} /> {you ? T.hasChildren : "Has children with them"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="lgbtqCare" defaultChecked={defaults.lgbtqCare} /> {you ? T.lgbtq : "Would like LGBTQ+ affirming care"}</label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="disability">{you ? T.disability : "Do they have a disability, or need any accommodations?"}</label>
          <Select name="disability" options={DISABILITY_ANSWERS} defaultValue={defaults.disability} placeholder={T.optional} lang={lang} />
        </div>
        <div>
          <label className={labelClass} htmlFor="accessNeeds">{T.accessNeeds}</label>
          <input id="accessNeeds" name="accessNeeds" maxLength={1000} placeholder={T.accessExample} defaultValue={defaults.accessNeeds} className={inputClass} />
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <input type="checkbox" name="urgent" defaultChecked={defaults.urgent} /> {T.urgent}
        </label>
        <input name="urgentDetails" maxLength={500} placeholder={T.urgentDetails} defaultValue={defaults.urgentDetails} className={`${inputClass} mt-2`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="otherInfo">{you ? T.otherInfo : "Anything else to note?"}</label>
        <textarea id="otherInfo" name="otherInfo" rows={3} maxLength={1500} defaultValue={defaults.otherInfo} className={inputClass} />
        {you && <p className="mt-1 text-xs text-stone-500">{T.noSsn}</p>}
      </div>
    </div>
  );
}
