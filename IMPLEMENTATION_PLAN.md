# IMPLEMENTATION PLAN: Ricozhintel MVP Completion

Based on the findings in `PROJECT_AUDIT.md`, this plan addresses the critical MVP requirements, fixes data integrity gaps, extends automated testing, and ensures production readiness without breaking existing code.

---

## Milestone 1: Data Integrity & Backend Accuracy (Completed)
1. **Department Deletion Integrity:**
   - Modified `departmentService.deleteDepartment` to check if any KPIs reference this department before deleting.
   - If referenced KPIs exist, returns a clear 400 Bad Request / Conflict with a user-friendly message (`"Cannot delete department with active KPIs. Reassign or delete the KPIs first."`).
2. **KPI Department Summary Aggregation Correction:**
   - In `kpiService.getSummaryByDepartment`, avoided unit mixing. Computes `avgAchievement` by calculating average individual KPI achievement percentages (mirroring `calculateAchievement` logic) rather than summing incompatible raw numbers across different units.

---

## Milestone 2: Comprehensive Backend Test Coverage (Completed)
1. **Department Integration Tests (`server/tests/department.test.js`):**
   - Tests department listing with pagination and search.
   - Tests validation errors (missing name/code, short code).
   - Tests duplicate code / name returning 409 Conflict.
   - Tests update (`PATCH` & `PUT` alias).
   - Tests delete protection when department has assigned KPIs.
   - Tests successful delete when department has no KPIs.
2. **KPI Summaries Integration Tests (`server/tests/kpi.summary.test.js`):**
   - Tests `/api/v1/kpis/summary` (status counts, average progress).
   - Tests `/api/v1/kpis/summary/by-department` (department breakdown and achievement).

---

## Milestone 3: Frontend Refinement & User Experience (Completed)
1. **Department Detail KPI Quick-Add:**
   - Allows adding a KPI directly from `DepartmentDetailPage` pre-selecting the current department.
2. **Client Validation & Error Toast Consistency:**
   - Verified all input limits and error handling across both forms (`DepartmentFormModal` and `KpiFormModal`).
3. **Verify Full Production Build:**
   - Verified clean production bundle output via Vite.

---

## Milestone 4: CSV Export & Deployment Architecture (Completed)
1. **RFC 4180 CSV Export Utility (`client/src/utils/csvExport.js`):**
   - KPI table export respecting active filters (search, status, period).
   - Executive Dashboard Department snapshot export.
2. **Free-Tier Deployment Guide (`DEPLOYMENT.md`):**
   - MongoDB Atlas cluster setup & connection URI formatting.
   - Backend deployment configuration (Render).
   - Frontend deployment configuration (Vercel).
   - Environment variables matrix and health-check verification steps.

---

## Milestone 5: Authentication & Role-Based Access Control (Completed)
1. **Stateless JWT Security Architecture:**
   - User schema with `bcryptjs` password hashing, unique email enforcement, role field (`admin` | `viewer`).
   - `authenticate` and `authorize('admin')` middleware securing Express routes.
   - Authentication routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
   - Seed script populates demo Admin and Viewer accounts for local development.
2. **Expanded Test Coverage:**
   - Added `server/tests/auth.test.js` (14 tests).
   - Updated existing test suites with authentication headers.
   - 45/45 tests passing in 10.5s across 6 test suites.
3. **Frontend Session & UI Role Guards:**
   - `AuthContext.jsx` with persistent token storage and automatic session verification.
   - `ProtectedRoute.jsx` guarding all application routes, redirecting unauthenticated traffic to `/login`.
   - `LoginPage.jsx` with quick demo sign-in buttons for Admin and Viewer.
   - `Header.jsx` displaying user name, role badge, and Logout button.
   - UI role guards hiding Add/Edit/Delete/Value controls for Viewer role in `DepartmentsPage`, `DepartmentDetailPage`, `KpisPage`, and `KpiDetailPage`.
   - Viewers retain full read access, dashboard filters, and CSV downloads.

