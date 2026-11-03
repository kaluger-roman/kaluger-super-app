---
name: test-backend
description: "Write or repair Super App Jest and Supertest backend tests against the isolated PostgreSQL test database."
---

# Backend tests

Read `docs/conventions/backend-testing.md`, the target code and nearby test helpers.
Use real Prisma/Postgres and test fixtures; mock external services and time only
where appropriate. Cover tenant isolation, roles, invalid inputs, transactions and
concurrency when relevant. Use unique data and the established cleanup helpers.

Run from repo root:

```bash
bash scripts/dev-stack.sh test-backend --testPathPatterns=<area> --runInBand
```

The wrapper prepares the checkout's test database and overrides `.env.test` with
TEST_DATABASE_URL. Never run cleanup against dev/production data. Add a regression
that distinguishes the broken and corrected behavior. Verify affected lint/types,
then report scope/results. Do not bypass test failures or weaken authorization checks.
