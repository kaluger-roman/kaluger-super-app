---
name: backend
description: "Implement Super App Express API, services, Prisma migrations and backend logic using the project layers and authorization conventions."
---

# Backend implementation

Read `backend/AGENTS.md`, `docs/conventions/backend.md`, and the relevant spec/API
contracts. Read `docs/conventions/backend-testing.md` when changing tests.
Keep HTTP validation in controllers, business rules in services, and persistence in
Prisma; use the shared client, existing types and Russian errors. Check tutor/student/
admin identity and tenant ownership at the actual operation boundary.

For data changes add compatible Prisma migrations; assess existing rows, financial
precision, timezone behavior, transaction/race handling and WebSocket side effects.
Generate this checkout's Prisma client. Never migrate/reset a shared/prod DB.
Run backend tests through `bash scripts/dev-stack.sh test-backend`; use real isolated
Postgres rather than mocked Prisma. Run affected checks with `npm run check` and
report migrations/tests performed, contract changes and unresolved risks.