---

## Milestone 6: Automated Frontend Testing & Verification (Completed)
1. **Frontend Component & Integration Test Suite (128 Tests across 12 Suites):**
   - Configured Vitest + React Testing Library + JSDOM in `client/vite.config.js`.
   - Setup polyfills for `window.matchMedia`, `ResizeObserver`, anchor click navigation, and `URL.createObjectURL` in `client/src/test/setup.js`.
   - **Stage 6.1 (commit `d054777`):** KPI page workflows (`kpis.test.jsx`, 14 tests) covering search, status/period filters, pagination, CSV export, Quick Value updates, delete confirmation, and Add/Edit modals.
   - **Stage 6.2 (commit `edcbee9`):** Department Detail (`departmentDetail.test.jsx`, 11 tests) and KPI Detail (`kpiDetail.test.jsx`, 12 tests) covering metadata rendering, prefilled KPI creation, higher/lower status rules, 404 error states, and retry actions.
   - **Stage 6.3 (commit `3db40a1`):** Department CRUD workflows (`departments.test.jsx`, 18 tests) covering Add, Edit with prefilled data, ConfirmDialog delete, deletion cancellation, and pagination step-back.
   - **Stage 6.4 (commit `277f3c4`):** API client interceptors & structured error handling (`apiClient.test.js`, 14 tests) and toast notification system (`toasts.test.jsx`, 8 tests).
   - **Stage 6.5 (commit `85dcaf9`):** Not Found page (`notFound.test.jsx`, 4 tests) and Recharts zero-dimension JSDOM warning cleanup in `setup.js`.
   - Baseline suites: Authentication (`auth.test.jsx`, 12 tests), RBAC guards (`rbac.test.jsx`, 8 tests), modal forms (`forms.test.jsx`, 7 tests), dashboard & CSV (`dashboardAndCsv.test.jsx`, 10 tests), custom fetch hook (`useFetch.test.jsx`, 10 tests).
   - **128/128 frontend tests passing** in ~22.6s.
2. **Comprehensive Verification & Code Quality:**
   - **55/55 backend tests passing** across 6 test suites in ~23s.
   - **183 total automated tests** passing across the full project (100% pass rate).
   - Frontend ESLint check cleanly passing with **0 errors and 0 warnings**.
   - Frontend production build compiles cleanly via Vite v8 in 2.10s.

---

