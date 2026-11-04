# Working on Kaluger Super App

Tutor management app for the Russian market: React SPA (`frontend/`), Express API
(`backend/`), and Next.js static landing (`landing/`). Each has its own npm lockfile;
the root package provides development tooling, not npm workspaces.

## Start here

- Respond in Russian. Code comments and engineering conventions are English; UI
  and error messages are Russian. Match the language of existing specs.
- Inspect `git status`, the current checkout and relevant code before editing.
  Preserve unrelated changes. Development runs locally on this Mac. Never use
  SSH/sshfs to `home` for coding, builds of dev branches or tests; it is production.
- Read the applicable nested `AGENTS.md` and convention files before code changes:
  frontend → `docs/conventions/frontend.md`, backend → `docs/conventions/backend.md`,
  tests → the corresponding `*-testing.md`, E2E → `docs/conventions/e2e-testing.md`.
- Read only relevant specs and docs. `docs/README.md` is the map;
  `docs/codex-workflow.md` describes feature, fix, review and QA workflows.
- Reusable procedures live in `.agents/skills/<name>/SKILL.md`; see `docs/skills.md`
  for the catalog. Load only the skill relevant to the request. Use `create-issue`
  for filing, `score-issues` for priority, `changelog` and `news` for release artifacts;
  `auto-feature`, `auto-bug-fix`, review/QA and `speckit-*` cover longer workflows.
- Legacy textual `/name`, `/project:name` and `/speckit.name` invocations map to
  the corresponding `$name` / `$speckit-name`; preserve their documented arguments.
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
  iterating, then all affected checks before delivery. For changed frontend/backend
  app code run `npm run check -- --full` before committing; report anything not run.
- Never claim a test, browser flow or deployment passed without observing it.
- Do not bypass hooks or weaken tests to make a check green. Root `npm ci` installs
  the worktree-aware pre-commit hook; do not edit global Git configuration.
- Keep plans proportional: small fixes need no spec pipeline. For substantial work,
  maintain `specs/<id>-<name>/{spec,plan,tasks}.md`. The auto-* skills also maintain
  their full JSON state in ignored `.codex/workflow/`; preserve the original resume,
  checkpoint and round-context contracts. Read linked skill procedures in full.
  Generated technology context belongs only in the generator's managed block here.
- Review the final diff for correctness, authorization boundaries, regressions,
  migration compatibility, tests and consistency with the conventions.
- Preserve subagent workflows; read `docs/subagents.md` for dispatch and role maps.
  `code-review-local` uses nine independent reviewer roles plus independent scoring;
  hunts, bulk issue scoring, auto-feature/auto-bug-fix and planning research delegate
  their defined stages. Run independent tasks concurrently up to the runtime limit,
  queue the remainder, and report unavailable coverage. Use maximum supported
  reasoning effort for analysis/coding/review; inherit the configured Codex model.

## Git and external actions

- Use `codex/<short-task>` branches. Reuse an assigned Codex worktree/task branch;
  branch detached HEAD before publishing. A new task starting on main gets an
  isolated local worktree under ignored `.worktrees/`; never nest another worktree.
- Preserve the user's restored task workflow: open a draft PR at branch/task start
  with `node scripts/start-task-pr.mjs --title ...` (and `--closes N` for a fully
  resolved issue). It may create the original empty start commit when necessary.
  Read-only/draft/report tasks do not publish. Explicit delivery restrictions win.
- Once task-branch work is verified, update changelog, commit, push, wait for CI and
  fix failures without another permission question. No commits between review/QA
  rounds. Use the guarded PR command from `docs/codex-workflow.md` for create/ready;
  never bypass the changelog gate or hook trust. Do not push to main, force-push,
  mark ready, merge, publish news or deploy without an explicit user instruction.
- Preserve the finding workflow: confirmed unrelated problems get deduplicated,
  Russian GitHub issues through `create-issue`, scored by `score-issues`; do not
  widen the current fix. Existing issues are reused. Draft/report/read-only modes
  stay local. Sending messages or comments requires explicit authorization; do not
  infer it from a historical report. Report issue links and scores in the final reply.
- For a requested PR, use a concrete description of the final behavior, checks and
  limitations; `Closes #N` only when fully resolved. Keep secrets and local paths out.
- Update `CHANGELOG.md` for meaningful completed changes. User-facing news JSON is
  for product changes only; local tooling/docs changes need no news or DB writes.
- Auto-feature stops for approval after spec and mockups; auto-bug-fix stops after
  diagnosis. These are the user's workflow checkpoints, not optional defaults.
  Already recorded approvals remain valid unless the reviewed artifact changes.

## Infrastructure boundary (2026-11-04)

Development runs on this Mac: checkout, worktrees, Docker, servers and browsers.
The former VPS is unavailable. `home` is the production recovery host, restored
from offsite backups, with private LAN/Tailscale access only. See
`docs/ops/home-production.md`. Production operations (SSH, restore, deployment)
require an explicit operational request; the owner authorized the initial migration
on 2026-11-04. Routine development never connects to or changes production.
The existing deploy workflow and older ops runbooks describe the lost VPS, not
this Docker stack. Public DNS, TURN and offsite migration are separate stages.
Never use real production data for tests or delete recovery copies in dev cleanup.
