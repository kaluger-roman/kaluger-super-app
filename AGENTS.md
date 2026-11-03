# Working on Kaluger Super App

Tutor management app for the Russian market: React SPA (`frontend/`), Express API
(`backend/`), and Next.js static landing (`landing/`). Each has its own npm lockfile;
the root package provides development tooling, not npm workspaces.

## Start here

- Respond in Russian. Code comments and engineering conventions are English; UI
  and error messages are Russian. Match the language of existing specs.
- Inspect `git status`, the current checkout and relevant code before editing.
  Preserve unrelated changes. Work locally on this Mac; no SSH or sshfs to `home`.
- Read the applicable nested `AGENTS.md` and convention files before code changes:
  frontend → `docs/conventions/frontend.md`, backend → `docs/conventions/backend.md`,
  tests → the corresponding `*-testing.md`, E2E → `docs/conventions/e2e-testing.md`.
- Read only relevant specs and docs. `docs/README.md` is the map;
  `docs/codex-workflow.md` describes feature, fix, review and QA workflows.
- Reusable procedures live in `.agents/skills/<name>/SKILL.md`; see `docs/skills.md`
  for the catalog. Load only the skill relevant to the request. Use `create-issue`
  for filing, `score-issues` for priority, `changelog` and `news` for release artifacts;
  `auto-feature`, `auto-bug-fix`, review/QA and `speckit-*` cover longer workflows.
- Existing `specs/` and dated reports are historical requirements/evidence, not
  current infrastructure instructions. Actual code/config and current user intent
  take precedence over stale examples in them.

## Environment and commands

- Setup: `bash scripts/setup-local.sh` (Node from `.nvmrc`, npm, local dependencies).
- Start Docker Desktop, then `bash scripts/dev-stack.sh up`.
- Separate terminals: `bash scripts/dev-stack.sh run-backend` and
  `bash scripts/dev-stack.sh run-frontend`. Get URLs with `... ports`.
- Every checkout, including main and detached Codex worktrees, has isolated Docker
  databases and ports. Keep dependencies/Prisma clients local to each worktree;
  do not symlink `node_modules`. See `docs/dev-stack.md`.
- Backend tests: `bash scripts/dev-stack.sh test-backend [jest args]`.
  Frontend tests: `npm --prefix frontend test -- [path]`.
- `npm run check` runs changed frontend/backend checks concurrently;
  `npm run check -- --full` runs their full suites. It does **not** check scripts,
  landing, or execute Playwright; run their checks separately when affected.
- Scripts/tooling: `npm run test:scripts`. Landing: lint, test and build in `landing/`.
- E2E: start `run-backend-e2e` instead of the dev backend, then
  `bash scripts/dev-stack.sh e2e --grep-invert '@draft|@visual'`.
- Manual production-build QA: `bash scripts/qa-stack.sh up`; use its returned URL
  and disposable credentials. See `docs/qa-docker.md`.

## Implementation and verification

- Follow the existing architecture; avoid new dependencies/abstractions unless needed.
- App code: named exports, arrow functions, `type`/`import type`, no `any`, public
  barrel imports. Next.js route/config conventions have their required exceptions.
- Add regression tests for bug fixes and behavior tests for new logic. Documentation
  edits do not need artificial tests. Verify the smallest meaningful scope while
  iterating, then all affected checks before delivery; report anything not run.
- Never claim a test, browser flow or deployment passed without observing it.
- Do not bypass hooks or weaken tests to make a check green. Root `npm ci` installs
  the worktree-aware pre-commit hook; do not edit global Git configuration.
- Keep plans proportional: small fixes need no spec pipeline. For substantial work,
  maintain the relevant `specs/<id>-<name>/{spec,plan,tasks}.md` with decisions and
  verification so another chat can continue. Do not append generated histories here.
- Review the final diff for correctness, authorization boundaries, regressions,
  migration compatibility, tests and consistency with the conventions.
- Preserve subagent workflows; read `docs/subagents.md` for dispatch and role maps.
  `code-review-local` uses nine independent reviewer roles plus independent scoring;
  hunts, bulk issue scoring, auto-feature/auto-bug-fix and planning research delegate
  their defined stages. Run independent tasks concurrently up to the runtime limit,
  queue the remainder, and report unavailable coverage. Use maximum supported
  reasoning effort for analysis/coding/review; inherit the configured Codex model.

## Git and external actions

- Use `codex/<short-task>` branches. A Codex-managed detached worktree is valid;
  create a branch before publishing. Use the current worktree; never nest another
  worktree automatically. Manual worktrees belong in ignored `.worktrees/`.
- Local edits and verification need no repeated approval. Follow the user's requested
  delivery scope for commits/pushes/PRs; no empty start commits or mandatory draft
  PR at task start. Use `gh` directly when publication is requested.
- Never force-push, merge, deploy, send messages, or create/comment on issues solely
  because an old report or workflow says to. Report unrelated findings locally;
  create GitHub issues when requested (including an explicitly invoked issue-filing
  skill), deduplicate and use `docs/issue-priority.md`. Draft/report modes stay local.
- For a requested PR, use a concrete description of the final behavior, checks and
  limitations; `Closes #N` only when fully resolved. Keep secrets and local paths out.
- Update `CHANGELOG.md` for meaningful completed changes. User-facing news JSON is
  for product changes only; local tooling/docs changes need no news or DB writes.

## Infrastructure boundary (2026-11-03)

Development runs on this Mac: checkout, worktrees, Docker, servers and browsers.
The former VPS is unavailable. `home` is the former dev machine, holds backups,
and is only a **future** production candidate. Do not connect to it, restore/copy
backups, modify deployment, or describe it as live production for routine dev tasks.
`docs/ops/` and the existing deploy workflow describe the previous deployment.
Production migration is a separate task. Never use real production data for tests.
