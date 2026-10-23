# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tutor management app (private tutoring for Math/Physics, Russian market). Monorepo with separate frontend and backend. UI text and error messages are in Russian.

## Commands

### Frontend (run from `frontend/`)

```bash
npm start                # Dev server (craco)
npm run build            # Production build
npm test                 # All tests (vitest)
npm run test -- path     # Single test file
npm run lint             # ESLint
npm run lint:fix         # ESLint autofix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run test:e2e         # Playwright E2E
npm run find-cycle       # Circular dependency check (madge)
```

### Backend (run from `backend/`)

```bash
npm run dev              # Dev server (nodemon)
npm run build            # TypeScript compile
npm run lint             # ESLint (flat config)
npm run lint:fix         # ESLint autofix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm test                 # All tests (jest)
npm test -- --testPathPattern=path  # Single test file
npm run db:migrate       # Prisma migrate dev
npm run db:generate      # Prisma generate client
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Seed database
npm run db:migrate:test  # Migrate test database (.env.test)
npm run news:generate    # Save news entry as JSON file (--title, --content, --version)
npm run news:sync        # Sync news JSON files to database (runs on deploy)
```

### Repo root

```bash
npm install              # lint-staged + enables the pre-commit hook for the main checkout and all worktrees
npm run check            # tsc, eslint, prettier and related tests of the touched parts, in parallel
npm run check -- --full  # the same with the full test suites (once before a commit)
node --test scripts/__tests__/  # Tests for scripts/ and .githooks/
```

## Architecture

### Frontend — Feature-Sliced Design (React + TypeScript + Effector + MUI)

```
frontend/src/
├─ app/        # Root, routing, providers, global state (init, WebSocket)
├─ pages/      # Route components (dashboard, lessons, students, profile, reports)
├─ features/   # Use-case modules (auth, emailVerification, lessons, students)
├─ entities/   # Domain models (user, lesson, student, verification)
├─ shared/     # API client (axios), UI kit, hooks, utils, types, constants
├─ widgets/    # Complex composites (sidebar)
└─ components/ # Generic UI components
```

Import direction (strict): `pages` -> `features` -> `entities` -> `shared` (only downward).

Path aliases: `@app`, `@pages`, `@features`, `@entities`, `@shared`, `@components`, `@widgets`.

State: Effector (`$store`, `eventName`, `effectNameFx`, `NameGate`). Only `sample`, `useUnit`. Models as namespaces.

### Backend — Layered MVC (Express + TypeScript + Prisma + PostgreSQL)

```
backend/src/
├─ routes/       # Route definitions
├─ controllers/  # Request handlers + validation
├─ services/     # Business logic
├─ middleware/    # Auth (JWT Bearer), error handling
├─ lib/          # Prisma client singleton, WebSocket manager
├─ utils/        # Pure helper functions
└─ types/        # Centralized type definitions
```

Flow: Routes -> Controllers -> Services -> Prisma -> PostgreSQL

Real-time: WebSocket manager for live updates. Cron: recurring lessons (daily 2 AM), lesson status (every minute).

## Shared Code Conventions

- Named exports only, no `export default`
- Function expressions: `const fn = () => {}`, not `function fn() {}`
- `type`, not `interface`; `import type` for type-only imports
- No `any` — use `unknown`
- Every folder has `index.ts` re-exporting public API; no deep imports
- Error messages in Russian

## MANDATORY: Read Conventions Before Writing Code

Before writing or modifying code, you MUST read the relevant convention file:

- **Frontend code** → read `docs/conventions/frontend.md`
- **Backend code** → read `docs/conventions/backend.md`
- **Frontend tests** → read `docs/conventions/frontend-testing.md`
- **Backend tests** → read `docs/conventions/backend-testing.md`
- **E2E tests** → read `docs/conventions/e2e-testing.md`

Do NOT skip this step. These files contain critical project-specific patterns (Effector, FSD, Prisma, styled-components) that are not covered in this summary.

## MANDATORY: Verify Before Committing

Before committing code, you MUST verify:

1. **Tests pass** — `npm test` in the relevant directory (frontend/backend)
2. **ESLint clean** — `npm run lint` in `frontend/` and `backend/`
3. **TypeScript clean** — `npm run build` in `backend/`
4. **Conventions compliance** — re-read the relevant convention file (`docs/conventions/frontend.md` or `docs/conventions/backend.md`) and manually verify that ALL new/modified code follows every rule.

Run items 1–3 with `npm run check` from the repo root (`scripts/check.mjs`): it starts TypeScript, ESLint, Prettier and tests of every part the branch touches at the same time, each into its own log, and prints a summary — never run them one after another. While iterating it runs only the tests related to the changed files (`vitest related`, `jest --findRelatedTests`); run `npm run check -- --full` once before the commit (CI runs the full suites anyway). ESLint and Prettier keep a cache in `node_modules/.cache`, so a rerun takes seconds. Backend tests go through `scripts/dev-stack.sh test-backend` on a feature branch (`--backend-tests npm` to use `npm test`).

