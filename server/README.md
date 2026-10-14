# Ricozhintel — Server

Express 4 + Mongoose 8 backend for the Ricozhintel operational intelligence
platform.

- REST API mounted under `/api/v1/*` with a `/api/health` compatibility alias.
- MongoDB persistence through Mongoose.
- Request validation via `express-validator`.
- Consistent response envelope for every route.
- Centralised error handling.
- Integration tests with Jest + Supertest + `mongodb-memory-server`.

---

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [API reference](#api-reference)
- [Validation and error handling](#validation-and-error-handling)
- [Seed data](#seed-data)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)

---

## Quick start

Requires Node.js 20 or later and a running MongoDB on
`mongodb://127.0.0.1:27017` (or any URI you place in `.env`).

    cd server
    npm install
    Copy-Item .env.example .env
    npm run seed       # optional: load 5 demo departments + 14 demo KPIs
    npm run dev        # starts on http://localhost:5000

Expected startup output:

    [db] MongoDB connected
    [server] Ricozhintel API listening on http://localhost:5000
    [server] Health check: http://localhost:5000/api/v1/health

Stop with Ctrl + C. The process handles SIGINT and SIGTERM and closes the
MongoDB connection before exiting.

### Verify the server is up

In a second PowerShell window:

    curl.exe http://localhost:5000/api/v1/health

Expected body (formatted here for readability):

    {
      "success": true,
      "data": {
        "service": "ricozhintel-api",
        "status": "ok",
        "uptime": 12.34,
        "timestamp": "2026-...",
        "db": "connected"
      }
    }

The alias path returns the same payload plus `"alias": true`:

    curl.exe http://localhost:5000/api/health

---

## Environment variables

Copy `.env.example` to `.env`. All four variables are required. The server
will exit at startup if any is missing, listing the missing keys.

| Variable | Purpose | Example |
|---|---|---|
| PORT | HTTP port | 5000 |
| NODE_ENV | development or production | development |
| MONGODB_URI | MongoDB connection string | mongodb://127.0.0.1:27017/ricozhintel |
| CLIENT_ORIGIN | Allowed CORS origin for the frontend | http://localhost:5173 |

`.env` is gitignored. `.env.example` is committed. Never commit real
credentials.

### Test-time overrides

`tests/setup.js` starts an in-memory MongoDB (mongodb-memory-server) and
overrides MONGODB_URI, NODE_ENV, PORT, and CLIENT_ORIGIN before any
application module is imported. Tests never read the developer's `.env`.

---

## Scripts

From `server/package.json`:

| Script | Command | Purpose |
|---|---|---|
| npm start | node server.js | Run without file watching |
| npm run dev | nodemon server.js | Development with auto-reload |
| npm run seed | node src/seed/seedData.js | Wipe and reload demo data |
| npm test | node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand | Run integration tests |

`--experimental-vm-modules` is required for Jest to load native ESM.
`--runInBand` keeps test files sequential so a single in-memory MongoDB
instance is enough.

---

## Architecture

    HTTP request
        |
        v
    app.js  -->  helmet  -->  cors  -->  express.json  -->  morgan (dev)
        |
        v
    rate limiter (on /api)
        |
        v
    routes/index.js  -->  /v1/*  ->  resource routers
                     -->  /      ->  alias router (/health only)
        |
        v
    route (verb + path + validators + controller)
        |
        v
    controller  -->  reads req, calls service, sends response via sendSuccess
        |
        v
    service    -->  business logic, calls models, throws ApiError on failures
        |
        v
    model      -->  Mongoose schema -> MongoDB
        |
        v
    response   -->  { success, data, meta? }  or  { success, error }

Any error thrown by a controller or service bubbles to the central
`errorHandler`, which normalises it into the failure envelope. Unknown routes
fall through to `notFound`, which produces the same envelope with
`code: "NOT_FOUND"`.

### Layers

| Folder | Responsibility |
|---|---|
| config/ | env.js (validated environment), db.js (Mongoose connect + events) |
| models/ | Mongoose schemas and models |
| services/ | Business logic - the only layer that talks to models |
| controllers/ | HTTP concerns - reads req, calls service, sends response |
| routes/ | URL-to-controller mapping, validator wiring |
| validators/ | express-validator rule sets per resource |
| middleware/ | errorHandler, notFound, validateRequest |
| utils/ | ApiError, apiResponse, achievement |
| seed/ | Demo data script |
| tests/ | Jest + Supertest suites, memory-server setup |

---

## Folder structure

    server/
    ├── src/
    │   ├── app.js                     Express app factory (createApp)
    │   ├── config/
    │   │   ├── db.js                  connectDB + connection event logging
    │   │   └── env.js                 Loads and validates .env
    │   ├── controllers/
    │   │   ├── departmentController.js
    │   │   └── kpiController.js
    │   ├── middleware/
    │   │   ├── errorHandler.js        4-arg Express error handler
    │   │   ├── notFound.js            JSON 404 for unmatched routes
    │   │   └── validateRequest.js     Turns express-validator results into a 400
    │   ├── models/
    │   │   ├── Department.js
    │   │   └── Kpi.js
    │   ├── routes/
    │   │   ├── aliasRoutes.js         /health compatibility alias
    │   │   ├── departmentRoutes.js
    │   │   ├── healthRoutes.js
    │   │   ├── index.js               Mounts /v1/* and the alias router
    │   │   └── kpiRoutes.js
    │   ├── seed/
    │   │   └── seedData.js            Demo data loader
    │   ├── services/
    │   │   ├── departmentService.js
    │   │   └── kpiService.js
    │   ├── utils/
    │   │   ├── achievement.js         calculateAchievement + withAchievement
    │   │   ├── ApiError.js            Custom error class
    │   │   └── apiResponse.js         sendSuccess + sendError helpers
    │   └── validators/
    │       ├── departmentValidator.js
    │       └── kpiValidator.js
    ├── tests/
    │   ├── setup.js                   Memory server + env overrides
    │   ├── health.test.js             3 tests
    │   └── kpi.validation.test.js     7 tests
    ├── .env.example
    ├── jest.config.js
    ├── package.json
    ├── README.md                      this file
    └── server.js                      entry point

---

## API reference

Base paths:

- Canonical: `/api/v1/*`
- Alias: `/api/health`

### Response envelope

Success:

    {
      "success": true,
      "data": { }
    }

List endpoints also include a meta object:

    {
      "success": true,
      "data": [ ],
      "meta": { "page": 1, "limit": 20, "total": 42, "pages": 3 }
    }

Failure:

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

`details` is only present on validation errors.

### Health

#### GET /api/v1/health

Returns service identity, uptime, server time, and MongoDB connection state
(disconnected, connected, connecting, disconnecting).

#### GET /api/health

Alias for the above. Response includes `"alias": true`.

### Departments

| Method | Path | Behavior |
|---|---|---|
| GET | /api/v1/departments | List. Query params: search (matches name or code, case-insensitive), page (default 1), limit (default 20). |
| GET | /api/v1/departments/:id | Fetch one. Invalid ObjectId -> 400; missing record -> 404. |
| POST | /api/v1/departments | Create. Validated. Duplicate name or code -> 409. |
| PATCH | /api/v1/departments/:id | Partial update. Validated. Duplicate name or code -> 409. |
| PUT | /api/v1/departments/:id | Alias for PATCH. |
| DELETE | /api/v1/departments/:id | Delete. Missing record -> 404. |

Department fields:

| Field | Required | Rules |
|---|---|---|
| name | yes | 2-80 chars, unique |
| code | yes | 2-10 chars, alphanumeric plus - and _, stored uppercase, unique |
| head | no | string |
| description | no | max 500 chars |
| status | no | active (default) or inactive |

### KPIs

| Method | Path | Behavior |
|---|---|---|
| GET | /api/v1/kpis | List. Query params: department, status, period, search, page (default 1), limit (default 20). |
| GET | /api/v1/kpis/summary | Global counts by status plus average achievement across all KPIs. |
| GET | /api/v1/kpis/summary/by-department | One row per department with status counts, raw sums, and average achievement. |
| GET | /api/v1/kpis/:id | Fetch one, with the department populated (name, code). |
| POST | /api/v1/kpis | Create. Validated. Duplicate code -> 409. Non-existent department -> 400. |
| PATCH | /api/v1/kpis/:id | Partial update. Same validations. |
| PUT | /api/v1/kpis/:id | Alias for PATCH. |
| DELETE | /api/v1/kpis/:id | Delete. Missing record -> 404. |

KPI fields:

| Field | Required | Rules |
|---|---|---|
| name | yes | 2-120 chars |
| code | yes | 2-20 chars, alphanumeric plus - and _, stored uppercase, unique |
| department | yes | valid ObjectId referencing an existing department |
| description | no | max 500 chars |
| unit | no | max 10 chars, defaults to % |
| target | yes | non-negative number |
| currentValue | no | non-negative number, defaults to 0 |
| status | no | on_track, at_risk, off_track, completed (default on_track) |
| period | no | monthly, quarterly, yearly (default monthly) |
| owner | no | max 120 chars |
| statusRule | no | higher_is_better (default) or lower_is_better |

### Achievement

Every KPI response includes a computed `achievement` field:

- For statusRule "higher_is_better": Math.round(currentValue / target * 100)
- For statusRule "lower_is_better":  Math.round(target / currentValue * 100)
- Returns null when the target is zero, missing, or non-numeric, or when the
  division would be undefined.

The computation lives in src/utils/achievement.js and is applied by
kpiService on read, create, and update.

### Example requests

Using Invoke-RestMethod from PowerShell:

    $base = 'http://localhost:5000/api/v1'

    # List KPIs for a department
    Invoke-RestMethod "$base/kpis?department=<deptId>&period=quarterly"

    # Create a department
    Invoke-RestMethod -Uri "$base/departments" -Method Post -ContentType 'application/json' -Body (@{ name = 'Operations'; code = 'OPS'; head = 'Jane Doe' } | ConvertTo-Json)

    # Delete a KPI
    Invoke-RestMethod -Uri "$base/kpis/<kpiId>" -Method Delete

---

## Validation and error handling

### validateRequest

src/middleware/validateRequest.js runs after any express-validator rule array
on a route. If any rule fails, the request is short-circuited with:

- HTTP 400
- error.code = "VALIDATION_ERROR"
- error.details containing one object per failure with `field` and `message`

If all rules pass, the request proceeds to the controller.

### ApiError

src/utils/ApiError.js is a small subclass of Error with statusCode, code,
details, and isOperational fields. Controllers and services throw it via the
static helpers:

- ApiError.badRequest(message, details)
- ApiError.notFound(message)
- ApiError.conflict(message, details)
- ApiError.internal(message)

### errorHandler

src/middleware/errorHandler.js is a 4-argument Express error handler. It:

- Reads statusCode, code, and details from the error (with defaults).
- Sets the response message to err.message if isOperational is true;
  otherwise returns "Internal server error".
- Logs the full error to the console when NODE_ENV is not "production".
- Returns the failure envelope via sendError.

### notFound

Runs after all routes. If no route matches, responds with HTTP 404 and
error.code = "NOT_FOUND" plus the requested method and URL.

### Duplicate keys

Both services translate MongoDB's duplicate-key error (code 11000) into an
ApiError.conflict with a message naming the conflicting field (for example,
"Department code already exists").

---

## Seed data

`npm run seed` wipes the `departments` and `kpis` collections and inserts:

- 5 demo departments: Sales, Engineering, Marketing, Finance, Customer
  Success. Every name is prefixed with [DEMO] and every description ends
  with (demo).
- 14 demo KPIs: three per department (two for Finance), with mixed statuses
  and both statusRule values represented.

Every record is intentionally labelled as demo data. Do not present these
figures as real company metrics.

The seed script connects via connectDB() and exits with status 0 on success,
1 on failure.

---

## Tests

The backend has 10 integration tests, all currently passing.

### Running

    cd server
    npm test

Expected:

     PASS  tests/health.test.js
     PASS  tests/kpi.validation.test.js

    Test Suites: 2 passed, 2 total
    Tests:       10 passed, 10 total

The first run may take 30-60 seconds while the in-memory MongoDB binary is
downloaded and cached.

### What is tested

tests/health.test.js - 3 tests:

1. GET /api/v1/health returns 200 with the canonical shape (no alias field).
2. GET /api/health returns 200 with the same shape plus "alias": true.
3. GET /api/v1/does-not-exist returns 404 with error.code "NOT_FOUND" and the
   requested path in the message.

tests/kpi.validation.test.js - 7 tests:

1. Missing name -> 400, VALIDATION_ERROR, details includes name.
2. code with a space -> 400, details includes code.
3. Invalid department id format ("not-an-id") -> 400, details includes
   department.
4. Negative target -> 400, details includes target.
5. Invalid statusRule value -> 400, details includes statusRule.
6. Valid payload (target 100, current 40, higher_is_better) -> 201, and the
   returned document has achievement: 40.
7. POST against a non-existent department (valid ObjectId, no record) -> 400,
   error.code "BAD_REQUEST", message matches /department does not exist/i.

### Test isolation

tests/setup.js:

- Starts a mongodb-memory-server instance on a random free port.
- Overrides MONGODB_URI, NODE_ENV, PORT, and CLIENT_ORIGIN before the app is
  imported.
- Stops the memory server in an afterAll hook.

tests/kpi.validation.test.js clears the departments and kpis collections and
creates a fresh department before each test.

The developer's local MongoDB is never touched by the test suite.

### Known console output

`npm test` prints "[db] MongoDB connected", several "[error] POST /api/v1/kpis"
lines, and "[db] MongoDB disconnected". This is expected - the tests exercise
error paths and the error handler logs them. They are not failures.

### Not yet tested

- Department CRUD (create, update, delete paths).
- The PUT aliases.
- /api/v1/kpis/summary and /api/v1/kpis/summary/by-department.
- Any frontend behavior.

These are covered by manual verification during development but are not
currently protected by automated tests.

---

## Troubleshooting

MongoDB connected never appears:
Check that MongoDB is running (Get-Service MongoDB) and that MONGODB_URI in
.env points at it. The server will exit with an error if the connection fails.

EADDRINUSE: address already in use :::5000:
Another process is holding the port. Find and stop it with:

    Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

Missing required environment variables on startup:
.env is missing or incomplete. Copy .env.example to .env and fill in the
values.

Jest complains about ESM:
Make sure npm test is being used (not npx jest) so the
--experimental-vm-modules flag is applied.

mongodb-memory-server fails to start on first run:
The binary may not have been downloaded. Approve its postinstall script:

    npm install-scripts approve mongodb-memory-server

---

## License

UNLICENSED - private project.
