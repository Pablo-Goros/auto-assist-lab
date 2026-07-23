# AutoAssist Mini — Implementation Tracker

This file tracks execution only. Functional behavior, contracts, and data definitions belong to
[`AutoAssist_Mini_Implementation_Spec.md`](../AutoAssist_Mini_Implementation_Spec.md).

## Status convention

- `[x]` complete and verified
- `[ ]` not started
- `[-]` in progress
- `[!]` blocked; add the reason beside the task

Update this tracker and `README.md` at each phase close. Complete phases in order and obtain
approval before starting a phase or making a significant scope change.

## Current status

- [x] Repository created.
- [x] Implementation specification created.
- [x] Agent rules created.
- [x] Implementation tracker created.
- [-] Application implementation started.

Overall phase: **Phase 6 complete; Phase 7 (local Pub/Sub and notification worker) is next**.

---

## Phase 1 — Connected project skeleton

References: Spec §§12–14 and §16.

- [x] Create the required `frontend/`, `backend/`, and `worker/` structure.
- [x] Bootstrap React + TypeScript + Vite with strict typing and test tooling.
- [x] Bootstrap typed FastAPI with configuration, CORS, logging, tests, and OpenAPI.
- [x] Add PostgreSQL to Docker Compose and implement SQLAlchemy session management.
- [x] Implement and test `GET /api/health`.
- [x] Add `.gitignore` and a complete non-sensitive `.env.example`.
- [x] Document prerequisites, setup, startup, checks, ports, and architecture.

Exit gate:

- [x] Frontend runs, tests, type-checks, and builds.
- [x] Backend runs, tests, type-checks, connects to PostgreSQL, and exposes `/docs`.
- [x] PostgreSQL reports healthy (Docker Desktop was not running during setup).
- [x] Phase close-out is recorded.

---

## Phase 2 — Database and migrations

References: Spec §§9–10.

- [x] Implement all enums and SQLAlchemy models from the data contract.
- [x] Implement relationships, constraints, defaults, indexes, and UTC timestamps.
- [x] Configure Alembic from application metadata.
- [x] Create and review the initial migration.
- [x] Create the owner, operator, and workshop seed workflow.
- [x] Add model, constraint, migration, and seed tests.
- [x] Document migration, rollback, seed, and Firebase UID mapping commands.

Exit gate:

- [x] A clean database can migrate, seed, downgrade, and re-upgrade reproducibly.
- [x] Database schema and seed data match Spec §§9–10.
- [x] Phase close-out is recorded.

---

## Phase 3 — HTTP/PostgreSQL API

References: Spec §§7–8, §15, §16, and backend cases in §17.

- [x] Define typed Pydantic requests, responses, and consistent API errors.
- [x] Add replaceable identity and event-publisher dependency boundaries.
- [x] Implement `/api/me`.
- [x] Implement owner request creation and owner-only listing.
- [x] Implement operator request listing and active-workshop listing.
- [x] Implement workshop assignment with validation, transaction handling, and post-commit publisher invocation.
- [x] Define and document repeated-assignment behavior.
- [x] Document bearer authentication and all contracts in OpenAPI.
- [x] Add backend tests for success, ownership, roles, validation, not-found cases, transactions, and publisher ordering.

Exit gate:

- [x] API contracts are correct and visible in Swagger.
- [x] Complete HTTP/PostgreSQL behavior passes through test dependency overrides.
- [x] Owner isolation and operator authorization are enforced in FastAPI.
- [x] Phase close-out is recorded.

---

## Phase 4 — Functional frontend

References: Spec §§4–5, frontend responsibilities in §6, and frontend cases in §17.

- [x] Implement the typed HTTP client and readable API error handling.
- [x] Implement `/login`, `/requests`, `/requests/new`, and `/operator`.
- [x] Implement session and role route guards behind a replaceable auth boundary.
- [x] Implement all required owner and operator actions.
- [x] Implement loading, empty, error, success, and duplicate-submit states.
- [x] Add frontend tests for rendering, redirects, forms, lists, assignment, and UI states.

Exit gate:

- [x] All required screens work against the stable local API contract.
- [x] Frontend tests, lint, type-check, and production build pass.
- [x] Phase close-out is recorded.

---

## Phase 5 — Firebase authentication and authorization

References: Spec §§5–7, configuration in §14, auth errors in §15, and auth cases in §17.

- [x] Create/configure Firebase, the web app, Google Sign-In, and authorized domains.
- [x] Configure local backend credentials without tracking secrets.
- [x] Implement React Firebase initialization, auth state, Google login, ID tokens, and logout.
- [x] Resolve `/api/me` after login and redirect by database role.
- [x] Implement Firebase Admin token verification in FastAPI.
- [x] Provision verified Firebase identities as owners and enforce reusable role dependencies.
- [x] Add backend and frontend authentication/authorization tests.
- [x] Configure one immutable administrator UID and provide admin role management.
- [x] Verify owner and operator flows end to end through the frontend.