The pre-commit hook (`.githooks/pre-commit`) runs `prettier --write`, `eslint --fix` and `prettier --write` again on staged `frontend/src`, `frontend/e2e`, `frontend/playwright.config.ts` and `backend/src` files and re-stages the result; CI also runs `npm run format:check`. The hook sees only staged files, so the checks above still apply. It runs lint-staged with `--no-stash` because the stash stack is shared by all worktrees, so the "Skipping backup because `--no-stash` was used. This might result in data loss." warning is expected; if any file is partially staged, the hook keeps lint-staged's backup stash instead, since a failed `--no-stash` run would not restore the unstaged hunks. It needs `frontend/node_modules` / `backend/node_modules` — in a fresh worktree, symlink them from the main checkout. It also stops the commit when a staged package's installed Prettier differs from its `package-lock.json` (typically a main checkout pulled without `npm install`); run `npm install` in the directory the hint names. If it fails, fix the cause; do not commit with `--no-verify` unless the user asks.

## Testing Requirements

- **All new code must have full test coverage.** Every new feature, module, utility, or component must be accompanied by corresponding tests.
- **Bug fixes**: always add a regression test covering the specific scenario being fixed.
- **Frontend**: unit tests for Effector models (stores, effects, events), utility functions, and hooks. Component tests for non-trivial UI logic.
- **Backend**: unit tests for services and utility functions. Integration tests for controllers/routes.
- Do NOT skip tests or defer them to a later PR. Tests are part of the definition of done.

## Language

- CLAUDE.md, convention docs, code comments — English
- Specs (`specs/`) — mixed Russian/English (match existing style)
- UI text, error messages — Russian
- Respond to the user in Russian

## MANDATORY: Draft PR at Task Start

Every task that gets its own branch or worktree opens a draft PR right away, before any real work, so the work and the Claude Code session behind it can always be found again:

```bash
node scripts/start-task-pr.mjs --title "<short task title>" [--summary "<1-3 sentences>"]
```

- Run it right after `EnterWorktree` / creating the branch. For `/speckit.specify` and `/auto-feature` — right after the `NNN-name` feature branch is created. No commits needed: if the branch has none on top of `main`, the script adds an empty start commit (same tree, index and working tree untouched), pushes over HTTPS and opens the draft.
- The PR body gets a "Сессии Claude Code" section: local session id, `cd <launch dir> && claude --resume <id>` (sessions are listed per launch directory, so a worktree session is invisible from the repo root), web link. Keep that section when rewriting the PR description at the end.
- Continuing a task in another session (or after a resume): run the script again — it comments the new session on the existing PR, or does nothing if the session is already recorded.
- Finishing: commit, push, `/changelog` + `/news`, rewrite title/body with `gh pr edit`, then `gh pr ready`. The PR already exists, so no `gh pr create` / `/commit-commands:commit-push-pr` for such a branch.
- Skip only for read-only tasks that create no branch.

## MANDATORY: File an Issue for Every Finding

Any problem noticed along the way — a bug, a needed improvement, an infrastructure error (CI, deploy, dev machine, hooks, scripts, flaky tests) or anything else that looks wrong — gets a GitHub issue right away, without asking. The user triages the issues and hands the ones worth doing to a separate session.

- Do not fix the finding in the current task and do not widen its scope; skip the issue only when the current task fixes it anyway.
- Search first (`gh issue list --search "<keywords>" --state all`); if a matching issue exists, add a comment instead of a duplicate.
- Body in Russian: what was seen, where (`file:line`, command, log excerpt), how to reproduce, suspected cause, possible fix, and the task/branch it was found in. Pass it with `--body-file`; label `bug`, `enhancement` or `documentation`.
- List the filed issues with links in the final reply.

## Changelog

Before creating a PR or marking a draft PR ready (`gh pr create`, `gh pr ready`, `/commit-commands:commit-push-pr`), always run `/changelog` to update CHANGELOG.md with the changes from the current branch. This ensures the changelog stays in sync with releases. After `/changelog`, run `/news` to generate a user-friendly news entry from the changelog and insert it into the database. A PreToolUse hook (`.claude/hooks/check-changelog-before-pr.sh`) denies `gh pr create` / `gh pr ready` until CHANGELOG.md is in the branch diff; the start-of-task draft PR from `scripts/start-task-pr.mjs` is not gated.

## Slash Commands

