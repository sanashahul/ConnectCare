# Privacy and security

This app holds sensitive information about vulnerable people: health needs, where they sleep, and how to reach them. The design goal is to **collect less, lock up what we collect, limit who can see it, and record who looked.**

This document describes what the software does. It is not legal advice. Before using the app with real clients, go through the go-live checklist at the end with your privacy office (for work under Stanford Medicine, the University Privacy Office and Information Security Office).

## What the software does

### Collect less
- **Minimal intake form.** Only a first name or nickname is required. The form does not ask for Social Security numbers, immigration status, date of birth, or diagnoses.
- **Coarse age.** Age is collected as a range, not a birth date.
- **Consent before saving.** The public form must be consented to before it saves anything, and the date of consent is stored with the record.
- **Printouts carry little.** Resource sheets leave out the last name, contact details, and notes. Even the first name is off by default, in case the sheet is lost.

- **IDs, not names.** Every client gets a random ID (for example `CC-7K3PM`). It is random rather than numbered in order, so it reveals nothing about how many people are served or when someone joined. Dashboards, lists, the intake queue, and the audit log show only the ID. The name appears only inside the client's own record, which only their case manager and supervisors can open.

### Lock it up
- **Encrypted fields.** Names, contact details, intake answers, case notes, and care-plan text are encrypted with AES-256-GCM before they reach the database. A copy of the database alone does not reveal them; the key (`DATA_ENCRYPTION_KEY`) is also needed. Keep the key in a secret manager, separate from database backups.
- **What stays readable.** The database stores in plain text only what is needed for sorting and counting: case status, assigned case manager, city or county, need categories, and the urgent flag.
- **Hosting.** Use a database with encryption at rest, and serve the app over HTTPS only. The app sends HSTS.
- **Passwords.** Passwords are hashed with scrypt. Two-step-verification secrets are encrypted.

### Limit who can see it
- **No self sign-up.** A supervisor creates every account, and every account must set up two-step verification (an authenticator app) before it can see anything.
- **Role-based access.** Case managers can open only clients assigned to them. Asking for any other client's page returns "not found," which does not even confirm the client exists. Supervisors can see all clients.
- **Sign-in protections:**
  - Sessions end after 30 minutes of inactivity (configurable) and after 12 hours in any case.
  - An account locks for 15 minutes after 5 wrong passwords.
  - An authenticator code cannot be used twice.
  - Deactivating an account signs that person out everywhere at once.
- **Browser protections:**
  - Pages are sent with `Cache-Control: no-store`, so browsers do not keep copies of client pages.
  - Search engines are told not to index the site.
  - Other sites cannot embed the app in a frame.
  - A strict Content Security Policy limits what can run on the page.
- **Right to delete.** A supervisor can permanently delete a client's data when the client asks.

### Record who looked
- **Audit log.** The log records every sign-in, failed sign-in, view of a client record, change, assignment, printout, deletion, and AI request.
- **What the log contains.** Each entry says who did it, when, and to which record. It never contains names or note text. Supervisors can read the log in the app.

### AI assistant
- **On when configured.** It runs whenever `ANTHROPIC_API_KEY` is set; `AI_ENABLED=false` turns it off.
- **What it receives.** Only de-identified fields: county, need categories, age range, language, insurance type, sleeping situation, and four yes/no flags. It also gets the public resource directory and an optional question. The question is scrubbed of names, phone numbers, emails, dates, and street addresses.
- **What it never receives.** Names, client IDs, contact details, intake free text, and case notes.
- **Transparency.** Staff see the exact list of what will be sent before every request.
- **Its suggestions are checked:**
  - It may only reference vetted resources by their ID; IDs it makes up are dropped.
  - Anything from outside the directory is labeled **unverified**.
  - Unverified suggestions stay off printouts until a case manager records how they checked them.
- **Caveat on de-identification.** County plus a detailed need profile is *not* the same as HIPAA "Safe Harbor" de-identification, because a county is a geographic area smaller than a state. Confirm with your privacy office that the AI account you use is covered by an approved agreement (for example, a BAA or your institution's approved AI service).

## Why not Google Forms and a spreadsheet?

The first plan was a Google Form that feeds a spreadsheet, which a supervisor then sorts. That would put a second, unencrypted copy of every guest's information in a Google account:

- The copy would sit outside the app's access rules and audit log.
- It would be easy to share by accident and hard to delete completely.
- Google services are usually not approved for health information unless your institution's agreement with Google covers them.

The built-in form and intake queue do the same job, and the data never leaves the protected database.

If you must keep a Google Form, use only an institution-managed Google Workspace that is approved for this data. Import the responses into the app, then delete them from Google.

## Go-live checklist

Work through these with your privacy and security offices before entering real client data:

- [ ] **Risk assessment.** Complete your institution's data risk assessment (at Stanford: classify the data, likely High Risk, and follow the minimum security standards for that class).
- [ ] **Hosting.** Choose an approved host and database. Confirm encryption at rest, backups, TLS, and who at the hosting company can access data.
- [ ] **Key management.** Store `DATA_ENCRYPTION_KEY` in a secret manager. Decide who can access it, and record how to recover it. If the key is lost, the encrypted data cannot be recovered.
- [ ] **Consent wording.** Have the consent wording on the intake form (`src/lib/intake.ts`, `CONSENT_TEXT`) reviewed. Promise only what the organization can keep.
- [ ] **Retention.** Decide how long closed cases are kept, then delete them on that schedule. The app can delete individual clients; a scheduled job can be added.
- [ ] **AI.** Confirm the AI account (`ANTHROPIC_API_KEY`) is covered by an approved vendor agreement.
- [ ] **Training.** Train staff on these rules:
  - Do not type identifying details into the AI question box or into resource problem reports.
  - Do not share temporary passwords by email or text.
  - Lock or sign out of shared computers.
- [ ] **Leavers.** When someone leaves the team, deactivate their account the same day and reassign their clients.
- [ ] **Audit review.** Look at the audit log regularly, for example monthly.
- [ ] **Incident plan.** Decide who to call if a device is lost or you suspect a breach.
- [ ] **Minors.** Decide how to handle intake from people under 18 (consent and mandated reporting).
- [ ] **Public form.** Put the public form behind your organization's domain, so guests can recognize it as yours.

## Known limits

- Rate limits are kept in server memory. They work for a single server; use a shared store if you run more than one.
- There are no recovery codes for two-step verification. A supervisor resets it for staff, and the server command resets it for supervisors.
- Field encryption uses one key. Key rotation needs a re-encryption script; the ciphertext is versioned (`v1.`) to make that possible.
- The audit log is append-only in the app, but a database administrator can still change it. For stronger guarantees, export it regularly to write-once storage.