Exit gate:

- [x] Firebase establishes identity and PostgreSQL exclusively establishes application role.
- [x] Invalid authentication returns `401`; invalid role returns `403`.
- [x] The complete authenticated HTTP/PostgreSQL flow works before Pub/Sub begins.
- [x] Phase close-out is recorded.

---

## Phase 6 — Country tenancy

References: the tenancy amendments to Spec §§7–10, API configuration in §14, and backend/frontend cases in §17.

- [x] Add the `tenants` model and seed exactly `AR` (Argentina) and `CL` (Chile).
- [x] Migrate existing users, workshops, and service requests to Argentina; make workshop and request tenancy mandatory.
- [x] Enforce tenant-safe owner and workshop relationships with database constraints and tenant-scoped queries.
- [x] Add one-time tenant selection after first Firebase login; return `409` from tenant-scoped endpoints until selection completes.
- [x] Keep the configured administrator global and add tenant correction for accounts without service-request history.
- [x] Extend `/api/me`, admin user responses, OpenAPI, generated frontend types, and the admin UI with tenant information.
- [x] Add the tenant-selection screen and prevent owner/operator cross-tenant listings and assignments.
- [x] Add migration, API, and frontend tests for selection, isolation, corrections, and cross-tenant not-found behavior.

Exit gate:

- [x] A user belongs to exactly one country tenant after onboarding; the administrator remains global.
- [x] Owners, operators, workshops, and assignments cannot cross tenant boundaries.
- [x] Existing development data migrates reproducibly to Argentina and both countries have usable workshop seed data.
- [x] Phase close-out is recorded.

---

## Phase 7 — Local Pub/Sub and notification worker

References: Spec §11, worker configuration in §14, related errors in §15, worker cases in §17, and the tenant event contract from Phase 6.

- [ ] Add an optional Docker Compose Pub/Sub emulator profile exposed on port 8085.
- [ ] Add an idempotent client-library bootstrap script for the local topic and pull subscription.
- [ ] Add `GCP_PROJECT_ID`, topic, subscription, and optional `PUBSUB_EMULATOR_HOST` configuration to the backend, worker, and `.env.example`.
- [ ] Define the versioned `service_request.assigned` JSON contract with event ID, tenant code, request/owner/workshop data, and timestamp.
- [ ] Replace the logging publisher with Google Cloud Pub/Sub publication after the assignment commit.
- [ ] Preserve the documented post-commit behavior: publish failure returns `500` while the assignment persists; no outbox or publisher retry is added in this phase.
- [ ] Implement the independent streaming-pull worker with validation, simulated notification logging, graceful shutdown, and `ack` only after successful handling.
- [ ] `nack` invalid or failed messages for emulator redelivery and document the later GCP dead-letter/retry path.
- [ ] Add mocked publisher/worker tests and an emulator-backed assignment-to-notification integration check.

Exit gate:

- [ ] A tenant-tagged assignment event is published and consumed through the local emulator.
- [ ] Valid events are acknowledged; invalid and failed messages are observable and are not acknowledged.
- [ ] Post-commit publication failure behavior and at-least-once duplicate-notification limitation are documented.
- [ ] Phase close-out is recorded.

---

## Phase 8 — OpenTelemetry and local LGTM observability

References: observability amendments to the specification and the completed Phase 7 message flow.

- [ ] Add an optional Docker Compose `observability` profile running `grafana/otel-lgtm` with Grafana on port 3000 and OTLP/HTTP on port 4318.
- [ ] Add explicit OTel SDK setup for `autoassist-api` and `autoassist-notification-worker`, configurable through standard `OTEL_*` variables.
- [ ] Instrument FastAPI, SQLAlchemy, assignment publication, and worker processing with traces, metrics, and correlated application logs.
- [ ] Inject W3C trace context into Pub/Sub message attributes and extract it in the worker to link assignment and notification spans.
- [ ] Add bounded tenant-code dimensions to business metrics; exclude Firebase tokens, email, vehicle, description, and raw event payloads from telemetry.
- [ ] Record assignment, publish, worker processing, acknowledgment/nack, and duration metrics; export application logs to Loki with trace/span correlation.
- [ ] Keep telemetry initialization idempotent and disabled in ordinary unit tests.
- [ ] Document local startup and Grafana verification for one trace, metrics, and correlated logs.

Exit gate:

- [ ] Grafana shows a single trace from assignment through worker notification.
- [ ] Tempo, Mimir, and Loki receive the expected local signals without sensitive application data.
- [ ] The normal development stack remains lightweight unless the observability profile is selected.
- [ ] Phase close-out is recorded.

---

## Phase 9 — Hardening and project close

