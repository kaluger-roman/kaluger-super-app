# Backend

Read `../docs/conventions/backend.md` before app changes and
`../docs/conventions/backend-testing.md` before tests.

Routes → controllers (HTTP/validation) → services (business rules) → Prisma.
Preserve tenant ownership checks and separate tutor/student/admin authentication.
Use Prisma types and the shared Prisma client; no ad-hoc clients in request handlers.
Use migrations for schema changes; never reset another checkout's database.

Tests use a real isolated PostgreSQL database (do not mock Prisma): run
`bash scripts/dev-stack.sh test-backend` from the repository root. Do not run Jest
against the dev DB. The wrapper sets TEST_DATABASE_URL so `.env.test` cannot redirect it.
From this package: `npm run build`, `npm run lint`, `npm run format:check`.
After schema changes: `npm run db:generate`; `dev-stack.sh migrate` applies committed
migrations to this checkout only. Each worktree owns its node_modules/Prisma client.
