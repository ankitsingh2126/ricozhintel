# Ricozhintel

**Operational intelligence platform for enterprise leadership.**

Ricozhintel provides unified visibility into cross-functional business performance
through KPI dashboards, departmental monitoring, target tracking, executive
scorecards, and management reporting.

> **Status: Milestone 2 — approximately 50% of planned MVP scope.**
> This is a working prototype, not a production-ready product. Every
> implemented feature listed below has been manually verified end-to-end.
> See [Milestone history](#milestone-history) and
> [Current limitations](#current-limitations).

---

## Table of contents

- [Overview](#overview)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Features — current state](#features--current-state)
- [API reference](#api-reference)
- [Quick start (Windows PowerShell)](#quick-start-windows-powershell)
- [Environment variables](#environment-variables)
- [Running the tests](#running-the-tests)
- [Frontend production build](#frontend-production-build)
- [Development-only advisories](#development-only-advisories)
- [Milestone history](#milestone-history)
- [Current limitations](#current-limitations)
- [Deferred to later milestones](#deferred-to-later-milestones)
- [License](#license)

---

## Overview

Ricozhintel is a full-stack MERN application split into two independently
runnable halves:

- **`client/`** — React single-page application (Vite + Tailwind) that renders
  dashboards, charts, and CRUD interfaces.
- **`server/`** — Express REST API backed by MongoDB through Mongoose.

The client talks to the server exclusively over a versioned REST API under
`/api/v1/*`, with a small `/api/health` compatibility alias.

No credentials are committed to this repository. Each side ships with a
`.env.example` that must be copied to `.env` before running.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 |
| Frontend build tool | Vite |
| Frontend routing | React Router (v7) |
| Frontend styling | Tailwind CSS 3 |
| Frontend charts | Recharts |
| Frontend HTTP client | axios |
| Frontend icons | lucide-react |
| Backend runtime | Node.js (ES Modules) |
| Backend framework | Express 4 |
| Database | MongoDB |
| ODM | Mongoose 8 |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Tests | Jest + Supertest + mongodb-memory-server |

---

## Project structure

```
ricozhintel/
├── client/                     React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/         Status breakdown, department progress
│   │   │   ├── common/         Modal, ConfirmDialog, Toast, Loader,
│   │   │   │                   ErrorState, EmptyState, PageHeader,
│   │   │   │                   ProgressBar, StatusBadge
│   │   │   └── dashboard/      KpiCard
│   │   ├── context/            ToastContext
│   │   ├── hooks/              useFetch
│   │   ├── layouts/            AppLayout, Sidebar, Header
│   │   ├── pages/              Dashboard, Departments, Department detail,
│   │   │                       KPIs, KPI detail, NotFound
│   │   ├── routes/             AppRoutes
│   │   ├── services/           apiClient, departmentService, kpiService
│   │   └── utils/              formatters, constants
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── server/                     Node + Express + Mongoose
    ├── src/
    │   ├── config/             env loader, db connection
    │   ├── controllers/        departmentController, kpiController
    │   ├── middleware/         errorHandler, notFound, validateRequest
    │   ├── models/             Department, Kpi
    │   ├── routes/             index, healthRoutes, aliasRoutes,
    │   │                       departmentRoutes, kpiRoutes
    │   ├── seed/               seedData
    │   ├── services/           departmentService, kpiService
    │   ├── utils/              ApiError, apiResponse, achievement
    │   └── validators/         departmentValidator, kpiValidator
    ├── tests/
    │   ├── setup.js
    │   ├── health.test.js
    │   └── kpi.validation.test.js
    ├── .env.example
    ├── jest.config.js
    └── server.js
```

---

## Features — current state

### Frontend

- **Responsive app shell** — fixed sidebar on desktop, slide-in drawer on
  mobile, sticky header with the page title derived from the current route.
- **Executive dashboard**
  - Four KPI summary cards: Total, On Track, At Risk, Off Track.
  - **KPIs by Status** bar chart, color-coded by status.
  - **Average Progress by Department** bar chart.
  - **Department Snapshot** table showing per-department counts (total,
    on-track, at-risk, off-track, completed) and an average achievement bar.
  - Global average progress indicator.
- **Departments page** — responsive card grid.
  - Create and edit through a shared modal form.
  - Delete with a confirmation dialog.
  - Client-side validation mirroring the server rules.
  - Success and error toasts on every action.
- **Department detail page** — code, head, status, and a table of the
  department's KPIs with progress bars and status badges.
- **KPIs page** — table view with:
  - Text search across name and code.
  - Status filter dropdown.
  - Period filter dropdown (Monthly / Quarterly / Yearly).
  - Per-row progress bar and status badge.
  - Create and edit through a modal form.
  - Delete with confirm-before-delete.
- **KPI detail page** — full record with progress visualization and a link
  back to the owning department.
- **Toast notification system** — success, error, and info variants;
  auto-dismiss; manual close.
- **Loading, empty, and error states** on every network-backed view, with a
  Retry action when the server is unreachable.
- **Global error interceptor** — backend errors are surfaced to the user as
  readable messages, including field-level validation details.

### Backend

- **Express 4 API** under `/api/v1/*` with a `/api/health` compatibility alias.
- **MongoDB** through Mongoose 8, with connection events logged on connect,
  error, and disconnect.
- **Two models:**
  - `Department` — name, code, head, description, status.
  - `Kpi` — name, code, department reference, description, unit, target,
    current value, status, period, owner, and `statusRule`
    (`higher_is_better` or `lower_is_better`).
- **Full CRUD** for both resources, with `PUT` exposed as an alias of `PATCH`
  for clients that expect it.
- **Referential integrity** — a KPI cannot be created or updated against a
  non-existent department.
- **Server-side achievement calculation** — every KPI response carries a
  computed `achievement` percentage derived from the KPI's `statusRule`.
  Zero and missing targets return `null` instead of crashing or dividing by
  zero.
- **Aggregation endpoints:**
  - `GET /api/v1/kpis/summary` — global counts by status and average progress.
  - `GET /api/v1/kpis/summary/by-department` — one row per department with
    status counts, raw target/actual sums, and average achievement.
- **Request validation** through `express-validator`, returning a structured
  `VALIDATION_ERROR` payload listing every failing field.
- **Consistent response envelope** on every route, success and failure alike.
- **Central error handler** that hides internal messages in production.
- **Rate limiting** on `/api` (120 requests per minute per IP).
- **Fail-fast environment configuration** — the server refuses to start if
  any required environment variable is missing, and prints which.
- **Demo seed script** — 5 departments and 14 KPIs, all prefixed with
  `[DEMO]`.

### Tests

- **Backend integration tests** with Jest + Supertest running against an
  ephemeral `mongodb-memory-server` instance. The developer's local database
  is never touched.
- **Coverage:**
  - `/api/v1/health` and `/api/health` return the correct shape.
  - Unknown `/api/v1/*` routes return the structured 404 envelope.
  - KPI POST validation across seven scenarios: missing name,
    non-alphanumeric code, invalid department id format, negative target,
    invalid `statusRule`, valid payload with achievement computation, and
    POST against a non-existent department.
- **10 tests total**, all passing.

---

## API reference

All routes are prefixed with `/api/v1`, except the `/api/health` alias.

Every response uses one of two shapes.

**Success**

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 42, "pages": 3 }
}
```

`meta` is present only on list endpoints.

**Failure**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "name", "message": "name is required" }
    ]
  }
}
```

`details` is present only on validation errors.

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Service name, status, uptime, timestamp, DB state |
| GET | `/api/health` | Compatibility alias of the above |
| GET | `/api/v1/departments` | List departments (`search`, `page`, `limit`) |
| GET | `/api/v1/departments/:id` | Fetch one department |
| POST | `/api/v1/departments` | Create a department |
| PATCH | `/api/v1/departments/:id` | Partial update |
| PUT | `/api/v1/departments/:id` | Alias for PATCH |
| DELETE | `/api/v1/departments/:id` | Delete a department |
| GET | `/api/v1/kpis` | List KPIs (`department`, `status`, `period`, `search`, `page`, `limit`) |
| GET | `/api/v1/kpis/summary` | Global counts by status and average progress |
| GET | `/api/v1/kpis/summary/by-department` | One summary row per department |
| GET | `/api/v1/kpis/:id` | Fetch one KPI (department populated) |
| POST | `/api/v1/kpis` | Create a KPI |
| PATCH | `/api/v1/kpis/:id` | Partial update |
| PUT | `/api/v1/kpis/:id` | Alias for PATCH |
| DELETE | `/api/v1/kpis/:id` | Delete a KPI |

### Example requests

```powershell
# Health check (canonical)
curl.exe http://localhost:5000/api/v1/health

# Health check (alias)
curl.exe http://localhost:5000/api/health

# List KPIs for a specific department and period
curl.exe "http://localhost:5000/api/v1/kpis?department=<deptId>&period=quarterly"
```

For non-trivial payloads on Windows, `Invoke-RestMethod` in PowerShell is
more reliable than `curl.exe`:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/departments" `
  -Method Post -ContentType "application/json" `
  -Body (@{ name = "Operations"; code = "OPS"; head = "Jane Doe" } | ConvertTo-Json)
```

---

## Quick start (Windows PowerShell)

### Prerequisites

- **Node.js 20 or later** — verify with `node --version`
- **MongoDB** running locally on port `27017`. Either install it as a Windows
  service (verify with `Get-Service MongoDB`) or run it in Docker:
  ```powershell
  docker run -d --name ricozhintel-mongo -p 27017:27017 mongo:7
  ```

### 1. Backend

```powershell
cd server
npm install
Copy-Item .env.example .env
npm run seed       # loads 5 demo departments + 14 demo KPIs
npm run dev        # starts on http://localhost:5000
```

Expected startup output:

```
[db] MongoDB connected
[server] Ricozhintel API listening on http://localhost:5000
[server] Health check: http://localhost:5000/api/v1/health
```

### 2. Frontend (second terminal)

```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev        # starts on http://localhost:5173
```

Open `http://localhost:5173` in a browser.

To stop either process, press `Ctrl + C` in its terminal. Do not simply close
the window — the Node process may linger and hold the port.

---

## Environment variables

No credentials are committed. Every variable lives in `.env`, which is
gitignored; `.env.example` files are committed as templates.

| Side | Variable | Purpose | Example |
|---|---|---|---|
| server | `PORT` | HTTP port for Express | `5000` |
| server | `NODE_ENV` | `development` or `production` | `development` |
| server | `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/ricozhintel` |
| server | `CLIENT_ORIGIN` | CORS-allowed origin | `http://localhost:5173` |
| client | `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:5000/api/v1` |

The server refuses to start if any required variable is missing, and prints
the missing names so you can correct `.env` immediately.

---

## Running the tests

The backend ships with Jest + Supertest integration tests that run against an
in-memory MongoDB (`mongodb-memory-server`). The tests never touch your local
development database.

From `server/`:

```powershell
npm test
```

Expected output:

```
 PASS  tests/health.test.js
 PASS  tests/kpi.validation.test.js

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

The first run may take 30–60 seconds while the memory-server binary
initialises. Subsequent runs are noticeably faster.

Notes:

- The test suite writes debug logs (`[db] MongoDB connected`,
  `[error] POST /api/v1/kpis`, `[db] MongoDB disconnected`) to the console.
  These are intentional — the tests exercise error paths, and the error
  handler logs as designed. They are not failures.
- No frontend tests exist yet — see
  [Current limitations](#current-limitations).

---

## Frontend production build

From `client/`:

```powershell
npm run build
```

Expected output:

```
vite vX.X.X building for production...
✓ N modules transformed.
dist/index.html                    ...
dist/assets/index-XXXXXXX.css      ...
dist/assets/index-XXXXXXX.js       ...
✓ built in Xs
```

The bundle is written to `client/dist/`. To preview the built bundle locally:

```powershell
npm run preview
```

This build has not been deployed to a hosting environment — it is only
verified to compile. See [Current limitations](#current-limitations).

---

## Development-only advisories

`npm audit` currently reports two advisories on **dev-only** transitive
dependencies:

| Package | Advisory | Path | Impact |
|---|---|---|---|
| `braces` | Stack-exhaustion DoS in deeply nested patterns | via `nodemon` → `chokidar` | Not reachable in production; `nodemon` is only used during local development. |
| `sprintf-js` | DoS via unbounded precision specifiers | via `jest` → `@istanbuljs/load-nyc-config` → `js-yaml` → `argparse` | Not reachable in production; `jest` is a dev dependency. |

Neither affects the deployed application. The suggested
`npm audit fix --force` would downgrade `nodemon` and `jest` to unsupported
versions, which is worse than accepting the advisories. **Do not run
`npm audit fix --force`.**

All production dependencies (`express`, `mongoose`, `cors`, `helmet`,
`morgan`, `dotenv`, `express-validator`, `express-rate-limit`) are clean.

---

## Milestone history

### Milestone 1 — Foundation (~28% of MVP)

Delivered the end-to-end MERN skeleton:

- React + Vite + Tailwind shell with sidebar and mobile drawer.
- Executive dashboard with KPI summary cards and two charts fed by the
  backend.
- Departments and KPIs list and detail pages.
- Express REST API under `/api/v1` with versioned routes.
- MongoDB connection and `Department` / `Kpi` Mongoose models.
- Full CRUD for both resources.
- Consistent response envelope, centralized error handling, request
  validation.
- Loading, error, and empty states throughout the client.
- Fail-fast environment configuration.

### Milestone 2 — Target ~50% of MVP

Extended the foundation with management features and quality tooling:

**Backend additions**

- Added `owner` and `statusRule` fields to the KPI model.
- Server-side achievement calculation as the single source of truth, with
  safe handling of zero and missing targets.
- New `GET /api/v1/kpis/summary/by-department` aggregation endpoint.
- `PUT` aliases on both `/kpis/:id` and `/departments/:id`.
- `/api/health` compatibility alias.
- `period` filter on KPI listing.
- Demo data seed clearly labelled with `[DEMO]` prefixes.

**Frontend additions**

- Toast notification system (context + provider + container).
- Reusable `Modal` and `ConfirmDialog` components.
- Full CRUD UI for departments (create, edit, delete).
- Full CRUD UI for KPIs, including department dropdown, unit, target, current
  value, status, period, owner, and achievement rule.
- Period filter on the KPIs page.
- Department Snapshot table on the dashboard, powered by the new
  by-department endpoint.

**Quality**

- Jest + Supertest integration tests for both health endpoints and KPI POST
  validation (10 tests, all passing).
- Tests run against an in-memory MongoDB; the dev database is never touched.

---

## Current limitations

The following are known limitations, not bugs:

- **No authentication or authorization.** Every endpoint is public. Adding
  auth is deferred to a later milestone.
- **No frontend test coverage.** The backend has 10 integration tests; the
  client has none.
- **Dashboard department grouping** averages per-KPI achievement percentages
  rather than summing raw values, because KPIs across a department can use
  different units. This is intentional — see the brief's rule against
  combining incompatible units.
- **The `[DEMO]` seed data** is provided for development only and must not be
  presented as real company metrics.
- **No CI pipeline.** Tests are run manually with `npm test`.
- **No deployed production build.** `npm run build` produces a bundle, but it
  has not been deployed or verified from a hosting environment.
- **No Docker configuration.** Local development assumes a locally running
  MongoDB.
- **No logging service.** Development logs go to stdout.

Anything not listed in
[Features — current state](#features--current-state) should be treated as
**not yet implemented**.

---

## Deferred to later milestones

The following features are intentionally out of scope for the current
milestone:

- Authentication, sessions, and role-based access control.
- Advanced target management and executive scorecards.
- Automated reporting and scheduled email delivery.
- External enterprise data integrations.
- Production deployment (containerisation, CI/CD, monitoring, alerting).

---

## License

UNLICENSED — private project.