References: Spec §§15–17, acceptance criteria in §19, technical objectives in §20, and the tenant/Pub-Sub/observability amendments.

- [ ] Verify every required API and UI error path, including incomplete tenant selection and cross-tenant access.
- [ ] Verify tenant isolation, roles, CORS, secret handling, telemetry data hygiene, and fail-closed configuration.
- [ ] Run formatter, lint, type-check, tests, builds, migration checks, emulator integration checks, and optional CI.
- [ ] Complete README setup, architecture, configuration, Swagger, emulator, observability, testing, and demo documentation.
- [ ] Run the full clean-environment Argentina and Chile owner/operator demonstration, including the worker and Grafana verification.
- [ ] Resolve or document all remaining limitations, including direct post-commit publication and at-least-once delivery.

Acceptance:

- [ ] AC-01 through AC-12: original owner/operator request and assignment behavior, scoped to a tenant.
- [ ] AC-13 through AC-16: tenant-tagged publication, worker processing, notification, and acknowledgment.
- [ ] AC-17 through AC-20: owner refresh, workshop visibility, role denial, and `401`.
- [ ] Tenancy: first-login selection, Argentina/Chile isolation, global-admin correction, and no cross-tenant assignment.
- [ ] Observability: correlated API-to-worker trace, assignment/worker metrics, and correlated logs in local LGTM.

Exit gate:

- [ ] Every original and added acceptance criterion passes.
- [ ] Setup and demonstration are reproducible from current documentation with optional emulator and observability profiles.
- [ ] Final phase close-out is recorded.

---

## Phase close-out record

### Phase 1

```text
Completed on: 2026-07-21
Status: Complete

Files changed:
- frontend/, backend/, worker/ skeleton
- docker-compose.yml, .env.example, .gitignore
- docs/implementation.md, README.md

Decisions:
- PostgreSQL exposed on host port 5433 to avoid local conflicts
- Health check validates database connectivity

Tests added or updated:
- backend/tests/test_health.py
- frontend App.test.tsx

Verification commands and results:
- npm run type-check, npm test, npm run build — pass
- pytest — pass
- docker compose ps — postgres healthy

Known limitations or follow-up:
- Firebase and Pub/Sub deferred to later phases
```

### Phase 2

```text
Completed on: 2026-07-21
Status: Complete

Files changed:
- backend/app/models/ (enums, User, Workshop, ServiceRequest)
- backend/migrations/ (Alembic env, initial migration a79f4ae8b243)
- backend/scripts/seed.py
- backend/tests/test_models.py, test_migrations.py, test_seed.py
- backend/alembic.ini, backend/pyproject.toml, backend/app/config.py
- .env.example, README.md, docs/implementation.md

Decisions:
- PostgreSQL native enums for role, problem_type, and status
- Seed script is idempotent (skips existing firebase_uid / workshop name)
- Separate autoassist_test database for migration/model tests
- Seed Firebase UIDs configured via SEED_* env vars

Tests added or updated:
- test_models.py (constraints, defaults, relationships, enums)
- test_migrations.py (upgrade, downgrade, re-upgrade)
- test_seed.py (seed data, idempotency)

Verification commands and results:
- alembic upgrade head — pass
- alembic downgrade base && alembic upgrade head — pass
- python scripts/seed.py — pass (owner, operator, 3 workshops)
- pytest (11 tests) — pass

Known limitations or follow-up:
- Replace placeholder SEED_*_FIREBASE_UID values with real Firebase UIDs before Phase 5
```

### Phase 3

```text
Completed on: 2026-07-21
Status: Complete

Files changed:
- backend/app/auth/ (StubAuthProvider, role dependencies)
- backend/app/schemas/ (Pydantic request/response models)
- backend/app/routers/ (me, service_requests, operator, workshops)
- backend/app/services/ (assignment, pubsub event publisher)
- backend/app/main.py (API router wiring, OpenAPI auth docs)
- backend/tests/test_api.py, conftest.py
- README.md, docs/implementation.md

Decisions:
- Phase 3 uses StubAuthProvider: bearer token value equals firebase_uid
- EventPublisher protocol with LoggingEventPublisher until Phase 6 Pub/Sub
- Repeated assignment allowed: updates workshop/assigned_at and republishes event
- Publish failure after commit returns 500 but assignment persists

Tests added or updated:
- test_api.py (16 tests: auth, roles, CRUD, assignment, reassignment, publish failure)

Verification commands and results:
- pytest (27 tests) — pass

Known limitations or follow-up:
- Firebase Admin token verification deferred to Phase 5
- Real Pub/Sub publication deferred to Phase 6
```

### Phase 4

