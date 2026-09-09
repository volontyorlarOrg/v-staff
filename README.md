# Volontyorlar Coordinator Portal

The private portal where a **coordinator** creates volunteering, reviews the
applications it attracts, and confirms who turned up.

This is not the volunteer application (`../v-app`), the marketing site
(`../v-web`) or the API (`../v-backend`). It follows the codebase patterns of
`v-app`, without its volunteer routes or its history.

## Quick start

```bash
npm ci
cp .env.example .env.local
openssl rand -base64 48   # paste as VOLONTYORLAR_STAFF_SESSION_SECRET
npm run dev
```

http://localhost:3002 redirects to `/uz/login`. Set `VOLONTYORLAR_API_URL` to a
running `v-backend`, or set `VOLONTYORLAR_FIXTURES=on` to work against the
labelled development dataset instead.

## Commands

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Turbopack development server on port 3002       |
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
- **Dashboard** — the coordinator's own vacancies, applications, attendance and
  confirmed hours.
- **Vacancies** — create a draft, edit it, publish it under a verified
  organization, archive it. URL-backed filters and pagination.
- **Applications** — the profile as submitted, the answers, the history, and a
  decision with a note the volunteer can read.
- **Attendance** — confirm attended, excused or cancelled, with hours.
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
