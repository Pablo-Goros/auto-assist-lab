# AutoAssist Mini

Small web application for practicing the full stack flow: React, Firebase Auth, FastAPI,
PostgreSQL, and Google Cloud Pub/Sub.

## Documentation hierarchy

Each project fact has one authoritative home:

1. [`docs/spec.md`](docs/spec.md) defines product behavior, technical contracts, and
   acceptance criteria.
2. [`docs/AGENTS.md`](docs/AGENTS.md) defines mandatory implementation and security
   practices.
3. [`docs/implementation.md`](docs/implementation.md) tracks phase order, progress, and
   verification status without duplicating the specification.

## Architecture

```text
React (frontend)  ──HTTP──►  FastAPI (backend)  ──►  PostgreSQL
                                    │
                                    └──►  Pub/Sub  ──►  Worker
```

| Component | Port | Purpose |
|---|---:|---|
| Frontend (Vite) | 5173 | React UI |
| Backend (FastAPI) | 8000 | REST API and OpenAPI docs |
| PostgreSQL (Docker) | 5433 | Application database (5433 avoids conflict with local PostgreSQL on 5432) |
| Worker | — | Pub/Sub consumer (Phase 7) |

## Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- Docker Desktop (or Docker Engine with Compose)

## Setup

1. Clone the repository and copy environment variables:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

3. Install and run the backend:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e ".[dev]"
   ```

   If `alembic` is not recognized, either activate the venv (see `(.venv)` in the
   prompt) or prefix commands with `.\.venv\Scripts\python.exe -m`:

   ```powershell
   python -m alembic upgrade head
   python scripts/seed.py
   python -m uvicorn app.main:app --reload --port 8000
   ```

4. Install and run the frontend (separate terminal):

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

## Verification

With PostgreSQL, backend, and frontend running:

| Check | Command or URL |
|---|---|
| Frontend dev server | http://localhost:5173 |
| API health | http://localhost:8000/api/health |
| OpenAPI docs | http://localhost:8000/docs |
| PostgreSQL health | `docker compose ps` shows `healthy` |

Run automated checks:

```powershell
# Frontend
cd frontend
npm run type-check
npm test
npm run build