```text
Completed on: 2026-07-22
Status: Complete

Files changed:
- frontend/src/api/ (typed contracts, HTTP client, readable API errors)
- frontend/src/auth/ (replaceable demo adapter, session context, role guards)
- frontend/src/components/ and frontend/src/pages/ (responsive login, owner, request form, operator UI)
- frontend/src/assets/autoassist-logo.png and frontend/src/App.css (reference-guided visual system)
- frontend/src/App.test.tsx, frontend/package.json, frontend/package-lock.json
- .env.example, README.md, docs/implementation.md

Decisions:
- Demo auth is isolated behind AuthAdapter until Firebase replaces it in Phase 5
- Local owner/operator tokens default to the seeded firebase_uid placeholders and can be overridden with VITE_DEMO_* variables
- React Router guards redirect anonymous users to login and authenticated users to the dashboard for their PostgreSQL role
- Assignment controls prevent concurrent and unchanged duplicate submissions while preserving the Phase 3 reassignment contract
- Supplied visual references drive the navy/electric-blue responsive design and the supplied logo was prepared as a transparent PNG

Tests added or updated:
- App.test.tsx (6 tests: login, role redirect, owner list, form validation/submission, assignment, loading/error states)

Verification commands and results:
- npm test — pass (6 tests)
- npm run type-check — pass
- npm run lint — pass
- npm run build — pass
- live GET /api/health and frontend HTTP response — pass
- 1440px headless browser visual inspection of /login — pass

Known limitations or follow-up:
- Firebase Google sign-in intentionally remains a replaceable demo adapter until Phase 5
- The local run skill stop helper has a PowerShell $PID naming conflict; already-running services remained healthy and hot-reloaded successfully
```

### Phase 5

```text
Completed on: 2026-07-23
Status: Complete

Files changed:
- frontend/src/firebase.ts and frontend/src/auth/ (Firebase initialization, Google popup, auth state, ID-token refresh, logout)
- backend/app/auth/ (Firebase Admin verification and production provider wiring)
- frontend/package.json, frontend/package-lock.json, backend/pyproject.toml
- frontend/src/App.test.tsx, frontend/src/auth/firebaseAuthAdapter.test.ts, backend/tests/test_auth.py
- .env.example, .gitignore, README.md, openapi.json, docs/implementation.md

Decisions:
- Firebase establishes identity; PostgreSQL remains the exclusive source of OWNER, OPERATOR, and ADMIN roles
- Firebase configuration is initialized lazily so tests can inject credential-free adapters/providers
- Browser auth state uses onIdTokenChanged so refreshed ID tokens replace expiring tokens in API requests
- Backend credentials may come from the configured private-key path or Application Default Credentials
- Verified Google identities are registered as OWNER on first login; `ADMIN_FIREBASE_UID` is the sole administrator authority

Tests added or updated:
- firebaseAuthAdapter.test.ts (Google popup, ID-token changes, logout)
- test_auth.py (verified identity extraction, invalid token, missing UID)
- App.test.tsx adapters updated for observable auth state

Verification commands and results:
- npm test — pass (10 tests)
- npm run type-check — pass
- npm run lint — pass
- npm run build — pass
- pytest — pass (32 tests)
- OpenAPI export and TypeScript contract generation — pass
- live frontend HTTP, /api/health, and PostgreSQL health — pass
- Firebase web and Admin SDK configuration verified locally; credentials match the configured project
- Owner and operator Google sign-in flows verified end to end through the frontend

Known limitations or follow-up:
- npm audit reports a pre-existing high-severity js-yaml advisory through the openapi-typescript development toolchain
```

### Phase 6

```text
Completed on: 2026-07-23
Status: Complete

Files changed:
- backend tenancy model, migration, scoped dependencies/routes, seed workflow, and API tests
- frontend tenant onboarding, admin country correction, generated OpenAPI types, and UI tests
- README.md, openapi.json, docs/implementation.md

Decisions:
- `AR` and `CL` are immutable tenant records seeded by the tenancy migration.
- Existing development records migrate to `AR`; newly authenticated non-admin accounts choose once before tenant-scoped work.
- Composite PostgreSQL foreign keys bind request owners and assigned workshops to the request tenant.
- The configured administrator is global and may correct a non-admin tenant only before service-request history exists.

Tests added or updated:
- backend/tests/test_tenancy.py plus migration, model, API, seed, and admin fixtures
- frontend/src/App.test.tsx tenant-selection coverage

Verification commands and results:
- backend: .venv\Scripts\python.exe -m pytest -q — pass (42 tests)
- frontend: npm run generate:api, npm run type-check, npm test, npm run lint, npm run build — pass (13 frontend tests)

Known limitations or follow-up:
- Tenant-tagged Pub/Sub event contracts and worker processing begin in Phase 7.
```

Copy this block below the completed phase:

```text
Completed on:
Status:

Files changed:
-

Decisions:
-

Tests added or updated:
-

Verification commands and results:
-

Known limitations or follow-up:
-
```
