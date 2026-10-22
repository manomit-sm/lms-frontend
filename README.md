# LMS Frontend

The three web portals of the multi-tenant **Leave Management System**, over the
[LMS backend](https://github.com/manomit-sm/lms-backend):

| Portal   | App             | Dev URL                 | For                                                                                      |
| -------- | --------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Employee | `apps/employee` | <http://localhost:5173> | every tenant user: leave, balances, calendar; managers also get approvals and their team |
| Admin    | `apps/admin`    | <http://localhost:5174> | tenant admins and HR: organisation, policies, holidays, workflows, users, reports        |
| Platform | `apps/platform` | <http://localhost:5175> | platform staff: tenants and their provisioning                                           |

The employee and admin portals use the tenant API (`/api/v1/**`) and the same sign-in; the platform
portal uses the platform API (`/platform/**`) and its own sign-in. What a tenant user sees is decided by
the permissions in `/api/v1/auth/me`, never by role names.

## What the portals do

- **Employee**: dashboard (balances, upcoming leave, recent activity, team and approval counts), apply for
  leave with a live preview (days taken, balance after, every rule the request breaks), half days and
  attachments, my requests with filters, request detail with approval progress, withdraw and cancel,
  balances with their transaction history; a month calendar for oneself, the team or a department, with
  who is available on any day; notifications, live in the header. Approvers get an inbox and a review
  page (the request, the requester's balance, who else is away) to approve or reject leave and
  cancellations; managers get their team, with each report's balances and requests.
- **Admin**: employees (search, add, edit, reporting manager, exit); the organisation (departments as a
  tree, designations, locations, work schedules); users (invite, roles, enable and disable) and roles
  (system roles, and custom roles with a permission picker that only offers what the admin may grant);
  leave setup (leave types, policies with who they apply to, leave periods); holidays (per location or
  department, CSV import); approval workflows (rules, up to five approver steps, reminders, escalation,
  automatic approval); balances (allocating a period, adjusting one employee's); settings; a dashboard
  (headcount, who is away, waiting requests, leave taken this period, recent activity); reports (by
  month, leave type, department, decisions, leave history, balances) over any range up to two years,
  exported as CSV or Excel; the audit log. Each area appears only to holders of its permissions.
- **Platform**: tenants (list, add with its first admin, suspend and activate, run migrations again,
  add a tenant admin).

## Stack

React 19, TypeScript (strict), Vite, [Mantine](https://mantine.dev) 9, React Router 8, TanStack Query 5,
typed API calls generated from the backend's OpenAPI documents (openapi-typescript, openapi-fetch,
openapi-react-query). Vitest and Testing Library for tests, ESLint and Prettier for style.

## Prerequisites

- **Node.js 24 or newer** (`.nvmrc`) and npm
- The **backend running locally** with the `local` profile (see its README) on <http://localhost:8080>,
  with at least one tenant

## Running locally

```bash
npm install
npm run dev:employee   # http://localhost:5173
npm run dev:admin      # http://localhost:5174
npm run dev:platform   # http://localhost:5175
```

Each dev server forwards `/api`, `/platform` and `/local` to the backend (`LMS_BACKEND_URL` in
`.env.development`), so the browser only talks to the portal's own origin and needs no CORS.

### Signing in

With the backend's `local` profile, sign-in needs no Cognito:

- **Employee and admin portals**: choose a tenant and one of its users. The list comes from the
  backend's local directory (`/local/directory/**`), and the backend's local issuer signs a token with
  the same claims Cognito will.
- **Platform portal**: sign in as a platform admin under any name.

Sessions are kept per browser tab (sessionStorage), so two tabs can be signed in as different users, for
example an employee and their manager. Each portal has its own session.

### Demo data

With the backend running, create a demo tenant to try the portals with:

```bash
npm run seed:demo
```

It creates tenant `demo` through the backend's API: two departments, the tenant admin as an employee,
a manager (`maya@demo.test`) with two reports (`arjun@demo.test`, and `lena@demo.test` on probation), and
an HR admin (`ravi@demo.test`). Balances, policies and approval workflows are the defaults every new
tenant gets. `npm run seed:demo -- <key>` creates another tenant; an existing key is left alone.

Other tenants are created in the platform API (`POST /platform/tenants`, see the backend README). Their
admin signs in to the admin portal; employees added there appear in the sign-in list.

## Commands

| Command                | What it does                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run dev:<portal>` | Dev server for `employee`, `admin` or `platform`                                |
| `npm test`             | Unit and component tests (Vitest)                                               |
| `npm run typecheck`    | TypeScript across every package and app                                         |
| `npm run lint`         | ESLint                                                                          |
| `npm run format`       | Prettier (`format:check` only checks)                                           |
| `npm run build`        | Production builds into `apps/*/dist` (needs the settings below)                 |
| `npm run api:generate` | Refresh the OpenAPI snapshots from the running backend and regenerate the types |
| `npm run seed:demo`    | Create the demo tenant in the running backend (see above)                       |

### API types

`packages/api/openapi/*.json` are snapshots of the backend's OpenAPI documents (`/v3/api-docs/tenant`
and `/v3/api-docs/platform`); `packages/api/src/generated/*.ts` are generated from them. Both are
committed, so building needs no backend. After a backend API change, run `npm run api:generate` with the
backend running and commit both: the type checker then shows every screen the change affects.
`npm run api:generate -- --offline` regenerates the types from the snapshots alone.

## Configuration

Settings are build-time `VITE_*` variables. There are no defaults in code: `vite build` stops when a
portal's setting is missing, and the dev and test values are in `.env.development` and `.env.test`.

| Variable                   | Portals         | Meaning                                                                           |
| -------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`        | all             | Backend origin, e.g. `https://api.example.com`; empty for the portal's own origin |
| `VITE_EMPLOYEE_PORTAL_URL` | admin           | Link to the employee portal                                                       |
| `VITE_ADMIN_PORTAL_URL`    | employee        | Link to the admin portal, shown to users with admin permissions                   |
| `LMS_BACKEND_URL`          | dev server only | Where the dev server proxies the API                                              |

Sign-in through Cognito (hosted UI with PKCE) replaces the local sign-in when the deployment is set up.

## Project layout

```
apps/
├── employee/          # employee portal
├── admin/             # admin portal
└── platform/          # platform portal
packages/
├── api/               # OpenAPI snapshots, generated types, API clients, ApiError, permission codes
├── auth/              # session store, route guard, current user (/auth/me), local sign-in screens
└── ui/                # Mantine theme, providers, portal shell, common pages and feedback
scripts/
└── generate-api.mjs   # npm run api:generate
vite.shared.ts         # Vite config shared by the portals (dev proxy, required settings)
```

Each app has `src/runtime.ts` (its settings, session store, API client and query cache),
`src/router.tsx` and `src/main.tsx`; pages load on first visit. The employee portal's own pages are in
`src/pages` and its leave logic (sessions, attachments, balance arithmetic, policy hints) in `src/leave`;
`src/approvals`, `src/calendar`, `src/team` and `src/notifications` hold those features. The admin
portal has a folder per area (`employees`, `organisation`, `access`, `leavesetup`, `holidays`,
`workflows`, `balances`, `settings`, and `insight` for the dashboard, reports and audit log), and
`navigation.ts` maps each area to the permissions that open it. The platform portal's pages are in
`src/tenants`.

### Live notifications

The employee portal keeps `GET /api/v1/notifications/stream` (server-sent events) open while signed
in. `EventSource` can't send the bearer header, and the API never takes tokens in the URL, so
`runEventStream` in `@lms/api` reads the stream with `fetch`. It reconnects with backoff when the
stream ends or fails, stops on sign-out, and ends the session on 401. Each new notification pops
up, updates the unread count, and refetches what it is about (approvals, leave, balances).

### Attachments

Files never pass through the API: the portal asks the API for a presigned upload URL
(`POST /api/v1/leave-requests/attachments`), PUTs the file there, and sends the attachment id with the
request. Downloads work the same way. Deployed, the URLs point at S3; with the backend's local profile
they point at its in-memory stand-in (`/local/storage/**`), which the dev proxy forwards. Report
exports are generated in the background: "Your exports" polls until a file is ready, and Download asks
for a fresh link each time, because links expire.

### Errors

Every failed API call rejects with an `ApiError` built from the backend's `application/problem+json`:
`errorCode`, `detail` (safe to show), `fieldErrors` for `VALIDATION_FAILED` (`fieldErrorMap()` feeds a
Mantine form) and `violations` for broken leave rules. A failed mutation shows its `detail` as a
notification unless it sets `meta: { handlesError: true }`; a 401 ends the session.