- `/project:frontend <task>` — write frontend code with conventions
- `/project:backend <task>` — write backend code with conventions
- `/project:test-frontend <task>` — write frontend tests
- `/project:test-backend <task>` — write backend tests
- `/changelog [version]` — generate/update CHANGELOG.md from git history
- `/e2e-check [base-ref]` — analyze diff vs base, flag user-facing changes without e2e and possibly broken tests; report in `docs/e2e-coverage/checks/`
- `/e2e-hunt [area]` — parallel inventory of user journeys vs existing e2e; prioritized coverage gaps in `docs/e2e-coverage/`

## Offsite Backups

Prod DB dumps are pulled hourly to the home dev machine into `/home/roman-kaluger/prod-backups/` (logs in `logs/`), with a daily restore check in a throwaway Postgres 16 container; status is shown in the admin «Бэкапы» tab. Setup, operation, restore and disabling: `docs/ops/offsite-backups.md`. Scripts: `scripts/offsite-backup/` (cron runs installed copies from `~/.local/share/offsite-backup/`, not the dev checkout).

## Active Technologies
- TypeScript 5.x (strict) — фронт и бек (027-tax-rate-periods)
- TypeScript 5.x (strict), Node.js 20 + React, Effector, MUI, Material UI styled-components (frontend); Express, Prisma, bcryptjs, express-rate-limit, Resend (backend) — все уже в проекте (028-forgot-password)
- PostgreSQL via Prisma ORM (новая таблица `password_reset_tokens`) (028-forgot-password)
- TypeScript 5.x (strict) — фронт и бек, Node.js 20 (029-student-cabinet)
- PostgreSQL через Prisma ORM. Две новые таблицы (`student_users`, `student_invitations`) + одно новое поле в `students` (`studentUserId`). (029-student-cabinet)
- TypeScript 5.x (strict), Node.js 20 + React, Effector, MUI, styled-components (frontend); (031-max-messenger-trial-lessons)
- PostgreSQL via Prisma ORM — расширение enum `ContactMethod`, (031-max-messenger-trial-lessons)
- TypeScript 5.x (strict), Node.js 20 + React, Effector, Material UI (styled-components API), (032-lesson-notes-in-card)
- N/A — без изменений БД: поле `notes` уже есть в модели урока (032-lesson-notes-in-card)
- PostgreSQL через Prisma. Одна новая колонка: (033-commission-tracking)
- TypeScript 5.x (strict), Node.js 20 + React, Effector, patronum, Material UI (styled API) — frontend; Express, Prisma — backend. Новых зависимостей нет (034-tax-exempt-lessons)
- PostgreSQL через Prisma. Одна новая колонка `lessons."isTaxExempt" BOOLEAN NOT NULL DEFAULT false` (034-tax-exempt-lessons)
- TypeScript 5.x (strict), Node.js 20 + React, Effector, patronum, effector-react, Material UI (styled API), axios — frontend; Express, Prisma — backend. Новых зависимостей нет (035-income-history)
- PostgreSQL через Prisma. Одна новая колонка `lessons."receivedAmount" DECIMAL(10,2) NULL` + бэкфилл в миграции; новых таблиц и индексов нет (035-income-history)
- TypeScript 5.x (strict), Node.js 20 + Frontend — React, Effector, Material UI, styled-components, browser WebRTC APIs (`RTCPeerConnection`, `navigator.mediaDevices.getUserMedia`/`getDisplayMedia`), patronum (timers). Backend — Express, Prisma, `ws` (existing WebSocketManager). **No new runtime npm dependencies** (WebRTC is a browser primitive; STUN/TURN are infra, configured via env). coturn is an **operational/infra** dependency, not an npm package. (030-webrtc-video-calls)
- PostgreSQL via Prisma ORM. One new table `call_records` (+ migration). Signaling messages are ephemeral (never persisted). (030-webrtc-video-calls)
- TypeScript 5.x strict (backend Node 20, frontend React); bash (home/prod scripts, cron-safe) + Express, Prisma, Effector, MUI (existing); rsync 3.2.x + `rrsync` (prod), OpenSSH, flock, gzip, Docker Engine + `postgres:16-alpine` (home). No new npm dependencies. (036-offsite-backups)
- PostgreSQL via Prisma — no schema change; new state in files: `$BACKUP_DIR/.offsite-last-pull`, `$BACKUP_DIR/.offsite-restore-check.json` (prod), `/home/roman-kaluger/prod-backups/` (home) (036-offsite-backups)

- TypeScript 5.x (frontend + backend) + React, Effector, MUI (frontend); Express, Prisma, web-push (backend) (008-pwa-lesson-reminders)
- PostgreSQL через Prisma ORM — три новые таблицы: `push_subscriptions`, `reminder_settings`, `scheduled_reminders` (008-pwa-lesson-reminders)

## Recent Changes

- 008-pwa-lesson-reminders: Added TypeScript 5.x (frontend + backend) + React, Effector, MUI (frontend); Express, Prisma, web-push (backend)
