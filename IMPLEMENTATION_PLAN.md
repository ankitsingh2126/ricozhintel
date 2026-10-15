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

## Milestone 4: Deployment Documentation & Verification
1. **Free-Tier Deployment Guide (`DEPLOYMENT.md`):**
   - MongoDB Atlas cluster setup & connection URI formatting.
   - Backend deployment configuration (Render / Railway / fly.io).
   - Frontend deployment configuration (Vercel / Netlify / Cloudflare Pages).
   - Environment variables matrix and health-check verification steps.
