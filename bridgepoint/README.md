# BridgePoint

A referral platform for organizations serving unhoused clients. Outreach staff
refer a client to a partner organization; the partner keeps the referral's
status current; the referring staff member can see what actually happened.

**BridgePoint is a standalone application.** It shares no code, dependencies, or
build configuration with the ConnectCare mobile app that lives elsewhere in this
repository. The directory can be moved into its own repository as-is.

## Running it

```bash
cd bridgepoint
npm install
npm run dev      # http://localhost:5175
npm run build    # typecheck + production build
```

## How a referral moves

```
sent ──> accepted ──> in_progress ──> closed
            │              ↑
            └─> waitlisted ┘
```

Transitions are enforced in `src/types/index.ts` (`ALLOWED_TRANSITIONS`) rather
than in the UI, so both sides of a referral obey the same rules. Closing a
referral requires an outcome (housed, client declined, no capacity, and so on).
A closed referral cannot be reopened — its history stands as the record.

Every status change appends a `StatusEvent` recording who changed it, when, and
any note. History is append-only.

## The two sides

**Referring staff** create referrals, pick a partner (partners offering the
requested service are suggested first), and watch a dashboard that flags
anything a partner has not acknowledged in 48 hours.

**Partner organizations** get either a queue inside the app, or — the flow this
build is designed around — a link in an email or text that opens the referral
and lets them update its status with no account at all. That link is at
`/r/:token`, where the token is 24 bytes of crypto randomness generated per
referral. The token is the credential, so treat those links as sensitive.

## What a referral carries

Deliberately minimal: client name, contact details, the service requested,
urgency, and an optional note from the referring staff member. No immigration
status, no medical detail, no questionnaire history. The note field goes to
another organization, and the form says so.

## Architecture, and the backend that is not here yet

Everything is stored in the browser's `localStorage`. That means **two real
organizations on two devices cannot yet see each other's referrals** — this
build lets one person walk both sides of the flow on one machine, which is
enough to test the model and demo it, and not enough to run in production.

The code is arranged so that adding a backend is a contained change:

| File | Role |
|---|---|
| `src/services/referralService.ts` | `ReferralService` interface + `LocalReferralService`. Swap the export at the bottom for an HTTP implementation and no screen changes. |
| `src/services/notificationService.ts` | `Notifier` interface. `LocalNotifier` composes the real email/SMS body and stores it as an outbox entry for staff to send by hand. A server-backed notifier sends it for real. |
| `src/services/storage.ts` | The only module that touches `localStorage`. |
| `src/context/SessionContext.tsx` | Identity for attribution and routing — **not** authentication. |

To go multi-organization you need, roughly in order:

1. A server (Supabase, Firebase, or your own) holding referrals and partners.
2. Real authentication, replacing `SessionContext`.
3. Server-side email/SMS delivery — an API key can never ship in browser code.
4. Access rules so a partner reads only referrals addressed to their org.
5. A retention policy, and a decision on whether client consent is recorded
   before a referral is sent. This build does not track consent.

Until then the sign-in screen says plainly that data stays in the browser.

## Layout

```
src/
  types/       domain model and the status machine
  services/    data access, notifications, storage, seed data
  context/     session
  components/  status badges, pipeline rail, timeline, top bar
  pages/       sign-in, staff dashboard, new referral, detail,
               partner inbox, partner link page, partners admin
  utils/       date formatting
```
