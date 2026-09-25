# Volontyorlar Coordinator Portal

The private portal where a **coordinator** creates volunteering, reviews the
applications it attracts, and confirms who turned up.

This is not the volunteer application (`../v-app`), the marketing site
(`../v-web`) or the API (`../v-backend`). It follows the codebase patterns of
`v-app`, without its volunteer routes or its history.

## Quick start

```bash
npm ci
npm run dev:local
```

http://localhost:3002 redirects to `/uz/login`. The local command loads the
shared real-API configuration and keeps fixtures off. Use `npm run dev` with an
ignored `.env.local` for a standalone setup or fixture work.

## Commands

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Turbopack development server on port 3002       |
| `npm run dev:local` | Server with the shared real-API local config    |
| `npm run build`     | Production build                                |
| `npm run start`     | Serve an existing production build on port 3002 |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | `next typegen && tsc --noEmit`                  |
| `npm run test`      | Vitest — unit and component                     |
| `npm run test:e2e`  | Playwright, against the stub backend in `e2e/`  |
| `npm run api:types` | Regenerate the API types from `../v-backend`    |
| `npm run check`     | lint + typecheck + test                         |

## What is here

- **Sign-in only.** Email and password, no sign-up, no password recovery, and no
  control that creates an account. An administrator makes coordinators.
- **A forced first password change.** A session that carries
  `passwordChangeRequired` cannot reach any other screen.
- **Today** — the coordinator's desk: vacancies returned for changes and drafts
  to send, each with Edit and Send for approval; applications to decide in the
  row; roll calls due; what is with an administrator; what they cleared today;
  their work's totals.
- **Vacancies** — create a draft on its own page, edit it, send it for approval
  under a verified organization, archive it. URL-backed filters and pagination.
- **Applications** — the profile as submitted, the essay and answers, the
  history, and a decision with a note the volunteer can read, from the list or
  the record.
- **Attendance** — roll calls due, coming up and recorded; confirm attended,
  excused or cancelled, with hours, for everyone selected or one row at a time.
- **Volunteers** — only those who applied to this coordinator's vacancies, their
  password-login state, and a replacement temporary password.
- **Activity** — this coordinator's own recorded actions.
- **Account** — change your own password.

Everything is read from `v-backend` and parsed by a schema. Where the backend
has not published an operation yet, the screen says which method and path it is
waiting for rather than showing anything invented.

## Where to read next

| You want                                 | Go to                                                 |
| ---------------------------------------- | ----------------------------------------------------- |
| What the product is, and who this serves | [`PRODUCT.md`](PRODUCT.md)                            |
| How to work in this repository           | [`AGENTS.md`](AGENTS.md)                              |
| The design system as applied             | [`DESIGN.md`](DESIGN.md)                              |
| Everything else                          | [`docs/README.md`](docs/README.md) — a context router |
