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

## Milestone 6: Automated Frontend Testing & Production Rollout
1. **Frontend Component Tests:**
   - Configure Vitest + React Testing Library for automated UI tests.
2. **Production Deployment:**
   - Execute production deployment to Render and Vercel following `DEPLOYMENT.md`.
