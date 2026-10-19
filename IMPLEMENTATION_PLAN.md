# IMPLEMENTATION PLAN: Ricozhintel MVP Completion

Based on the findings in `PROJECT_AUDIT.md`, this plan addresses the critical MVP requirements, fixes data integrity gaps, extends automated testing, and ensures production readiness without breaking existing code.

---

## Milestone 1: Data Integrity & Backend Accuracy (Immediate)
1. **Department Deletion Integrity:**
   - Modify `departmentService.deleteDepartment` to check if any KPIs reference this department before deleting.
   - If referenced KPIs exist, return a clear 400 Bad Request / Conflict with a user-friendly message (`"Cannot delete department with active KPIs. Reassign or delete the KPIs first."`).
2. **KPI Department Summary Aggregation Correction:**
   - In `kpiService.getSummaryByDepartment`, avoid unit mixing. Compute `avgAchievement` by calculating average individual KPI achievement percentages (mirroring `calculateAchievement` logic) rather than summing incompatible raw numbers across different units.

---

## Milestone 2: Comprehensive Backend Test Coverage
1. **Department Integration Tests (`server/tests/department.test.js`):**
   - Test department listing with pagination and search.
   - Test validation errors (missing name/code, short code).
   - Test duplicate code / name returning 409 Conflict.
   - Test update (`PATCH` & `PUT` alias).
   - Test delete protection when department has assigned KPIs.
   - Test successful delete when department has no KPIs.
2. **KPI Summaries Integration Tests (`server/tests/kpi.summary.test.js`):**
   - Test `/api/v1/kpis/summary` (status counts, average progress).
   - Test `/api/v1/kpis/summary/by-department` (department breakdown and achievement).

---

## Milestone 3: Frontend Refinement & User Experience
1. **Department Detail KPI Quick-Add:**
   - Allow adding a KPI directly from `DepartmentDetailPage` pre-selecting the current department.
2. **Client Validation & Error Toast Consistency:**
   - Verify all input limits and error handling across both forms (`DepartmentFormModal` and `KpiFormModal`).
3. **Verify Full Production Build:**
   - Run `npm run build` to ensure clean bundle output.

---

## Milestone 4: CSV Export & Deployment Architecture
1. **RFC 4180 CSV Export Utility (`client/src/utils/csvExport.js`):**
   - KPI table export respecting active filters (search, status, period).
   - Executive Dashboard Department snapshot export.
2. **Free-Tier Deployment Guide (`DEPLOYMENT.md`):**
   - MongoDB Atlas cluster setup & connection URI formatting.
   - Backend deployment configuration (Render / Railway / fly.io).
   - Frontend deployment configuration (Vercel / Netlify / Cloudflare Pages).
   - Environment variables matrix and health-check verification steps.

---

## Milestone 5: Authentication & Role-Based Access Control (Completed)
1. **Stateless JWT Security Architecture:**
   - User schema with `bcryptjs` password hashing, unique email enforcement, role field (`admin` | `viewer`).
   - `authenticate` and `authorize('admin')` middleware securing Express routes.
   - Authentication routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
   - Seed script populates demo Admin and Viewer accounts.
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

## Milestone 7: Production Rollout, Performance & Acceptance (In Progress)
1. **Stage 7.1 — Documentation Synchronization (Completed):**
   - Synchronized all architecture, progress, audit, and deployment documents (`PROJECT_PROGRESS.md`, `PROJECT_AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `README.md`, `DEPLOYMENT.md`) with the latest verified state (commit `85dcaf9`, 183 automated tests).
   - Explicitly recorded live URLs (`https://ricozhintel.vercel.app` and `https://ricozhintel-api.onrender.com`).
   - Accurately distinguished automated test coverage, local verification, and production smoke-testing.
2. **Stage 7.2 — Frontend Bundle Size Optimization via Route-Level Code Splitting (Completed):**
   - Implemented dynamic imports with `React.lazy()` and `Suspense` in `client/src/routes/AppRoutes.jsx` across all page routes (`DashboardPage`, `DepartmentsPage`, `DepartmentDetailPage`, `KpisPage`, `KpiDetailPage`, `LoginPage`, `NotFoundPage`).
   - Completely resolved Vite's 500 kB chunk threshold advisory: largest generated chunk reduced from ~750 kB to 367.57 kB (`DashboardPage`), with main entry chunk at 318.41 kB.
   - All 128 frontend tests and 55 backend tests remain 100% passing.
3. **Stage 7.3 — Production End-to-End Smoke Testing & Final Acceptance (Pending):**
   - Infrastructure, CORS, routing, and unauthenticated API checks verified as passing.
   - Live authenticated user workflows (login, Department CRUD, KPI Quick Value check-ins) pending test credentials/operator manual verification.
