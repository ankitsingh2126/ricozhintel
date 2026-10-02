# Ricozhintel

**Operational intelligence platform for enterprise leadership.**

Ricozhintel provides unified visibility into cross-functional business performance
through KPI dashboards, departmental monitoring, target tracking, executive
scorecards, and management reporting.

---

## Current Status: Milestone 1 (~28% of MVP)

This repository contains the first foundational milestone of a larger
production-oriented application. It is a working, end-to-end demonstration of the
stack and architecture, not a finished product.

### What is included

| # | Deliverable | Status |
|---|---|---|
| 1 | React (Vite) frontend + Node/Express backend | Done |
| 2 | Responsive layout with sidebar and header | Done |
| 3 | Executive dashboard shell | Done |
| 4 | KPI summary cards | Done |
| 5 | Department and KPI list + detail pages | Done |
| 6 | Charts for status breakdown and department progress | Done |
| 7 | Express REST API with versioned routes (/api/v1) | Done |
| 8 | MongoDB connection and Department/KPI models (Mongoose) | Done |
| 9 | Full CRUD for departments and KPIs | Done |
| 10 | React dashboard wired to live backend API | Done |
| 11 | Error handling, request validation, loading states, env vars | Done |

### Deferred to later milestones

- Complete authentication and role-based permissions
- Advanced target / scorecard management
- Automated reports and scheduled delivery
- External enterprise integrations
- Production deployment (CI/CD, hosting, monitoring)

---

## Architecture

ricozhintel/
  client/   React + Vite + Tailwind + Recharts
  server/   Node + Express + Mongoose + MongoDB

Each side is independently installable and runnable. The client talks to the
server over a versioned REST API (/api/v1).

See client/README.md and server/README.md for side-specific setup.

---

## Quick Start

Prerequisites: Node.js 20+, MongoDB running locally on port 27017.

### 1. Backend

    cd server
    npm install
    Copy-Item .env.example .env
    npm run seed
    npm run dev

Starts on http://localhost:5000.

### 2. Frontend (second terminal)

    cd client
    npm install
    Copy-Item .env.example .env
    npm run dev

Starts on http://localhost:5173. Open in a browser.

---

## Technology Stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, Recharts, axios, lucide-react
- Backend: Node.js, Express 4, Mongoose 8
- Database: MongoDB
- API style: REST, JSON, versioned under /api/v1

---

## API Overview

All routes are prefixed with /api/v1.

| Resource    | Endpoints |
|-------------|-----------|
| Health      | GET /health |
| Departments | GET/POST /departments, GET/PATCH/DELETE /departments/:id |
| KPIs        | GET/POST /kpis, GET/PATCH/DELETE /kpis/:id, GET /kpis/summary |

All responses share a consistent envelope:

    { "success": true, "data": { ... }, "meta": { ... } }
    { "success": false, "error": { "code": "...", "message": "...", "details": [] } }

---

## Environment Variables

No credentials are committed to this repository. Each side has an
.env.example file that must be copied to .env before running.

| Side   | Variable         | Purpose |
|--------|------------------|---------|
| server | PORT             | HTTP port |
| server | NODE_ENV         | development / production |
| server | MONGODB_URI      | MongoDB connection string |
| server | CLIENT_ORIGIN    | CORS origin for the frontend |
| client | VITE_API_BASE_URL| Backend base URL |

---

## License

UNLICENSED - private project.
