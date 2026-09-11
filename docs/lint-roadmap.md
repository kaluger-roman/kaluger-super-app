# Lint Adoption Roadmap

Goal: move as many `CLAUDE.md` / `docs/conventions/*` rules as possible from "checked by review" to "caught by the linter, reliably".

We adopt **one rule at a time**: enable → measure violations → decide (fix-all-now vs. defer/warn) → land. PRs are split as the diff grows.

## Status legend

- `TODO` — not started
- `MEASURING` — rule enabled locally, counting violations
- `DECIDE` — measured, waiting on fix-all-vs-defer decision
- `WARN` — landed as `warn` (grandfathered), to be promoted to `error` later
- `DONE` — landed as `error`, violations fixed
- `SKIP` — decided not to lint

## Current state (baseline)

| Area | ESLint | In CI |
| --- | --- | --- |
| **frontend** | `.eslintrc.js` (legacy): `@typescript-eslint/recommended`, `import` (order + FSD `no-restricted-paths`), `unused-imports`, `testing-library`, `effector`, `no-explicit-any` | lint + `tsc --noEmit` |
| **backend** | `eslint.config.mjs` (flat): `eslint` + `typescript-eslint` recommended + Tier A rules (#12–17) | lint + `tsc` build |
| landing | flat config | lint + tsc + test |

Three biggest gaps driving this work:

1. ~~**Backend is not linted at all**~~ — closed by PR3 (`eslint.config.mjs` + `lint` script + CI step).
2. ~~**Effector rules are marked "ESLint enforced" but are not**~~ — closed by PR2 (`eslint-plugin-effector@0.16.0`).
3. **No pre-commit hook** — lint runs only in CI, so violations are caught late. "Catch reliably" needs `lint-staged` (Milestone 6).

---

## Milestone 0 — Infra (prerequisites)

| # | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| 0.1 | Scaffold ESLint (flat config + `typescript-eslint`) + `lint` script + CI step | backend | ✅ PR3 | eslint 9 + `typescript-eslint` 8 + `eslint-plugin-import`; non-type-aware (no `project`) so CI lint needs no `prisma generate` |
| 0.2 | Remove duplicate `plugins` key (`.eslintrc.js` lines 9–10) | frontend | ✅ PR1 | first line was dead |
| 0.3 | `husky` + `lint-staged` on commit | repo | TODO | do after core rules adopted |
| 0.4 | tsconfig: `noUnusedLocals`, `noImplicitReturns`, `noFallthroughCasesInSwitch` | both | TODO | compiler-level guarantees |

---

## Milestone 1 — Frontend Tier A (no new deps)

`import` + `typescript-eslint` are direct deps; `react` / `jsx-a11y` come transitively via `react-app`. No installs required.

Measured on `origin/main` baseline (eslint `--rule` dry-run over `src/**/*.{ts,tsx}`).

| # | Rule | Convention | Autofix | Status | Violations |
| --- | --- | --- | --- | --- | --- |
| 1 | `import/no-default-export` | Named exports only | no | ✅ PR1 | **0** |
| 2 | `func-style: ["error","expression"]` | Function expressions only | no | ✅ PR1 | **0** |
| 3 | `@typescript-eslint/consistent-type-definitions: ["error","type"]` | `type`, not `interface` | yes | ✅ PR1 | **0** |
| 4 | `@typescript-eslint/consistent-type-imports: [error,{disallowTypeAnnotations:false}]` | `import type` for types | yes | ✅ PR1 | **7** autofixed (24 were `import()` annotations in tests → allowed) |
| 5 | `no-restricted-syntax` → `TSEnumDeclaration` | String literals, not enums | no | ✅ PR1 | **0** |
| 6 | `react/forbid-component-props: { forbid: ["sx","style"] }` (+ `forbid-dom-props` style) | No inline styles | no | ✅ PR2 | **4** (4 files, all `sx`) — moved to styled components |
| 7 | `react/forbid-elements: { forbid: ["form"] }` | No `<form>` tags | no | ✅ PR1 | **0** |
| 8 | `jsx-a11y` recommended → `error` (alt-text, label-has-associated-control, no-static-element-interactions, …) | a11y section | no | DECIDE | **~18** msgs / ~9 spots / 4 files (sampled subset) |
| 9 | `max-lines` overrides (`*.tsx` 150, `*.model.ts` 200) | size limits | no | DECIDE | **9** `*.tsx` >150, **4** `*.model.ts` >200 |

**PR1 (branch `chore/lint-conventions`) — landed locally, verified (lint + tsc + 1716 tests):** #1, #2, #3, #4, #5, #7 + dedup `plugins` key (0.2). 8 files, +32/−11.

Notes:
- **#4** — default `disallowTypeAnnotations: true` rejects the `vi.importActual<typeof import("…")>()` mock pattern (24 tests, not autofixable). Set `false`: keeps `import type` for top-level, allows `import()` annotations. Real top-level fixes = 7 files.
- **#7** — dropped the `onSubmit` ban: `onSubmit` is a legit custom prop name in 38 spots and there are no `<form>` elements, so forbidding the `form` element already covers the convention.

**Still to do:** #8 (~9 spots, manual), #9 (refactor 9+4 files _or_ set threshold + grandfather).

---

## Milestone 2 — eslint-plugin-effector (new dep, frontend)

Fixes the false "ESLint enforced" claim in `frontend.md`.

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 10 | `effector/enforce-store-naming-convention`, `enforce-effect-naming-convention`, `enforce-gate-naming-convention` | `$store` / `eventFx` / `Gate` naming | ✅ PR2 | **0** |
| 11 | `effector/no-watch`, `no-getState`, `no-forward`, `no-guard`, `prefer-useUnit` | Forbidden Effector APIs | ✅ PR2 | **13** (`no-watch`, all in tests) — rewritten to `createWatch({ unit, fn, scope })` |

**PR2 (branch `chore/lint-effector`):** #6, #10, #11.

Notes:
- Pinned `eslint-plugin-effector@0.16.0` — 0.17+ requires `typescript >= 5`, frontend is on 4.9.5 (CRA). Revisit on TS upgrade.
- The plugin has no `no-useStore` rule; `prefer-useUnit` covers it (flags `useStore`/`useStoreMap`/`useEvent` from `effector-react`).
- `.on()` has no plugin rule — candidate for a Tier B `no-restricted-syntax` selector (Milestone 4).
- The `createWatch` rewrite also fixed a latent test smell: `unit.watch(fn)` watchers are not scope-bound and leaked between tests.

---

## Milestone 3 — Backend Tier A (after 0.1)

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 12 | `@typescript-eslint/no-explicit-any` | No `any` | ✅ PR3 | **125**: 6 in prod code (fixed), 119 in tests (rule `off` in `__tests__` — see notes) |
| 13 | `import/no-default-export` | Named exports only | ✅ PR3 | **1** (`lib/prisma.ts` default export) — converted to named, 99 importers updated |
| 14 | `func-style: ["error","expression"]` | Function expressions only | ✅ PR3 | **0** |
| 15 | `consistent-type-definitions` + `consistent-type-imports` | `type` / `import type` | ✅ PR3 | **0** + **46** (autofixed) |
| 16 | `no-restricted-syntax` → `TSEnumDeclaration` | String literals, not enums | ✅ PR3 | **0** |
| 17 | `max-lines` (`controllers/**` 150, tests excluded) | Controllers < 150 lines | ✅ PR3 | **5** (`auth.ts` 196, `lessons/createLesson.ts` 242, `lessons/getLessons.ts` 166, `lessons/updateLesson.ts` 335, `statistics/getStatistics.ts` 194) — business logic extracted into `services/{auth,lessonCreation,lessonsQuery,lessonUpdate,statistics}` |

**PR3 (branch `chore/lint-backend`): 0.1, #12–17.**

Notes:
- **#12** — tests keep `any` (`off` in `__tests__`): supertest's `res.body` and hand-rolled ws/jest mocks are typed `any` upstream; banning it would force churn without safety. Revisit if a typed supertest wrapper appears.
- **#13** — the one violation was `lib/prisma.ts` (`export default prisma`); converted to `export const prisma`, all 98 importers + 1 `jest.mock` factory updated mechanically.
- **#17** — `max-lines` counts only controllers, `__tests__` excluded (the convention limits controller size, not test size). The 5 oversized controllers were refactored rather than grandfathered: DB/transaction logic moved to new service folders (`services/auth`, `lessonCreation`, `lessonsQuery`, `lessonUpdate`, `statistics`, each split into `*.ts` / `*.helpers.ts` / `*.types.ts`), `validateUpdateData` moved to `controllers/lessons/updateLesson.validators.ts`, auth flow errors became `utils/errors.ts` classes (`UserAlreadyExistsError`, `InvalidCredentialsError`, `EmailNotVerifiedError`, `TaxPeriodsRequiredError`). Controllers are now 32–119 lines; pure helpers got unit tests, DB-bound services are covered by the existing controller integration tests plus `services/__tests__/auth.test.ts`.
- Bonus from `typescript-eslint` recommended: fixed 20 × `no-empty-object-type` (`Request<{}, {}, Dto>` → `Request<Record<string, never>, unknown, Dto>`), 16 × `no-unsafe-function-type` (`Function` → typed handler alias in ws tests), 13 × unused vars in tests, 3 × `@ts-ignore` (stale jest fake-timers workarounds — removed, typings are fine now).

---

## Milestone 4 — Tier B (custom `no-restricted-syntax`)

| # | Rule | Convention | Scope | Status | Violations |
| --- | --- | --- | --- | --- | --- |
| 18 | Ban `class X extends Error` outside `utils/errors.ts` | Centralize custom Error classes | backend | TODO | _TBD_ |
| 19 | Ban `useUnit([...])` (array destructuring) | `useUnit` separate calls for stores | frontend | TODO | _TBD_ |
| 20 | Ban `styled` import from `@mui/material` / `styled-components` | `styled` from `@shared` | frontend | TODO | _TBD_ |
| 21 | Ban `setTimeout`/`setInterval` in `*.model.ts` | Timers via patronum | frontend | TODO | _TBD_ |
| 22 | Ban named imports from `*.model` files | Import models as namespace | frontend | TODO | _TBD_ |
| 23 | Ban empty / stub `export {}` files | No empty files | both | TODO | _TBD_ |
| 24 | Ban `jest.mock("…prisma…")` | Do NOT mock Prisma | backend tests | TODO | _TBD_ |

---

## Milestone 5 — Naming & test plugins (new deps)

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 25 | `eslint-plugin-check-file`: `filename-naming-convention`, `folder-naming-convention` | PascalCase components / camelCase rest / allowed extensions | TODO | _TBD_ |
| 26 | `eslint-plugin-jest` / `eslint-plugin-vitest`: `no-focused-tests`, `no-disabled-tests`, `no-done-callback` | async tests, no stray `.only`/`.skip` | TODO | _TBD_ |

---

## Milestone 6 — Enforcement infra

| # | Task | Status |
| --- | --- | --- |
| 27 | `husky` + `lint-staged` (lint + format on staged files) | TODO |
| 28 | Backend lint + `format:check` in CI | TODO |

---

## Not practically lintable (stays in CLAUDE.md / review)

No props drilling · business logic in models · "no logic in `.map()`" · atomic stores vs. object stores · model section order · `sample` arg order · `useEffect` for data fetching · "extract a function only if reused 2+ times" · minimal comments · Russian error messages · timezone helper usage · "every folder has `index.ts`" (no standard rule — would need a custom script/test) · loading via global overlay · controllers wrapped in try-catch · return-early · Prisma-generated types reuse.
