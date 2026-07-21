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
- [ ] Application implementation started.

Overall phase: **planning complete; Phase 1 pending approval**.

---

## Phase 1 — Connected project skeleton

References: Spec §§12–14 and §16.

- [ ] Create the required `frontend/`, `backend/`, and `worker/` structure.
- [ ] Bootstrap React + TypeScript + Vite with strict typing and test tooling.
- [ ] Bootstrap typed FastAPI with configuration, CORS, logging, tests, and OpenAPI.
- [ ] Add PostgreSQL to Docker Compose and implement SQLAlchemy session management.
- [ ] Implement and test `GET /api/health`.
- [ ] Add `.gitignore` and a complete non-sensitive `.env.example`.
- [ ] Document prerequisites, setup, startup, checks, ports, and architecture.

Exit gate:

- [ ] Frontend runs, tests, type-checks, and builds.
- [ ] Backend runs, tests, type-checks, connects to PostgreSQL, and exposes `/docs`.
- [ ] PostgreSQL reports healthy.
- [ ] Phase close-out is recorded.

---

## Phase 2 — Database and migrations

References: Spec §§9–10.

- [ ] Implement all enums and SQLAlchemy models from the data contract.
- [ ] Implement relationships, constraints, defaults, indexes, and UTC timestamps.
- [ ] Configure Alembic from application metadata.
- [ ] Create and review the initial migration.
- [ ] Create the owner, operator, and workshop seed workflow.
- [ ] Add model, constraint, migration, and seed tests.
- [ ] Document migration, rollback, seed, and Firebase UID mapping commands.

Exit gate:

- [ ] A clean database can migrate, seed, downgrade, and re-upgrade reproducibly.
- [ ] Database schema and seed data match Spec §§9–10.
- [ ] Phase close-out is recorded.

---

## Phase 3 — HTTP/PostgreSQL API

References: Spec §§7–8, §15, §16, and backend cases in §17.

- [ ] Define typed Pydantic requests, responses, and consistent API errors.
- [ ] Add replaceable identity and event-publisher dependency boundaries.
- [ ] Implement `/api/me`.
- [ ] Implement owner request creation and owner-only listing.
- [ ] Implement operator request listing and active-workshop listing.
- [ ] Implement workshop assignment with validation, transaction handling, and post-commit publisher invocation.
- [ ] Define and document repeated-assignment behavior.
- [ ] Document bearer authentication and all contracts in OpenAPI.
- [ ] Add backend tests for success, ownership, roles, validation, not-found cases, transactions, and publisher ordering.

Exit gate:

- [ ] API contracts are correct and visible in Swagger.
- [ ] Complete HTTP/PostgreSQL behavior passes through test dependency overrides.
- [ ] Owner isolation and operator authorization are enforced in FastAPI.
- [ ] Phase close-out is recorded.

---

## Phase 4 — Functional frontend

References: Spec §§4–5, frontend responsibilities in §6, and frontend cases in §17.

- [ ] Implement the typed HTTP client and readable API error handling.
- [ ] Implement `/login`, `/requests`, `/requests/new`, and `/operator`.
- [ ] Implement session and role route guards behind a replaceable auth boundary.
- [ ] Implement all required owner and operator actions.
- [ ] Implement loading, empty, error, success, and duplicate-submit states.
- [ ] Add frontend tests for rendering, redirects, forms, lists, assignment, and UI states.

Exit gate:

- [ ] All required screens work against the stable local API contract.
- [ ] Frontend tests, lint, type-check, and production build pass.
- [ ] Phase close-out is recorded.

---

## Phase 5 — Firebase authentication and authorization

References: Spec §§5–7, configuration in §14, auth errors in §15, and auth cases in §17.

- [ ] Create/configure Firebase, the web app, Google Sign-In, and authorized domains.
- [ ] Configure local backend credentials without tracking secrets.
- [ ] Implement React Firebase initialization, auth state, Google login, ID tokens, and logout.
- [ ] Resolve `/api/me` after login and redirect by database role.
- [ ] Implement Firebase Admin token verification in FastAPI.
- [ ] Resolve the Firebase UID to the PostgreSQL user and enforce reusable role dependencies.
- [ ] Add backend and frontend authentication/authorization tests.
- [ ] Seed real test UIDs and verify protected endpoints through Swagger.
- [ ] Verify owner and operator flows end to end through the frontend.

Exit gate:

- [ ] Firebase establishes identity and PostgreSQL exclusively establishes application role.
- [ ] Invalid authentication returns `401`; invalid role returns `403`.
- [ ] The complete authenticated HTTP/PostgreSQL flow works before Pub/Sub begins.
- [ ] Phase close-out is recorded.

---

## Phase 6 — Pub/Sub and worker

References: Spec §11, worker configuration in §14, related errors in §15, and worker cases in §17.

- [ ] Provision/document the topic, subscription, and least-privilege permissions.
- [ ] Implement the typed `service_request.assigned` event contract.
- [ ] Implement backend publication after assignment commit.
- [ ] Define and document commit-then-publish failure behavior.
- [ ] Implement the independent worker, validation, notification output, logging, and shutdown.
- [ ] Acknowledge only successfully processed messages.
- [ ] Add publisher and worker tests with mocked cloud clients.
- [ ] Verify assignment, publication, consumption, output, and acknowledgment end to end.

Exit gate:

- [ ] The separate worker processes the specified event successfully.
- [ ] Publish failures and worker failures behave as documented.
- [ ] Phase close-out is recorded.

---

## Phase 7 — Hardening and project close

References: Spec §§15–17, acceptance criteria in §19, and technical objectives in §20.

- [ ] Verify every required API and UI error path.
- [ ] Verify ownership, role enforcement, CORS, secret handling, and fail-closed configuration.
- [ ] Run formatter, lint, type-check, tests, builds, migration checks, and optional CI.
- [ ] Complete README setup, architecture, configuration, Swagger, cloud, testing, and demo documentation.
- [ ] Run the full clean-environment owner/operator demonstration.
- [ ] Resolve or document all remaining limitations.

Acceptance:

- [ ] AC-01 through AC-05: owner login, validation, creation, persistence, and pending view.
- [ ] AC-06 through AC-12: operator login, role, listings, assignment, and persistence.
- [ ] AC-13 through AC-16: publication, worker processing, notification, and acknowledgment.
- [ ] AC-17 through AC-20: owner refresh, workshop visibility, role denial, and `401`.

Exit gate:

- [ ] Every acceptance criterion in Spec §19 passes.
- [ ] Every mandatory technical objective in Spec §20 is represented and verified.
- [ ] Setup and demonstration are reproducible from current documentation.
- [ ] Final phase close-out is recorded.

---

## Phase close-out record

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
