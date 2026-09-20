# ePasigLib

A library management system for an academic library in Pasig City, Philippines — a public
catalogue for patrons and a role-gated back office for library staff, built on React and
Firebase.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Functions_v2-FFCA28?logo=firebase&logoColor=black)
![Node](https://img.shields.io/badge/Node-22-5FA04E?logo=nodedotjs&logoColor=white)

---

## What it does

The system is two applications sharing one Firebase backend.

**OPAC** — the public-facing catalogue. Anyone can browse and search the collection;
signed-in patrons get a borrowing cart, a saved-items shelf, reservation requests,
renewals, a notification inbox, library news and announcements, book suggestions, and a
live chat line to the reference desk.

**LMS** — the staff back office. Cataloguing, patron and staff records, ID verification,
the full circulation desk (check-out, check-in, renewals, reservation approval, and the
history behind each), a reporting suite, and the Library Desk for publishing news and
announcements and answering patron chats.

## Highlights

**Sixteen granular staff permissions, not three user roles.** Every staff account carries
an independent boolean per capability — `CatalogingAdd`, `Checkout`, `ApproveRenewals`,
`VerifyIDs`, `ReportGeneration`, `LiveChat`, and so on. Routes are wrapped in a `RouteGate`
that can demand a user type, require *all* of a set of roles, or require *any* of them, so
a cataloguer and a circulation clerk see genuinely different applications. The same
permissions are re-checked server-side — the client gate is convenience, not security.

**Circulation rules are data, not code.** Loan periods, renewal limits, hold-shelf expiry,
pickup windows and cutoff hours, overdue and assumed-lost thresholds, cart and saved-item
caps all live in a single `metadata/circulation_policy` document, cached for 60 seconds and
falling back to a typed default. The librarian changes a loan period without a redeploy.

**A library calendar that moves due dates.** Closures and non-service days are stored
alongside the policy, and a scheduled job rolls affected due dates forward so a book is
never due on a day the library is shut.

**Scheduled jobs do the circulation bookkeeping.** Overdue sweeps, hold-shelf expiry,
pending-request expiry, borrower reminders, settled-reservation purges, stale anonymous
user cleanup, expired verification-token and password-reset collection, and abandoned guest
chat timeouts all run on cron rather than on user traffic.

**Search is a maintained index, not a live scan.** A Firestore trigger writes into an
inverted search index whenever a collection record changes, a daily job refreshes and
compacts it, and the catalogue is additionally served over a cacheable public `GET`
endpoint so unauthenticated browsing never costs a Firestore read per visitor.

**Defence in depth.** Firestore and Storage rules are deny-by-default with narrow
exceptions. Writes go through validated callable functions rather than direct client
writes, reCAPTCHA v3 guards registration and login, Firebase App Check attests the client,
and SMTP credentials and third-party API keys are held in Firebase Secret Manager — never
in the repository.

## Architecture

```
web/
├─ frontend/                 React 19 + Vite SPA
│  └─ src/
│     ├─ app/                router, role gates, lazy route map
│     ├─ features/
│     │  ├─ auth/            login, registration, email verification, password reset
│     │  ├─ opac/            catalogue, cart, profile, news, chat, notifications
│     │  └─ lms/             circulation, collections, patrons, staff, reports,
│     │                      library desk
│     ├─ components/         shared UI (Radix primitives + Tailwind)
│     ├─ hooks/  lib/        data access, auth context, helpers
│     └─ assets/
│
├─ functions/                Firebase Cloud Functions v2 (Node 22, TypeScript)
│  └─ src/
│     ├─ api/                validated callable write surface
│     ├─ core/               batching, pagination, guards, errors, time, captcha
│     ├─ config/             runtime config and constants
│     └─ modules/
│        ├─ auth/            registration, verification, password reset, login records
│        ├─ circulation/     policy, calendar, patron-ops, staff-ops, scheduled jobs
│        ├─ collections/     cataloguing
│        ├─ library-desk/    news, announcements, chat, book requests
│        ├─ lms/             reads and writes, public OPAC catalogue endpoint
│        ├─ notifications/   fan-out and unread counters
│        ├─ reports/         reporting reads
│        ├─ search/          index writer, maintenance, query
│        ├─ users/           profiles
│        └─ visits/          NFC entry logging (paused — see note below)
│
├─ scripts/                  one-off Firestore migration, audit and backfill tools
├─ firestore.rules           deny-by-default access rules
├─ firestore.indexes.json
└─ storage.rules
```

### Data model

Firestore holds `collections` and `accessions` (bibliographic records and their physical
copies), `patrons` and `staffs`, `reservationRequests`, `bookRequests`, `chats`, `updates`
(news and announcements), `notifications`, `visits` and `entries`, `lmslogs` for the audit
trail, `searches` for the search index, and `metadata`/`constants` for configuration.

`patrons` documents are keyed by Firebase Auth UID, with the human-readable patron number
stored as a field.

### Backend surface

- **Callables** — a small validated write API (`addRecordAttempt`, `editRecordAttempt`,
  `archiveUnarchiveRecordAttempt`, `circulationRecordAttempt`) plus scoped read and write
  endpoints for LMS data, search and reports.
- **HTTP** — `opacCatalogue`, a cacheable public catalogue read.
- **Triggers** — search-index sync on collection writes, notification fan-out on new chat
  messages.
- **Scheduled** — the circulation and cleanup jobs listed above.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, React Router 7, Tailwind CSS 4, Radix UI, Lucide, Heroicons |
| Forms & validation | React Hook Form + Zod (shared schemas with the backend) |
| Data viz | Recharts, Chart.js |
| Client search | Fuse.js over the served index |
| Build | Vite 8, TypeScript 6 |
| Backend | Firebase Cloud Functions v2 on Node 22, TypeScript |
| Data | Cloud Firestore, Cloud Storage, Realtime Database |
| Auth | Firebase Authentication, App Check, reCAPTCHA v3 |
| Mail | Nodemailer over SMTP, credentials in Secret Manager |

## Operational tooling

`web/scripts/` holds admin-run Firestore utilities: schema migrations, legacy-record
pruning, circulation date verification and audits, borrow-count backfills, search-index
rebuilds, library-calendar seeding, and a missing-copies cataloguing report. Each runs
through `npm run <name>` against a service account.

## Status

Actively developed. The NFC turnstile integration under `modules/visits` is paused rather
than abandoned — the handlers and their exports are commented out together, and the card
roster still lives in the Realtime Database.

## Credits

Built by [Emerson Clamor](https://github.com/meemeow) with
[Jary Zaldy Dela Rosa](https://github.com/777jzc),
[Karl Rebenito](https://github.com/RebsKorl) and
[odysseum_](https://github.com/ody-sseum) for the Pasig City academic library.
