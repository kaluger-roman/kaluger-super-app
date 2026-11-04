---
name: test-backend
description: "Write or repair Super App Jest and Supertest backend tests against the isolated PostgreSQL test database."
---

# Backend tests

Read ALL conventions in `docs/conventions/backend-testing.md`, the target code and nearby test helpers.
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

Task setup and completion follow `AGENTS.md` and `docs/codex-workflow.md`; when
executing as a worker, the orchestrator owns publication. If delegated, inherit the
configured Codex model with maximum supported reasoning and keep the assigned file
boundaries from `docs/subagents.md`.
