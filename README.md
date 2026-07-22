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
| Worker | — | Pub/Sub consumer (Phase 6) |

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

Apply migrations and load seed data (owner, operator, three workshops):

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

Map seed users to real Firebase UIDs by setting these variables in `.env` before running
`python scripts/seed.py`:

```text
SEED_OWNER_FIREBASE_UID=<firebase uid from Google Sign-In>
SEED_OPERATOR_FIREBASE_UID=<firebase uid from Google Sign-In>
```

Re-run the seed script after updating UIDs; it skips records that already exist.

## Project structure

```text
auto-assist-lab/
├── frontend/     React + TypeScript + Vite
├── backend/      FastAPI + SQLAlchemy
├── worker/       Pub/Sub notification worker (Phase 6)
├── docker-compose.yml
├── .env.example
└── docs/
```

## Current phase

Phase 5 — Firebase authentication, code complete; live Firebase provisioning and real-user
verification remain. See [`docs/implementation.md`](docs/implementation.md) for detailed progress.

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

### Register owner and operator roles

AutoAssist deliberately does not assign roles from Google or from browser input. To register a
test account:

1. Sign in once with Google. The first attempt may end with `User not registered`; this still
   creates the identity in **Firebase Authentication > Users**.
2. Copy that user's Firebase UID into `SEED_OWNER_FIREBASE_UID` or
   `SEED_OPERATOR_FIREBASE_UID` in `.env`, and set the matching email and display name.
3. Run the seed again:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe scripts/seed.py
   ```

4. Sign in again. `/api/me` will now resolve the Firebase UID to the PostgreSQL role and route
   the user to the correct dashboard.

## Frontend

The responsive React interface includes:

- `/login` with Firebase Google Sign-In, session restoration, ID-token refresh, and logout.
- `/requests` with owner-only data, search, summary metrics, empty/loading/error states,
  and assigned workshop visibility.
- `/requests/new` with required-field validation, problem types, readable API errors,
  duplicate-submit protection, and success redirect.
- `/operator` with owner/request details, search, status filtering, active workshops,
  assignment/reassignment, and per-row loading, success, and error feedback.
- Session and PostgreSQL-role route guards for anonymous, owner, and operator navigation.

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
