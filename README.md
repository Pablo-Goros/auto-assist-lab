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
   alembic upgrade head
   python scripts/seed.py
   uvicorn app.main:app --reload --port 8000
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

Phase 2 — database and migrations. See [`docs/implementation.md`](docs/implementation.md)
for detailed progress.