## Milestone 7: Production Rollout, Performance & Acceptance (Completed — commit `d964b2c`)
1. **Stage 7.1 — Documentation Synchronization (Completed):**
   - Synchronized all architecture, progress, audit, and deployment documents (`PROJECT_PROGRESS.md`, `PROJECT_AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `README.md`, `DEPLOYMENT.md`) with the latest verified state (commit `85dcaf9`, 183 automated tests).
   - Explicitly recorded live URLs (`https://ricozhintel.vercel.app` and `https://ricozhintel-api.onrender.com`).
   - Accurately distinguished automated test coverage, local verification, and production smoke-testing.
2. **Stage 7.2 — Frontend Bundle Size Optimization via Route-Level Code Splitting (Completed):**
   - Implemented dynamic imports with `React.lazy()` and `Suspense` in `client/src/routes/AppRoutes.jsx` across all page routes (`DashboardPage`, `DepartmentsPage`, `DepartmentDetailPage`, `KpisPage`, `KpiDetailPage`, `LoginPage`, `NotFoundPage`).
   - Completely resolved Vite's 500 kB chunk threshold advisory: largest generated chunk reduced from ~750 kB to 367.57 kB (`DashboardPage`), with main entry chunk at 318.41 kB.
   - All 128 frontend tests and 55 backend tests remain 100% passing.
3. **Stage 7.3 — Production Deployment & Initial Verification (Completed):**
   - Live infrastructure, CORS configuration, routing, and health checks verified on Vercel and Render.
   - Verified clean zero-downtime deployment for code-split frontend and backend services.

---

## Milestone 8: KPI History, Change Notes & Trend Analytics (Completed — commit `154493c`)
1. **Stage 8.1 — Backend History Tracking Model, Rollback & API (Completed):**
   - Created `KpiHistory` Mongoose schema with `kpiId`, `value`, `target`, `achievement`, `status`, `changeNote` (max 500 chars), `changedBy` (ref: User), and `isBaseline`.
   - Wired history recording into `kpiService.createKpi` (baseline creation) and `kpiService.updateKpi` (check-in/value updates).
   - Implemented transaction support with automatic compensating rollback fallback for non-replica-set MongoDB environments.
   - Created paginated API endpoint `GET /api/v1/kpis/:id/history` with input validation (`page`, `limit` max 100).
   - Added 24 new backend integration tests across 2 new test suites (`server/tests/kpi.history.test.js`, 15 tests; `server/tests/kpi.history.model.test.js`, 9 tests), bringing backend test total to **79 passing tests** across 8 suites.
2. **Stage 8.2 — Frontend Change Notes in Quick Value Modal (Completed):**
   - Extended `QuickValueModal.jsx` to include an optional change note textarea (max 500 characters) with real-time character count.
   - Updated `kpiService.updateValue` to accept and send `changeNote`.
   - Added unit and workflow tests for change note entry, trimming, and payload submission in `client/src/test/forms.test.jsx`.
3. **Stage 8.3 — KPI History Timeline Component (Completed):**
   - Built `KpiHistoryTimeline.jsx` on `KpiDetailPage.jsx` to display chronological audit history.
   - Displays relative and absolute timestamps, user attribution (`changedBy.name` or fallback), value deltas, status badges, and baseline indicators.
   - Implemented pagination controls (Previous/Next), loading skeletons, error states with retry, and empty state handling.
   - Added 11 new tests in `client/src/test/kpiHistoryTimeline.test.jsx`.
4. **Stage 8.4 — KPI Trend Analytics Chart & Unit Formatting (Completed):**
   - Built `KpiTrendChart.jsx` rendering chronological historical values via Recharts `LineChart` and `ResponsiveContainer`.
   - Added target reference line (`ReferenceLine`) with unit-aware formatting matching KPI unit (`%`, `$`, or custom string).
   - Created `client/src/utils/trendUtils.js` for chronological sorting, duplicate timestamp deduplication, and data transformation.
   - Handled edge cases: no history, single baseline record (renders single-point dot with descriptive message), and 100-record query limit.
   - Integrated with both Admin and Viewer permissions (read-only for all authenticated roles).
   - Added 9 new tests in `client/src/test/kpiTrendChart.test.jsx`, bringing frontend test total to **148 passing tests** across 14 suites.
5. **Combined Verification & Code Quality:**
   - **227 total automated tests passing** (79 backend in Jest + 148 frontend in Vitest) across 22 suites.
   - Clean ESLint run (0 errors, 0 warnings).
   - Clean production build with all chunks under 370 kB.

---

## Milestone 9: Documentation Synchronization & Production Deployment Acceptance (Completed)
1. **Stage 9.1 — Documentation Synchronization (Completed):**
   - Synchronized `PROJECT_PROGRESS.md`, `PROJECT_AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `README.md`, and `DEPLOYMENT.md` to accurately document Milestone 7 code-splitting (commit `d964b2c`) and Milestone 8 history/notes/trend analytics (commit `154493c`).
   - Recorded verified test counts: **227 passing automated tests** (79 backend in Jest + 148 frontend in Vitest) across 22 suites.
   - Accurately categorized completed features, live production manual verifications, known limitations (100-record chart limit, Render free-tier cold starts), and future work.
2. **Stage 9.2 — Production Smoke Testing & Deployment Verification (Completed):**
   - **Automated Live Checks:** Verified live frontend availability (HTTP 200 on Vercel), backend health (HTTP 200 with `db: "connected"` on Render), build provenance (Vercel bundle metadata confirms commit `154493c`), and unauthenticated API boundary enforcement (HTTP 401 on unauthenticated `/kpis/:id/history` and mutating endpoints; HTTP 401 on invalid Bearer tokens).
   - **Local Automated Test Coverage:** Invalid MongoID handling (HTTP 400 VALIDATION_ERROR), nonexistent KPI handling (HTTP 404), pagination validation (HTTP 400), authenticated history reads for Admin and Viewer, and Viewer mutation rejections (HTTP 403 Forbidden) verified locally in Jest test suites without mutating production data.
   - **User-Confirmed Production Flows:** Operator previously manually confirmed authenticated sign-in, history timeline rendering, Quick Value check-ins with change notes, trend analytics with target reference lines, and Viewer UI action hiding on live deployments.
   - **Deferred Testing:** Scripted browser-level automated end-to-end regression suites (Playwright/Cypress) are deferred to the post-MVP roadmap.

---

## Milestone 10: Administrative User Management & Concurrency Hardening (Completed)
1. **Stage 10.1 — Backend User Management API & Concurrency Remediation (Completed):**
   - Extended `User` model with `status: { type: String, enum: ['active', 'inactive'], default: 'active' }`.
   - Updated `authService.loginUser` to reject deactivated accounts (HTTP 403 `ACCOUNT_INACTIVE`).
   - Updated `authenticate` middleware to check account status on every request and reject deactivated accounts (HTTP 401).
   - Created `/api/v1/users` router and controller with endpoints for paginated listing, user creation, profile editing, role assignment, and status toggling.
   - Preserved `/api/v1/auth/users/:id/role` backward compatibility.
   - Enforced last-active-admin invariant using MongoDB ACID multi-document transactions serialized against a shared barrier document in `system_locks` (`withAdminMutationTransaction`), re-fetching the target user and fresh admin count inside the transaction.
   - Upgraded test harness in `server/tests/setup.js` from `MongoMemoryServer` to `MongoMemoryReplSet` to support transactions in tests.
   - Added 29 integration tests in `server/tests/user.management.test.js`, bringing backend tests to **108 passing tests** across 9 suites.
2. **Stage 10.2 — Frontend User Service, Route Protection & Navigation (Completed):**
   - Implemented `client/src/services/userService.js` with comprehensive methods for listing, creating, fetching, updating profiles, updating roles, and toggling statuses.
   - Added `adminOnly` route protection in `ProtectedRoute.jsx` with automatic redirect to `/` for non-admin viewers.
   - Added `/users` route in `AppRoutes.jsx` with code-split lazy loading.
   - Added "Users" sidebar navigation item in `Sidebar.jsx`, conditionally rendered for admin users only.
   - Added 8 unit tests in `userService.test.js` and 5 navigation/route protection tests in `userNavigation.test.jsx`.
3. **Stage 10.3 — Frontend User Management UI (Completed):**
   - Implemented `UserFormModal.jsx` supporting creation (with password, role, status) and profile editing (`name`, `email`) with validation and dirty-state checking.
   - Implemented `UsersPage.jsx` with debounced search, role and status filtering, reset button, paginated user table, role-colored badges, status pills, visual `(You)` indicators, and self-demotion/deactivation button disables.
   - Integrated `ConfirmDialog` confirmation modals for role changes and account activation/deactivation.
   - Handled backend error responses (such as last-active-admin lockout) gracefully with toast notifications.
   - Added 15 integration tests in `client/src/test/usersPage.test.jsx`.
4. **Stage 10.4 — Final Tests, Documentation & Audit (Completed):**
   - Verified end-to-end API contracts, query parameters, response envelopes, and error codes.
   - Secured mock cleanup resilience in `server/tests/kpi.history.service.test.js` with `try ... finally` blocks.
   - Updated all documentation (`README.md`, `DEPLOYMENT.md`, `PROJECT_PROGRESS.md`, `IMPLEMENTATION_PLAN.md`).
   - Successfully ran full backend test suite (108/108 tests passing), frontend test suite (176/176 tests passing), and frontend production build (284 tests total).
