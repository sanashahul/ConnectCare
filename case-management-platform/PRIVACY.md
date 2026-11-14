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
- **Encrypted fields.** Names, contact details, intake answers, case notes, where a guest was seen or looked for, and care-plan text are encrypted with AES-256-GCM before they reach the database. A copy of the database alone does not reveal them; the key (`DATA_ENCRYPTION_KEY`) is also needed. Keep the key in a secret manager, separate from database backups.
- **What stays readable.** The database stores in plain text only what is needed for sorting and counting: case status, assigned case manager, city or county, need categories, the urgent flag, and the type and date of each contact log entry (met, couldn't find, update).
- **Monthly reports** read only those readable counting fields. They show counts, never names or notes. With very small numbers, a count can still point to a person, so share reports outside the team with care.
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

## Clinical managers and shift codes

- Clinical managers can open a shift's list with **just the shift code** and their name, without an account. That means anyone who has the code can open that day's list, so send each code only to the person working that shift, and use **New code** on the Shift schedule if one goes to the wrong person.
- A code only opens its own shift's list, only on the shift date (Pacific time). A code session can't open client records, the client list, messages, reports, or any other shift, and it can't set a password. Ten code attempts per 15 minutes from one network are allowed; after that, code entry is blocked for a while.
- The list shows first name and last initial, pronouns, client ID, where and when the client was last seen, the case manager's tip, and the case manager's name, plus the person's printable resource sheet (the same one-page sheet case managers print: no last name, contact details or notes). No needs list, contact details, health details or case notes.
- Notes and results from a code session are stored under a built-in "Clinical team" account and start with the name the person typed. Every code sign-in, list view and result is in the audit log with its network address.
- A supervisor can still give a clinical manager their own account (password and two-step verification) on the Team page.

## Google Form intake

The Google Form ([setup guide](google-apps-script/README.md)) is built so that Google holds client information for as short a time as possible:

- **No spreadsheet.** Responses go straight from the form to the app, not into a Google Sheet.
- **Deleted after delivery.** The app saves each response to its encrypted database, then the script deletes it from Google Forms. If delivery fails, the response stays only until the next retry (every 15 minutes).
- **Signed delivery.** Every submission is signed with a shared secret and a timestamp. The app rejects anything unsigned, tampered with, or more than five minutes old. Resending the same response never creates a duplicate client.
- **Endpoint off by default.** The app accepts Google Form submissions only when `GOOGLE_FORM_WEBHOOK_SECRET` is set.
- **Consent required.** Submissions without the consent box checked are refused.
- **Confirmation email.** The email the person receives contains only their request number and crisis lines. It does not repeat what they wrote.

What remains with Google:

- Responses exist in Google Forms for seconds, or longer if the app is down.
- Each confirmation email is sent from the script owner's Gmail, so a copy of it, containing an email address and a request number, stays in that account's Sent folder.
- Use an institution-managed Google Workspace account whose agreement with Google covers this kind of data.
- Never link the form to a Sheet, and never turn on response notification emails.

## Keeping client details in Box

Some information is better kept in Stanford Box than in this app: health details, documents, and scans of IDs or records. Stanford Box is covered by Stanford's agreements; a personal Box account is not. Confirm with the Privacy Office which Box account to use.

### One folder per client, only when needed

Each client page has a **Box folder** card. Most clients don't need one, and the card can stay empty.

1. In Stanford Box, make a folder named with the client ID (for example `CC-7K3PM`). Don't put the client's name in the folder name.
2. Share the folder with the people working that case (Box: Share → invite people). Don't use "People with the link" sharing.
3. Paste the folder link into the client page and save. The page then shows **Open in Box**, and Box asks for a Stanford login before showing anything.

The app checks that the link is an `https://…box.com` folder or shared link. It never reads the folder, so nothing in Box passes through the app.

### Confirm HIPAA information is in Box

The app never deletes a client's information on its own. Once a client has a folder, the case manager:

1. Copies the client's HIPAA information into the Box folder.
2. Deletes it from the app themselves: the profile's health answers (Edit profile), contact log notes, care plan steps, and messages.
3. Opens **Confirm HIPAA information is in Box** on the client page, checks the box, and confirms.

The card links to an in-app guide, **What counts as HIPAA information** (`/help/hipaa`). The app doesn't check or delete anything: the confirmation is the case manager's word. The card then shows who confirmed and when, the audit log records it, and the edit form reminds staff to keep health answers in Box. The folder link can be changed but not removed after that.

Clients with a Box folder show a **★ Box** badge next to their name on their page and in client lists.

### Box mode: no identifying details in the app at all

If the Privacy Office decides that *any* client information (including names and phone numbers) must stay out of this app, turn on Box mode:

- Set `PHI_IN_BOX=true` on the server, and set the script property `PHI_IN_BOX` to `true` in the Google Form script.
- The app then stores only the client ID, area, need categories, age range, language, and the work itself (care plan, tasks, contact log). It shows the client ID wherever it used to show a name.
- Every profile save drops names, pronouns, contact details, where the client stays, health details, and free-text answers, including for clients added earlier as soon as their profile is edited.
- The website request form is closed. Use the Google Form or in-person intake.
- The Google Form script sends the app only needs, area, language, and "help today". It **keeps** the full response in Google Forms so staff can copy it into the client's new Box folder; match it by the submission time. Delete the response in Google Forms once it is in Box.
- Contact log notes are still free text. Train staff to keep names and health details in Box, not in notes.

### Later: automatic folders

The next step is for the Google Form script to create the client's Box folder and file the answers into it directly, so no one copies anything and nothing waits in Google Forms. That needs a Box app approved by Stanford's Box administrators. See [docs/box-app-request.md](docs/box-app-request.md).

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
- [ ] **Google Form.** If you use it, confirm the Google Workspace account is approved for this data, and that the form is not linked to a Sheet.
- [ ] **Box.** Confirm which Box account is approved for client health information, and whether Box mode (`PHI_IN_BOX`) is required. See "Keeping client details in Box".

## Known limits

- Rate limits are kept in server memory. They work for a single server; use a shared store if you run more than one.
- There are no recovery codes for two-step verification. A supervisor resets it for staff, and the server command resets it for supervisors.
- Field encryption uses one key. Key rotation needs a re-encryption script; the ciphertext is versioned (`v1.`) to make that possible.
- The audit log is append-only in the app, but a database administrator can still change it. For stronger guarantees, export it regularly to write-once storage.
