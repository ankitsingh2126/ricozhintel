# Ricozhintel

**Operational intelligence platform for enterprise leadership.**

Ricozhintel provides unified visibility into cross-functional business performance
through KPI dashboards, departmental monitoring, target tracking, executive
scorecards, and management reporting.

> **Status: Milestone 6 Complete — ~95% of planned MVP scope.**
> Fully implemented with stateless JWT authentication, role-based access control
> (Admin vs. Viewer), full CRUD workflows, interactive dashboard filtering,
> RFC 4180 CSV reporting, and a comprehensive automated test suite
> (**183 passing tests**: 128 frontend in Vitest + 55 backend in Jest).
> Live in production on Vercel and Render.
> See [Milestone history](#milestone-history) and
> [Current limitations](#current-limitations).

**Live Deployments:**
- **Frontend (Vercel):** https://ricozhintel.vercel.app
- **Backend (Render):** https://ricozhintel-api.onrender.com

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
| Frontend HTTP client | Axios (with JWT interceptors) |
| Frontend icons | Lucide React |
| Frontend testing | Vitest + React Testing Library + JSDOM |
| Backend runtime | Node.js (ES Modules) |
| Backend framework | Express 4 |
| Database | MongoDB (Atlas M0 in production / local MongoDB 7) |
| ODM | Mongoose 8 |
| Authentication | Stateless JWT (`jsonwebtoken`, `bcryptjs`) |
| Validation | express-validator |
| Security | Helmet, CORS, express-rate-limit |
| Backend testing | Jest + Supertest + mongodb-memory-server |

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
│   │   │   ├── dashboard/      KpiCard
│   │   │   ├── departments/    DepartmentFormModal
│   │   │   └── kpis/           KpiFormModal, QuickValueModal
│   │   ├── context/            AuthContext, ToastContext
│   │   ├── hooks/              useFetch
│   │   ├── layouts/            AppLayout, Sidebar, Header
│   │   ├── pages/              DashboardPage, DepartmentsPage, DepartmentDetailPage,
│   │   │                       KpisPage, KpiDetailPage, LoginPage, NotFoundPage
│   │   ├── routes/             AppRoutes, ProtectedRoute
│   │   ├── services/           apiClient, authService, departmentService, kpiService
│   │   ├── test/               12 Vitest suites (128 passing tests):
│   │   │                       apiClient, auth, dashboardAndCsv, departmentDetail,
│   │   │                       departments, forms, kpiDetail, kpis, notFound,
│   │   │                       rbac, toasts, useFetch, setup.js, testUtils.jsx
│   │   └── utils/              formatters, constants, csvExport
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── vercel.json
│
└── server/                     Node + Express + Mongoose
    ├── src/
    │   ├── config/             env loader, db connection
    │   ├── controllers/        authController, departmentController, kpiController
    │   ├── middleware/         authenticate, authorize, errorHandler, notFound, validateRequest
    │   ├── models/             Department, Kpi, User
    │   ├── routes/             index, authRoutes, healthRoutes, aliasRoutes,
    │   │                       departmentRoutes, kpiRoutes
    │   ├── seed/               seedData
    │   ├── services/           authService, departmentService, kpiService
    │   ├── utils/              ApiError, apiResponse, achievement
    │   └── validators/         authValidator, departmentValidator, kpiValidator
    ├── tests/                  6 Jest suites (55 passing tests):
    │   ├── setup.js, health.test.js, auth.test.js,
    │   ├── department.test.js, kpi.validation.test.js,
    │   ├── kpi.summary.test.js, csv.export.test.js
    ├── .env.example
    ├── jest.config.js
    └── server.js
```

---

## Features — current state

### Authentication & Role-Based Access Control (RBAC)

- **Stateless JWT architecture** with Bearer token authentication in HTTP Authorization headers.
- **Role separation:**
  - `Admin`: Full permissions across the application (create, update, delete departments & KPIs, quick value updates, role promotions).
  - `Viewer`: Read-only permissions across dashboard and list pages, with interactive filtering, searching, detail views, and CSV exports permitted.
- **Frontend protection:**
  - Dedicated `LoginPage` with fast one-click demo credentials for Admin and Viewer.
  - `ProtectedRoute` guard redirecting unauthenticated visitors to `/login`.
  - Header displays current user name, role badge (`Admin` / `Viewer`), and Logout button.
  - Context-aware UI guards hide Add, Edit, Delete, and Quick Value actions from Viewers across all pages and modals.

### Frontend

- **Responsive app shell** — fixed sidebar on desktop, slide-in drawer on
  mobile, sticky header with dynamic route titles and authenticated user controls.
- **Executive dashboard**
  - Four KPI summary cards: Total, On Track, At Risk, Off Track.
  - **KPIs by Status** bar chart, color-coded by status.
  - **Average Progress by Department** bar chart.
  - **Department Snapshot** table showing per-department counts (total,
    on-track, at-risk, off-track, completed) and an average achievement bar.
  - Global average progress indicator.
  - **Interactive filter bar:** filter entire dashboard by Department, Period, and Status with an instant Reset button.
  - **Export Snapshot CSV:** one-click download of the active dashboard department breakdown.
- **Departments page** — responsive card grid.
  - Search by name or code; filter by status.
  - Create and edit through a modal form with client validation and dirty checking.
  - Delete with `ConfirmDialog` and referential check feedback.
  - Success and error toasts on every action.
- **Department detail page** — code, head, status, description, and an associated
  KPI table with progress bars, status badges, and an **Add KPI** prefilled modal action.
- **KPIs page** — table view with:
  - Text search across name and code.
  - Status filter dropdown (`on_track`, `at_risk`, `off_track`, `completed`).
  - Period filter dropdown (`monthly`, `quarterly`, `yearly`).
  - Per-row progress bar, status badge, and **Quick Value** check-in button.
  - Create and edit modal forms.
  - Delete with confirm-before-delete dialog and pagination step-back.
  - **Export CSV:** RFC 4180-compliant export respecting all active filters.
- **KPI detail page** — full record with progress visualization, target vs actual,
  achievement rule (`higher_is_better` vs `lower_is_better`), quick value check-in modal,
  and a link back to the owning department.
- **Toast notification system** — success, error, and info variants; auto-dismiss and manual dismissal; multi-toast stacking.
- **Loading, empty, and error states** on every network-backed view, with a Retry action.
- **Global API client & error interceptor** — automatic Bearer token injection, session handling, and structured backend error transformation.
- **Not Found (404) page** — friendly route handling with "Back to Dashboard" navigation.

### Backend

- **Express 4 API** under `/api/v1/*` with a `/api/health` compatibility alias.
- **MongoDB** through Mongoose 8, with connection events logged on connect,
  error, and disconnect.
- **Three models:**
  - `User` — name, lowercase unique email, salted/hashed password (`bcryptjs`), role (`admin` or `viewer`).
  - `Department` — name, unique code, head, description, status.
  - `Kpi` — name, code, department reference, description, unit, target,
    current value, status, period, owner, and `statusRule`
    (`higher_is_better` or `lower_is_better`).
- **Full CRUD** for both resources, with `PUT` exposed as an alias of `PATCH`.
- **Referential integrity:**
  - A KPI cannot be created or updated against a non-existent department.
  - A department cannot be deleted if active KPIs reference it (returns HTTP 400 with helpful message).
- **Server-side achievement calculation** — every KPI response carries a
  computed `achievement` percentage derived from the KPI's `statusRule`.
  Zero and missing targets return `null` instead of crashing or dividing by zero.
- **Aggregation endpoints:**
  - `GET /api/v1/kpis/summary` — global counts by status and average progress (supports department, period, and status filters).
  - `GET /api/v1/kpis/summary/by-department` — one row per department with
    status counts, raw target/actual sums, and normalized average achievement (supports filtering).
- **Request validation** through `express-validator`, returning a structured
  `VALIDATION_ERROR` payload listing every failing field.
- **Authentication & RBAC middleware:**
  - `authenticate` middleware validating Bearer tokens.
  - `authorize('admin')` middleware guarding mutating operations.
- **Consistent response envelope** on every route, success and failure alike.
- **Central error handler** that hides internal messages in production.
- **Rate limiting** on `/api` (120 requests per minute per IP, with proxy trust enabled).
- **Fail-fast environment configuration** — the server refuses to start if
  any required environment variable is missing, and prints which.
- **Production admin bootstrap:** dedicated `/api/v1/auth/bootstrap-admin` endpoint and CLI script for safe initial setup without seeding demo credentials in production.
- **Demo seed script** — seeded accounts and demo data prefixed with `[DEMO]` for local development.

### Automated Tests

- **183 automated tests (100% passing):**
  - **128 Frontend tests** (Vitest 5 + React Testing Library + JSDOM across 12 test files).
  - **55 Backend integration tests** (Jest + Supertest + mongodb-memory-server across 6 test files).
- **Client Linting:** ESLint 9 passes with 0 errors and 0 warnings.
- **Client Production Build:** Compiles cleanly with Vite in ~2.1s.

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

| Method | Path | Auth / Role | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Service name, status, uptime, timestamp, DB state |
| GET | `/api/health` | Public | Compatibility alias of the above |
| POST | `/api/v1/auth/register` | Public | Register new user (strictly assigns `viewer` in production) |
| POST | `/api/v1/auth/login` | Public | Authenticate user, receive JWT Bearer token |
| GET | `/api/v1/auth/me` | Authenticated | Fetch current user profile & role |
| POST | `/api/v1/auth/bootstrap-admin` | Bootstrap Secret | One-time initial production administrator provisioning |
| PATCH | `/api/v1/auth/users/:id/role` | Admin | Promote or demote user role (`admin` / `viewer`) |
| GET | `/api/v1/departments` | Authenticated | List departments (`search`, `page`, `limit`) |
| GET | `/api/v1/departments/:id` | Authenticated | Fetch one department |
| POST | `/api/v1/departments` | Admin | Create a department |
| PATCH | `/api/v1/departments/:id` | Admin | Partial update |
| PUT | `/api/v1/departments/:id` | Admin | Alias for PATCH |
| DELETE | `/api/v1/departments/:id` | Admin | Delete a department (blocked if active KPIs exist) |
| GET | `/api/v1/kpis` | Authenticated | List KPIs (`department`, `status`, `period`, `search`, `page`, `limit`) |
| GET | `/api/v1/kpis/summary` | Authenticated | Global counts by status and average progress |
| GET | `/api/v1/kpis/summary/by-department` | Authenticated | One summary row per department |
| GET | `/api/v1/kpis/:id` | Authenticated | Fetch one KPI (department populated) |
| POST | `/api/v1/kpis` | Admin | Create a KPI |
| PATCH | `/api/v1/kpis/:id` | Admin | Partial update (including quick value updates) |
| PUT | `/api/v1/kpis/:id` | Admin | Alias for PATCH |
| DELETE | `/api/v1/kpis/:id` | Admin | Delete a KPI |

### Example requests

```powershell
# Health check (canonical)
curl.exe http://localhost:5000/api/v1/health

# Login to obtain Bearer token
$loginResp = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body (@{ email = "admin@ricozhintel.internal"; password = "Admin123!" } | ConvertTo-Json)

$token = $loginResp.data.token

# List KPIs with authorization header
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/kpis?period=quarterly" `
  -Headers @{ Authorization = "Bearer $token" }
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
npm run seed       # loads demo admin, demo viewer, 5 departments & 14 KPIs
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

To stop either process, press `Ctrl + C` in its terminal.

---

## Environment variables

No credentials are committed. Every variable lives in `.env`, which is
gitignored; `.env.example` files are committed as templates.

| Side | Variable | Purpose | Example |
|---|---|---|---|
| server | `PORT` | HTTP port for Express | `5000` |
| server | `NODE_ENV` | `development` or `production` | `development` |
| server | `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/ricozhintel` |
| server | `CLIENT_ORIGIN` | CORS-allowed origin(s) | `http://localhost:5173,https://ricozhintel.vercel.app` |
| server | `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `<random-32+-character-string>` |
| server | `JWT_EXPIRES_IN` | JWT token lifetime duration | `7d` |
| server | `ADMIN_BOOTSTRAP_SECRET` | Secret for one-time admin bootstrap | `<random-secret-key>` |
| client | `VITE_API_URL` | Base URL of backend API | `http://localhost:5000/api/v1` |
| client | `VITE_API_BASE_URL` | Backward-compatible alias for `VITE_API_URL` | `http://localhost:5000/api/v1` |

The server refuses to start if any required variable is missing, and prints
the missing names so you can correct `.env` immediately.

---

## Running the tests

The project includes **183 automated tests** across the backend and frontend.

### 1. Backend Integration Tests (Jest + Supertest)

Runs against an ephemeral in-memory MongoDB (`mongodb-memory-server`) without touching local or cloud databases.

From `server/`:

```powershell
npm test
```

Expected output:

```
Test Suites: 6 passed, 6 total
Tests:       55 passed, 55 total
```

Covered suites:
- `health.test.js` (3 tests)
- `auth.test.js` (14 tests)
- `kpi.validation.test.js` (7 tests)
- `department.test.js` (8 tests)
- `kpi.summary.test.js` (13 tests)
- `csv.export.test.js` (10 tests)

### 2. Frontend Component & Integration Tests (Vitest + React Testing Library)

Runs unit and integration tests against JSDOM.

From `client/`:

```powershell
npm test -- --run
```

Expected output:

```
Test Files  12 passed (12)
     Tests  128 passed (128)
```

Covered suites:
- `rbac.test.jsx` (8 tests)
- `auth.test.jsx` (12 tests)
- `forms.test.jsx` (7 tests)
- `departmentDetail.test.jsx` (11 tests)
- `kpiDetail.test.jsx` (12 tests)
- `useFetch.test.jsx` (10 tests)
- `toasts.test.jsx` (8 tests)
- `apiClient.test.js` (14 tests)
- `kpis.test.jsx` (14 tests)
- `notFound.test.jsx` (4 tests)
- `dashboardAndCsv.test.jsx` (10 tests)
- `departments.test.jsx` (18 tests)

### 3. Frontend Linting

From `client/`:

```powershell
npm run lint
```

Expected output: 0 errors, 0 warnings.

---

## Frontend production build

From `client/`:

```powershell
npm run build
```

Expected output:

```
vite v8.x.x building client environment for production...
✓ 2564 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-DJBKX52x.css   22.49 kB │ gzip:   4.89 kB
dist/assets/index-DTnEhPdf.js   750.24 kB │ gzip: 223.48 kB
✓ built in ~2.1s
```

The bundle is written to `client/dist/`. To preview the built bundle locally:

```powershell
npm run preview
```

The production frontend is hosted at [https://ricozhintel.vercel.app](https://ricozhintel.vercel.app) with SPA rewrites configured in `vercel.json`.

---

## Development-only advisories

`npm audit` reports two advisories on **dev-only** transitive
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
`morgan`, `dotenv`, `express-validator`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`) are clean.

---

## Milestone history

### Milestone 1 — Foundation (~28% of MVP)
- React + Vite + Tailwind shell with sidebar and mobile drawer.
- Executive dashboard with KPI summary cards and two charts fed by the backend.
- Departments and KPIs list and detail pages.
- Express REST API under `/api/v1` with versioned routes.
- MongoDB connection and `Department` / `Kpi` Mongoose models with CRUD.
- Consistent response envelope, centralized error handling, request validation.

### Milestone 2 — Management Features (~50% of MVP)
- `owner` and `statusRule` fields added to KPI model.
- Server-side achievement calculation single source of truth.
- `GET /api/v1/kpis/summary/by-department` aggregation endpoint.
- Toast notification system, reusable `Modal` and `ConfirmDialog` components.
- Initial backend integration tests with Jest + Supertest (10 tests).

### Milestone 3 — Dashboard Filtering & Quick Updates
- Interactive Department, Period, and Status filtering bar on the Dashboard with instant Reset.
- Filter forwarding across backend aggregations in `kpiService.js`.
- Reusable `QuickValueModal` for rapid KPI value and status check-ins without full form edit.

### Milestone 4 — Reporting & Deployment Architecture
- RFC 4180-compliant CSV generation utility (`client/src/utils/csvExport.js`).
- "Export CSV" on KPIs page respecting search and filter state.
- "Export Snapshot CSV" on Dashboard page.
- Free-tier deployment architecture guide in `DEPLOYMENT.md`.

### Milestone 5 — Authentication & Role-Based Access Control (RBAC)
- Stateless JWT authentication architecture with bcrypt-hashed passwords.
- Role-based permissions: `admin` (full CRUD) vs `viewer` (read-only with filters & CSV export).
- Backend route protection with `authenticate` and `authorize('admin')` middleware.
- Dedicated `LoginPage` with demo quick-sign-in buttons.
- Frontend `AuthContext`, session persistence, and `ProtectedRoute` guard.
- UI role guards hiding mutating actions from `viewer` users.

### Milestone 6 — Comprehensive Frontend Testing (128 Tests)
- Configured Vitest 5, React Testing Library, and JSDOM test infrastructure.
- **Stage 6.1 (commit `d054777`):** KPI page workflows (`kpis.test.jsx`, 14 tests).
- **Stage 6.2 (commit `edcbee9`):** Department Detail (`departmentDetail.test.jsx`, 11 tests) and KPI Detail (`kpiDetail.test.jsx`, 12 tests).
- **Stage 6.3 (commit `3db40a1`):** Department CRUD workflows (`departments.test.jsx`, 18 tests).
- **Stage 6.4 (commit `277f3c4`):** API client interceptors (`apiClient.test.js`, 14 tests) and toasts (`toasts.test.jsx`, 8 tests).
- **Stage 6.5 (commit `85dcaf9`):** Not Found page (`notFound.test.jsx`, 4 tests) and Recharts zero-dimension JSDOM warning cleanup in `setup.js`.
- Expanded baseline tests (`auth.test.jsx`, `rbac.test.jsx`, `forms.test.jsx`, `dashboardAndCsv.test.jsx`, `useFetch.test.jsx`).
- Total: 128 frontend tests across 12 files (100% passing).

### Milestone 7 — Production Rollout, Performance & Acceptance (In Progress)
- **Stage 7.1 (Completed):** Full documentation synchronization with verified commit `85dcaf9` and 183 automated tests.
- **Stage 7.2 (Completed):** Frontend bundle size optimization via route-level code splitting (`React.lazy()` / `Suspense`). Chunks reduced from ~750 kB to under 370 kB, eliminating Vite's 500 kB chunk threshold advisory.
- **Stage 7.3 (Pending):** Production end-to-end smoke testing of complete user journeys on live URLs.

---

## Current limitations

The following are known limitations, not bugs:

- **Production smoke testing pending:** Live health checks and unauthenticated API boundaries confirm Render and Vercel services are running, but formal end-to-end acceptance testing of authenticated journeys on live domains is scheduled for Stage 7.3.
- **Render free-tier cold starts:** The free Render instance spins down after 15 minutes of inactivity; initial cold starts take 30–50 seconds.
- **Dashboard department grouping:** Department progress averages per-KPI achievement percentages rather than summing raw values across mismatched units (intentional).
- **The `[DEMO]` seed data** is provided for development only and must not be used as real company metrics.
- **No CI pipeline:** Tests are currently run via local CLI (`npm test`).

---

## Deferred to later milestones

The following features are intentionally out of scope for the current milestone:

- Automated scheduled email delivery for management reports.
- External enterprise data integrations and ERP connectors.
- Advanced organizational hierarchies and custom user role definitions.
- Automated CI/CD pipeline GitHub Actions integration.

---

## License

UNLICENSED — private project.