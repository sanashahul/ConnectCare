# Request: Box app for ConnectCare intake (draft)

A draft to send to Stanford's Box administrators (University IT) when asking for a custom Box app. Edit the bracketed parts before sending.

---

**To:** Stanford Box administrators
**From:** [Your name], [program / department]
**Subject:** Request to approve a custom Box app for an outreach intake form

Hello,

Our team runs [program name], a street medicine and outreach case management program. People we serve fill out a Google Form (run from a Stanford Google account) to ask for help. We'd like each response to go straight into a Stanford Box folder for that client, so that names, contact details, and health information are kept in Box and not in our case management website.

**What the app would do**

1. When someone submits the form, our Google Apps Script asks our case management app for a new client ID (for example `CC-7K3PM`). Only non-identifying answers go to the app: need categories, area, language, and whether they need help today.
2. The script creates a folder named with that client ID inside one parent folder, "[ConnectCare clients]", which our team owns.
3. It saves the full form response in that folder as a document.
4. It records the folder link on the client's page in our app, so a case manager can click "Open in Box".

**What we are asking for**

- A custom app using **server authentication (Client Credentials Grant)**, so the script signs in as the app's service account rather than as a person.
- Scope: **Read and write all files and folders**. The service account would be added as an Editor on the "[ConnectCare clients]" folder only, so it can't reach anything else in Stanford Box.
- No user impersonation ("as-user"), no enterprise-wide access, and no webhooks.

**Security**

- The app's client ID and secret would be stored in the Apps Script's script properties, readable only by the form's editors ([names]).
- Client folders are shared only with the case managers on our team. We don't use "People with the link" sharing.
- After the response is saved in Box, the script deletes it from Google Forms. The form is not linked to a Google Sheet.

**Questions for you**

1. Is Stanford Box approved for High Risk data, including PHI, for our use?
2. Is a Client Credentials Grant app the right setup, or do you prefer JWT or another method?
3. Is it acceptable for form responses to pass through Google Apps Script on the way to Box, or does the Privacy Office need to review that step?
4. Who should own the app and the parent folder long term (a person, or a departmental account)?

Thank you,
[Your name]
[Contact]

---

## Notes for whoever builds it

- Box API calls the script would make: `POST /oauth2/token` (client credentials, `box_subject_type=enterprise`), `POST /2.0/folders` (create `CC-XXXXX` under the parent folder), `POST /2.0/files/content` (upload the response), and optionally `POST /2.0/collaborations` (share with the assigned case manager).
- The app needs one new signed endpoint that lets the script set a client's Box folder link (the same HMAC signing as `/api/intake/google`). The folder link is checked with `parseBoxUrl` in `src/lib/box.ts`.
- Use with Box mode (`PHI_IN_BOX=true` on the server and in the script). The script's `deliver_` then deletes the response only after the Box upload succeeds.