# Backend (with venv active)
cd backend
pytest
```

### API contract generation

FastAPI's OpenAPI schema is the source of truth for frontend API types. After
changing a backend request model, response model, or enum, regenerate the
committed contract and TypeScript definitions:

```powershell
cd frontend
npm run generate:api
```

Do not edit `openapi.json` or `frontend/src/api/generated.ts` manually. CI can
use `npm run check:api` to fail when either generated file is stale.

## Database

Apply migrations and load the six development workshops (three per country tenant):

```powershell
cd backend
alembic upgrade head
python scripts/seed.py
```

Rollback the latest migration:

```powershell
alembic downgrade -1
```

Rollback all migrations:

```powershell
alembic downgrade base
```

Set the one administrator UID in `.env` before signing in with that account:

```text
ADMIN_FIREBASE_UID=<firebase uid from Google Sign-In>
```

The seed script only manages workshops and is idempotent. It supplies both immutable tenants,
Argentina (`AR`) and Chile (`CL`), with usable workshop data.

## Project structure

```text
auto-assist-lab/
├── frontend/     React + TypeScript + Vite
├── backend/      FastAPI + SQLAlchemy
├── worker/       Pub/Sub notification worker (Phase 7)
├── docker-compose.yml
├── .env.example
└── docs/
```

## Current phase

Phase 6 — Country tenancy complete. Phase 7 (Pub/Sub and worker) is next.
See [`docs/implementation.md`](docs/implementation.md) for detailed progress.

## Firebase authentication (Phase 5)

The application now uses Google Sign-In through Firebase in React and verifies every ID token
with the Firebase Admin SDK in FastAPI. Firebase establishes identity; the `users` table in
PostgreSQL remains the only source of application roles.

### One-time Firebase setup

1. Create or select a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. Add a Web app in **Project settings > General** and copy its `apiKey`, `authDomain`,
   `projectId`, and `appId` into the matching `VITE_FIREBASE_*` variables in `.env`.
3. In **Authentication > Sign-in method**, enable Google and choose the project support email.
4. In **Authentication > Settings > Authorized domains**, add `localhost` for local development.
5. In **Project settings > Service accounts > Firebase Admin SDK**, generate a private key.
   Save it as `secrets/firebase-adminsdk.json` and never commit or share it.
6. Set `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` in `.env` as shown in
   `.env.example`. Relative credential paths are resolved from the repository root.

Restart both servers after changing Firebase configuration. The Firebase web configuration is
safe to expose to the browser; the Admin SDK private key is not.

### Registration and roles

Every verified Google sign-in is registered automatically as an `OWNER`, using the Firebase email
and display-name claims. Set `ADMIN_FIREBASE_UID` to the immutable Firebase UID of the one
administrator; that account is created or reconciled as `ADMIN` on login. The administrator can
then use `/admin` to switch other registered users between `OWNER` and `OPERATOR`.

`ADMIN` cannot be granted or removed through the API, including for the configured administrator.
After a role change, the affected user should refresh or sign in again before using their new
dashboard. Existing owner/operator/admin records are normalized to `OWNER` by the migration; the
configured administrator is promoted again on its next authenticated request.

## Country tenancy (Phase 6)

Every owner, operator, workshop, and service request belongs to exactly one country tenant:
Argentina (`AR`) or Chile (`CL`). Existing development data migrates to Argentina. A newly
authenticated non-administrator must choose a country once at `/select-tenant`; tenant-scoped
API endpoints return `409` until that selection is complete. PostgreSQL composite foreign keys
and API queries prevent cross-country request ownership and workshop assignment.

The configured administrator remains global. In `/admin`, it can correct a non-admin account's
country only while that account has not created a service request.

## Frontend

The responsive React interface includes:

- `/login` with Firebase Google Sign-In, session restoration, ID-token refresh, and logout.
- `/requests` with owner-only data, search, summary metrics, empty/loading/error states,
  and assigned workshop visibility.
- `/requests/new` with required-field validation, problem types, readable API errors,
  duplicate-submit protection, and success redirect.
- `/operator` with owner/request details, search, status filtering, active workshops,
  assignment/reassignment, and per-row loading, success, and error feedback.
- Session and PostgreSQL-role route guards for anonymous, owner, operator, and administrator navigation.
- `/admin` user management with loading, success, and API-error feedback for role and country corrections.
- `/select-tenant` first-login country selection, with protected owner/operator routes until complete.

## API

Protected endpoints require an `Authorization: Bearer <firebase-id-token>` header. FastAPI
verifies its signature, expiry, audience, and issuer through Firebase Admin before resolving the
UID to an application user.

In Swagger (`/docs`), click **Authorize** and enter only a current Firebase ID token (do not type
`Bearer`). ID tokens are credentials: use them only locally and never commit or share them.

To confirm which UIDs exist in your database:

```powershell
docker compose exec postgres psql -U autoassist -d autoassist -c "SELECT firebase_uid, role FROM users;"
```

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| GET | `/api/me` | any | Current application user |
| GET | `/api/tenants` | any | List available country tenants |
| POST | `/api/me/tenant` | unassigned OWNER/OPERATOR | Select country once |
| GET | `/api/admin/users` | ADMIN | List registered users |
| PATCH | `/api/admin/users/{id}/role` | ADMIN | Set an OWNER or OPERATOR role |
| PATCH | `/api/admin/users/{id}/tenant` | ADMIN | Correct a country before request history exists |
| POST | `/api/service-requests` | OWNER | Create a request |
| GET | `/api/service-requests/me` | OWNER | List own requests |
| GET | `/api/operator/service-requests` | OPERATOR | List all requests |
| GET | `/api/workshops` | OPERATOR | List active workshops |
| POST | `/api/operator/service-requests/{id}/assign` | OPERATOR | Assign workshop |

Try the API from Swagger UI at http://localhost:8000/docs after starting the backend.

**Repeated assignment:** an already assigned request may be reassigned to another active
workshop; `assigned_at` is updated and a new `service_request.assigned` event is logged.

**Publish failure:** if event publication fails after commit, the assignment persists and
the API returns `500` with `"Failed to publish assignment event"`.
