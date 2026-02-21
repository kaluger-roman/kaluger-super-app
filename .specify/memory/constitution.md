<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0 (initial ratification)
- Added principles: I–VII (all new)
- Added sections: Technology Stack, Development Workflow
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check section aligns)
  - .specify/templates/spec-template.md ✅ compatible (user stories + requirements align)
  - .specify/templates/tasks-template.md ✅ compatible (phase structure aligns)
- Follow-up TODOs: none
-->

# Kaluger Super App Constitution

## Core Principles

### I. Feature-Sliced Design (Frontend)

Frontend MUST follow Feature-Sliced Design architecture with strict
unidirectional imports: `pages` → `features` → `entities` → `shared`.

- Every layer has clear responsibility: pages compose features, features
  implement use cases, entities hold domain models, shared provides
  infrastructure
- Cross-layer imports use path aliases (`@app`, `@pages`, `@features`,
  `@entities`, `@shared`, `@components`, `@widgets`)
- Deep imports are forbidden — every folder exposes public API via `index.ts`
- Circular dependencies MUST NOT exist (enforced by `madge`)

### II. Layered MVC (Backend)

Backend MUST follow layered architecture:
`Routes → Controllers → Services → Prisma → Database`.

- Controllers handle HTTP concerns and validation only
- Services contain all business logic
- Utils are pure functions with no side effects or state
- Each layer has a single responsibility and MUST NOT leak into adjacent layers

### III. Effector State Management

All frontend state MUST be managed by Effector following strict conventions.

- Naming: `$store`, `eventName`, `effectNameFx`, `FeatureGate`
- Only `sample` for reactive connections — no `.on()`, `.watch()`,
  `forward()`, `guard()`
- Only `useUnit` for React bindings — no `useStore`, no `getState()`
- `fn` in `sample` MUST be pure — no API calls, mutations, or side effects
- Form state in Effector stores, not React `useState`
- Models exported and imported as namespaces

### IV. Type Safety

TypeScript MUST be used with maximum strictness across the entire codebase.

- `type` keyword only — no `interface`
- `import type` for type-only imports
- `any` is forbidden — use `unknown`
- Backend types centralized in `src/types/index.ts`
- Frontend types in `*.types.ts` files per feature
- Prisma-generated types preferred over manual duplicates

### V. Code Consistency

All code MUST follow uniform style rules enforced by ESLint and Prettier.

- Named exports only — no `export default`
- Function expressions only — `const fn = () => {}`, not `function fn() {}`
- Every folder has `index.ts` re-exporting public API
- Components under 150 lines, models under 200 lines, controllers under
  150 lines — split if larger
- No inline styles — no `style={{}}`, no `sx={{}}`
- Error messages and UI text in Russian

### VI. Testing Discipline

Tests MUST cover business logic and user-facing behavior.

- Frontend: Vitest + React Testing Library + MSW; test user behavior,
  not implementation
- Backend: Jest + Supertest + real test database; do NOT mock Prisma
- Effector stores tested in isolation with `fork`
- Tests MUST be independent — no shared mutable state
- Descriptive test names: `"should [behavior] when [condition]"`
- Zero ESLint and TypeScript errors before completion

### VII. Simplicity

Code MUST be as simple as possible for the current requirements.

- No premature abstractions — extract only when reused 2+ times
- Minimal comments — only for non-obvious logic
- No over-engineering: feature flags, backwards-compatibility shims, or
  speculative future-proofing are forbidden unless explicitly requested
- YAGNI: three similar lines of code are better than a premature utility

## Technology Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Frontend  | React, TypeScript, Effector, Material UI, Craco     |
| Backend   | Express, TypeScript, Prisma, PostgreSQL              |
| Real-time | WebSocket                                            |
| Testing   | Vitest + RTL + MSW (frontend), Jest + Supertest (backend) |
| E2E       | Playwright                                           |
| Linting   | ESLint + Prettier                                    |
| DB        | PostgreSQL, Prisma ORM, Prisma Migrate               |
| Auth      | JWT Bearer tokens                                    |

Stack changes MUST be justified and approved before adoption. No new
runtime dependencies without clear necessity.

## Development Workflow

### Convention Files

Before writing or modifying code, the relevant convention file MUST be read:

- Frontend code → `docs/conventions/frontend.md`
- Backend code → `docs/conventions/backend.md`
- Frontend tests → `docs/conventions/frontend-testing.md`
- Backend tests → `docs/conventions/backend-testing.md`

### Quality Gates

Every change MUST pass before completion:

1. `npm run lint` — zero ESLint errors
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm test` — all tests pass
4. `npm run find-cycle` — no circular dependencies (frontend)

### Monorepo Structure

```
kaluger-super-app/
├─ frontend/     # React SPA (Feature-Sliced Design)
├─ backend/      # Express API (Layered MVC)
└─ docs/         # Convention files
```

Frontend and backend are independent packages with separate `package.json`
and independent test suites. Commands run from their respective directories.

## Governance

This constitution defines non-negotiable principles for the Kaluger Super App
codebase. All code changes — whether manual or AI-generated — MUST comply.

- Amendments require updating this file and incrementing the version
- MAJOR version: principle removed or redefined in backward-incompatible way
- MINOR version: new principle added or existing materially expanded
- PATCH version: clarifications, wording, typo fixes
- The `CLAUDE.md` file and `docs/conventions/*.md` files are the runtime
  implementation of these principles and MUST stay in sync

**Version**: 1.0.0 | **Ratified**: 2026-02-20 | **Last Amended**: 2026-02-20
