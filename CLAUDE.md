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
npm run format:check     # Prettier check
npm run test:e2e         # Playwright E2E
npm run find-cycle       # Circular dependency check (madge)
```

### Backend (run from `backend/`)

```bash
npm run dev              # Dev server (nodemon)
npm run build            # TypeScript compile
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

Do NOT skip this step. These files contain critical project-specific patterns (Effector, FSD, Prisma, styled-components) that are not covered in this summary.

## MANDATORY: Verify Before Committing

Before committing code, you MUST verify:

1. **Tests pass** — `npm test` in the relevant directory (frontend/backend)
2. **ESLint clean** — `npm run lint` in `frontend/`
3. **TypeScript clean** — `npm run build` in `backend/`
4. **Conventions compliance** — re-read the relevant convention file (`docs/conventions/frontend.md` or `docs/conventions/backend.md`) and manually verify that ALL new/modified code follows every rule.

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

## Changelog

Before creating a PR (via `/commit-commands:commit-push-pr` or `gh pr create`), always run `/changelog` to update CHANGELOG.md with the changes from the current branch. This ensures the changelog stays in sync with releases. After `/changelog`, run `/news` to generate a user-friendly news entry from the changelog and insert it into the database.

## Slash Commands

- `/project:frontend <task>` — write frontend code with conventions
- `/project:backend <task>` — write backend code with conventions
- `/project:test-frontend <task>` — write frontend tests
- `/project:test-backend <task>` — write backend tests
- `/changelog [version]` — generate/update CHANGELOG.md from git history

## Active Technologies
- TypeScript 5.x (strict) — фронт и бек (027-tax-rate-periods)

- TypeScript 5.x (frontend + backend) + React, Effector, MUI (frontend); Express, Prisma, web-push (backend) (008-pwa-lesson-reminders)
- PostgreSQL через Prisma ORM — три новые таблицы: `push_subscriptions`, `reminder_settings`, `scheduled_reminders` (008-pwa-lesson-reminders)

## Recent Changes

- 008-pwa-lesson-reminders: Added TypeScript 5.x (frontend + backend) + React, Effector, MUI (frontend); Express, Prisma, web-push (backend)
