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
| **frontend** | `.eslintrc.js` (legacy): `@typescript-eslint/recommended`, `import` (order + FSD `no-restricted-paths`), `unused-imports`, `testing-library`, `effector`, `jsx-a11y/recommended`, `no-explicit-any`, Tier A rules (#1–9), Tier B rules (#19–23), `check-file` naming (#25), `jest` focused/disabled tests (#26), `playwright` + e2e tag scheme for `e2e/**` (#29–30) | lint + `tsc --noEmit` + `format:check`, each over `src/`, `e2e/` and `playwright.config.ts` |
| **backend** | `eslint.config.mjs` (flat): `eslint` + `typescript-eslint` recommended + Tier A rules (#12–17) + Tier B rules (#18, #23, #24) + `check-file` naming (#25) + `jest` test rules (#26) | lint + `tsc` build + `format:check` |
| landing | flat config | lint + tsc + test |

Pre-commit (#27): `.githooks/pre-commit` → `lint-staged` runs `prettier --write` + `eslint --fix` on staged `frontend/src` / `frontend/e2e` / `frontend/playwright.config.ts` / `backend/src` files.

Three biggest gaps driving this work:

1. ~~**Backend is not linted at all**~~ — closed by PR3 (`eslint.config.mjs` + `lint` script + CI step).
2. ~~**Effector rules are marked "ESLint enforced" but are not**~~ — closed by PR2 (`eslint-plugin-effector@0.16.0`).
3. ~~**No pre-commit hook**~~ — closed by PR7 (`.githooks/pre-commit` + `lint-staged`, Milestone 6).

---

## Milestone 0 — Infra (prerequisites)

| # | Task | Scope | Status | Notes |
| --- | --- | --- | --- | --- |
| 0.1 | Scaffold ESLint (flat config + `typescript-eslint`) + `lint` script + CI step | backend | ✅ PR3 | eslint 9 + `typescript-eslint` 8 + `eslint-plugin-import`; non-type-aware (no `project`) so CI lint needs no `prisma generate` |
| 0.2 | Remove duplicate `plugins` key (`.eslintrc.js` lines 9–10) | frontend | ✅ PR1 | first line was dead |
| 0.3 | `husky` + `lint-staged` on commit | repo | ✅ PR7 | done as #27: `lint-staged` from a committed `.githooks/pre-commit`, no husky (see Milestone 6 notes) |
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
| 8 | `jsx-a11y` recommended → `error` (alt-text, label-has-associated-control, no-static-element-interactions, …) | a11y section | no | ✅ PR4 | **29**: 9 `no-autofocus` (prod, rule turned `off`), 20 `no-static-element-interactions` + `click-events-have-key-events` (all in tests, `off` for `__tests__`) |
| 9 | `max-lines` overrides (`*.tsx` 150, `*.model.ts` 200; `skipBlankLines` + `skipComments`, tests excluded) | size limits | no | ✅ PR4 | **5** `*.tsx` (177/168/151/166/194), **0** `*.model.ts` — all 5 split |

**PR1 (branch `chore/lint-conventions`) — landed locally, verified (lint + tsc + 1716 tests):** #1, #2, #3, #4, #5, #7 + dedup `plugins` key (0.2). 8 files, +32/−11.

Notes:
- **#4** — default `disallowTypeAnnotations: true` rejects the `vi.importActual<typeof import("…")>()` mock pattern (24 tests, not autofixable). Set `false`: keeps `import type` for top-level, allows `import()` annotations. Real top-level fixes = 7 files.
- **#7** — dropped the `onSubmit` ban: `onSubmit` is a legit custom prop name in 38 spots and there are no `<form>` elements, so forbidding the `form` element already covers the convention.

**PR4 (branch `worktree-chore-lint-frontend-m1`): #8, #9.** Milestone 1 closed.

Notes:
- **#8** — `no-autofocus` is `off`: all 9 hits were `autoFocus` on the first `TextField` of a login/register/reset form or a freshly opened dialog, which is the expected focus-management behaviour there, not a defect. `no-static-element-interactions` / `click-events-have-key-events` are `off` only under `__tests__` / `*.test.tsx`: every hit was a `<div onClick>` wrapper used as an event-propagation probe. Everything else in `jsx-a11y/recommended` is `error` with 0 violations. Note the plugin does **not** cover the "icon-only `IconButton` needs `aria-label`" rule — that stays review-checked.
- **#9** — counted with `skipBlankLines: true, skipComments: true` (the convention limits code, not whitespace); `__tests__` / `*.test.tsx` excluded. The earlier "9 + 4" estimate counted raw lines. The 5 oversized components were split instead of grandfathered: `AppRoutes` (lazy pages → `AppRoutes.constants.ts`, `RouteFallback` → own component), `LessonFormContent` (→ `LessonStatusSection`, `RecurringCheckbox`), `StudentFormFields` (duplicated contact-method select → `ContactMethodSelect`), `InvitationManager` (duplicated issue/revoke row → `InvitationActions`), `FinancialStatistics` (→ `IncomeCards`, `DebtCard`). Each new component has its own tests.

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
| 18 | `ClassDeclaration[superClass.name="Error"]` (+ `ClassExpression`) everywhere except `src/utils/errors.ts` | Centralize custom Error classes | backend | ✅ PR5 | **0** (the 7 classes in `errors.ts` are the allowed ones) |
| 19 | `CallExpression[callee.name="useUnit"][arguments.0.type="ArrayExpression"]` | `useUnit` separate calls for stores | frontend | ✅ PR5 | **0** |
| 20 | `no-restricted-imports` `paths`: `styled` from `@mui/material`, `@mui/material/styles`, `@mui/system`; any import of `@emotion/styled`, `styled-components` | `styled` from `@shared` | frontend | ✅ PR5 | **11** (all `import { styled } from "@mui/material"`, none used `$` props) — switched to `@shared` / `../../lib/styled.helpers` |
| 21 | `setTimeout` / `setInterval` (bare, `window.`, `globalThis.`) in `src/**/*.model.ts` | Timers via patronum | frontend | ✅ PR5 | **2** (`web-socket.model.ts`, `student-web-socket.model.ts` reconnect effects) — rewritten with `delay` |
| 22 | `ImportDeclaration[importKind!="type"][source.value=/\.model$/] > ImportSpecifier[importKind!="type"]` (prod only) | Import models as namespace | frontend | ✅ PR5 | **245** total: 13 import statements in 10 prod files (fixed), the rest in `__tests__` (rule `off` there) |
| 23 | `Program[body.length=0]` + `Program > ExportNamedDeclaration[declaration=null][specifiers.length=0][source=null]` (`*.d.ts` excluded) | No empty files | both | ✅ PR5 | **0** (+ `react-app-env.d.ts`, excluded by design) |
| 24 | `jest.mock(/prisma/i)` (also `doMock`, `unstable_mockModule`) | Do NOT mock Prisma | backend tests | ✅ PR5 | **1** (`middleware/__tests__/auth.test.ts`) — rewritten against the test DB |

**PR5 (branch `worktree-chore-lint-m4-tier-b`): #18–24.** Milestone 4 closed.

Notes:
- All Tier B rules are `no-restricted-syntax` selectors (plus `no-restricted-imports` `paths` for #20). Both configs now build the selector list from named constants (`enumRule`, `emptyFileRules`, …) so per-file overrides can drop one entry without re-declaring the rest — `no-restricted-syntax` is replaced wholesale per override, not merged.
- **#20** — only `@mui/material` was actually imported from; the other sources are banned pre-emptively. `src/shared/lib/styled.helpers.ts` is the single file allowed to import MUI's `styled`. Inside `shared`, the three offending dialogs import it relatively (`../../lib/styled.helpers`) because `@shared` is off-limits within the shared layer.
- **#21** — the two reconnect timers were `createEffect(() => new Promise(r => setTimeout(r, 5000)))`, gated on `.pending` to collapse repeated close events. Rewritten as `sample → delay({ source, timeout })` with an explicit `$isReconnectScheduled` store for the same collapsing. Tests moved from `fork({ handlers })` overrides to `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(...)`; because patronum's inner effect stays pending until the timer fires, `allSettled` calls that schedule a reconnect are fire-and-forget and awaited after the clock is advanced. The student model gained reconnect tests it did not have.
- **#22** — `import type { X } from "./x.model"` is allowed (types are not model parts). Tests are `off`: they import stores/events by name in ~30 files and rewriting them buys nothing. Bare `import "./x.model"` side-effect imports (used in `models/index.ts`) and `export * as` re-exports do not match the selector.
- **#24** — the one violation mocked `lib/prisma` to assert on `user.update` calls; the test now creates a real user, mints real JWTs, and polls the row for the fire-and-forget timezone write. It also gained tokenVersion-mismatch and unknown-user cases that the mock had made untestable.

---

## Milestone 5 — Naming & test plugins (new deps)

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 25 | `eslint-plugin-check-file`: `filename-naming-convention`, `folder-naming-convention`, `filename-blocklist` (as a role-suffix allowlist) | PascalCase components / camelCase rest / allowed extensions | ✅ PR6 | **FE 114 files**: 99 kebab-case (61 prod + 38 tests), 11 prod without a role suffix (+ 2 mirrored tests), 2 dead files deleted; folders **0**. **BE 8**: `WebSocketManager.ts` + its 4 tests, `routes/__test__.ts`, 2 kebab-case tests |
| 26 | `jest/no-focused-tests`, `jest/no-disabled-tests` (both), `jest/no-done-callback` (backend) | async tests, no stray `.only`/`.skip` | ✅ PR6 | **0** focused/disabled; **5** backend `done` callbacks (WebSocket test hooks) — rewritten to `await new Promise(...)` |

**PR6 (branch `worktree-chore-lint-m5-naming-tests`): #25, #26.** Milestone 5 closed.

Notes:
- **#25 versions** — the frontend pins `eslint-plugin-check-file@2.8.0`: 3.x supports flat config only, and the frontend is still on legacy `.eslintrc.js`. The backend uses 3.x.
- **#25 globs** — negated extglobs inside check-file patterns (`!(index|*.model).ts`, `*.!(test).tsx`) don't behave like bash in micromatch: they matched valid names (`App.tsx`, `index.ts`). The suffix allowlist is therefore scoped with ESLint's own `excludedFiles` / `ignores` (minimatch), and `filename-blocklist` with a `**/*.ts` key reports whatever is left. check-file itself only gets positive patterns.
- **#25 naming** — `*.tsx` PascalCase; files directly in `api/`, `model(s)/`, `types/` camelCase; any other `.ts` "letters and digits, starting with a letter". A glob can't tell a component folder from a camelCase one, so companions (`StudentCard.styled.ts`) and camelCase modules share that rule. Folders: the same glob, plus `__tests__`. Test files may carry qualifiers (`PaymentStatus.component.test.tsx`), so they are outside the suffix allowlist and only their case is checked.
- **#25 renames** — the 61 kebab-case prod files (`lesson-form.model.ts`) predate the rule; the convention always said camelCase. Models that sit next to their component (`RescheduleDialog/reschedule-dialog.model.ts`) became companions (`RescheduleDialog.model.ts`), like the existing `StudentViewDialog.model.ts`. Import specifiers were rewritten by resolving each path, not by name (`./types`, `./constants` are ambiguous).
- **#25 role suffixes** — `dateFormat`, `navigation`, `tokenStorage` → `*.helpers.ts`; `themeConfig/{components,moreComponents,palette,typography}` → `*.constants.ts`; `shared/constants.ts` → `shared/domain.constants.ts`; `app/types.ts` → `app/app.types.ts`; `LessonForm/types.ts`, `StudentForm/types.ts` → `<Component>.types.ts`. Deleted: `src/setupTests.ts` (CRA leftover — vitest loads `src/__tests__/setup.ts`) and `shared/ui/theme.ts` (a one-line re-export of `./themeConfig`). `shared/api/*.ts` and `shared/types/*.ts` keep plain names — the folder names the role, and `types/<domain>.ts` is what the "shared types split by domain" rule prescribes.
- **#25 backend** — camelCase everywhere. The one PascalCase file was the `WebSocketManager` class module; case-only renames go through `git mv` (the macOS FS is case-insensitive). `routes/__test__.ts` → `routes/testSupport.ts`, not `test.ts`: jest's `testMatch` would treat that as a suite. The URL stays `/api/__test__`.
- **#26 frontend** — uses `eslint-plugin-jest@25` (already loaded by `react-app/jest`, now an explicit devDependency), not `@vitest/eslint-plugin`: 1.x needs TypeScript ≥ 5 (the frontend is on 4.9.5), and jest 25's rules were checked to catch `it.only` / `it.skip` both as globals and as imports from `vitest`. `no-done-callback` is backend-only: in vitest the first test argument is the test context, not a callback.
- Measured but not adopted (no convention behind them): backend jest `recommended` — `no-conditional-in-test` 46, `expect-expect` 32 (mostly supertest `.expect()` chains), `no-conditional-expect` 10; the rest of the preset is 0. Frontend `vitest/expect-expect` 7.

---

## Milestone 6 — Enforcement infra

| # | Task | Status |
| --- | --- | --- |
| 27 | Pre-commit hook: `lint-staged` runs `prettier --write` + `eslint --fix` on staged `frontend/src` / `backend/src` files | ✅ PR7 |
| 28 | `format:check` in CI for frontend and backend (backend lint is in CI since PR3) | ✅ PR7 — **318 files** reformatted once: frontend 172 (+640/−1162), backend 146 (+827/−2015) |

**PR7 (branch `worktree-chore-lint-m6-enforcement`): #27, #28.** Milestone 6 closed.

Notes:
- **#27 no husky** — husky 9 sets a relative `core.hooksPath=.husky/_` and generates `.husky/_/` on `npm install`. Tasks here run in fresh worktrees with symlinked `node_modules`, where `.husky/_` would not exist, so hooks would silently not run. On top of that, Claude Code rewrites a relative `core.hooksPath` into an absolute path under the main checkout whenever it creates a worktree (seen in its worktree setup code; this repo's `.git/config` already carries such an absolute `hooksPath`). Instead, `npm install` at the root (`prepare` → `scripts/install-git-hooks.mjs`) writes a small dispatcher into the shared hooks dir. Git starts it at the root of the worktree being committed, and it execs that tree's own `.githooks/pre-commit`; branches without `.githooks/` are unaffected. The installer writes only into a hooks dir set up for this repository: it skips a `core.hooksPath` from the global or system git config (that dir serves every repository on the machine) and any `.githooks/` directory (a dispatcher there would exec itself).
- **#27 lint-staged** — installed at the repo root: `lint-staged@16` (Node ≥ 20.17; 17.x needs Node 22). One config per package (`frontend/.lintstagedrc.json`, `backend/.lintstagedrc.json`). With several configs, lint-staged runs each group's tasks in its config's directory (the frontend ESLint config needs that for `parserOptions.project: ./tsconfig.json`) and resolves `eslint` / `prettier` from that package's `node_modules/.bin`. With a single config it would run them from the repo root and match its globs from there, so dropping one of the two configs silently disables the other. When a worktree has no root `node_modules`, the hook uses the main checkout's, so worktrees only need `frontend/` / `backend/` `node_modules`. Those are often symlinked from the main checkout, which lags behind after a pull until it is reinstalled, so the hook compares each staged package's installed Prettier with its `package-lock.json` and stops on a mismatch rather than format with a different Prettier than CI's `format:check` (found by the local code review, `iter-2.json`). The root `package-lock.json` would make Next.js take the repo root as the workspace root of `landing/`, so `landing/next.config.ts` pins `turbopack.root` (the build output is unchanged).
- **#27 stash** — the stash stack is shared by all worktrees and parallel sessions, so the hook runs `lint-staged --no-stash`, and a failed run leaves the tasks' fixes in the index instead of reverting them. The exception is a partially staged file anywhere in the repo: while its tasks run, lint-staged hides the unstaged hunks of every such file, and after a failed `--no-stash` run lint-staged 16.4 does not put them back (`restoreUnstagedChangesSkipped` in `lib/state.js` has a no-op `false` where a `return` was meant), leaving them only in a patch file that the next run overwrites. So with a partially staged file the hook keeps lint-staged's backup stash, which restores everything on failure and is dropped afterwards. Found by the local code review (`docs/code-reviews/worktree-chore-lint-m6-enforcement/iter-1.json`).
- **#27 scope** — globs mirror `npm run lint` / `format:check`: ESLint on `src/**/*.{ts,tsx}` (frontend) and `src/**/*.ts` (backend), Prettier on the same plus `js,jsx,json,css,md` in frontend. `frontend/e2e/**` joined in PR8 (Milestone 7). Prettier runs before ESLint, so `max-lines` counts the formatted file, and once more after `eslint --fix` to format its fixes.
- **#28 Prettier 3** — frontend moved from 2.8.8 to 3.x and backend got the same version. The config moved from `frontend/.prettierrc` to the repo root, so both packages share one (CI path filters include `.prettierrc`). Most of the churn was code wrapped at 80 columns: backend had no Prettier config (80 is Prettier's default), and much of the frontend code was wrapped at 80 despite its `printWidth: 100` config. The one-off reformat is a separate commit listed in `.git-blame-ignore-revs`.
- Hook and installer are tested in `scripts/__tests__/{pre-commit-hook,install-git-hooks}.test.mjs` (temp git repos with a stub `lint-staged`, plus one run of the real `lint-staged` for the partially staged case); a new `scripts` CI job installs the root dependencies and runs `node --test scripts/__tests__/`.

---

## Milestone 7 — E2E (`frontend/e2e/**`)

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 29 | Lint, type-check and format `frontend/e2e/**` + `playwright.config.ts`: `tsconfig.json` includes them; the `lint` / `format` scripts, lint-staged and the hook cover them | e2e conventions ("ESLint and Prettier apply to `frontend/e2e/**`") | ✅ PR8 | **348** errors with the frontend config as is: 282 `testing-library/prefer-screen-queries`, 46 `check-file` (kebab-case names), 19 `import/order` (autofixed), 1 `import/no-default-export` (`playwright.config.ts`). `tsc`: **0**. Prettier: all **56** files reformatted once (+1165/−1584) |
| 30 | `eslint-plugin-playwright`: `no-focused-test`, `no-wait-for-timeout`, `no-wait-for-selector`, `no-page-pause`, `no-raw-locators`, `valid-test-tags`; tag presence via `no-restricted-syntax`; `check-file` kebab-case (PascalCase in `e2e/pages/`) | no `waitForTimeout`, `expect().toBeVisible()` over `waitForSelector`, selector priority (no CSS / XPath), tag scheme, kebab-case spec names | ✅ PR8 | **0** for every rule but one: **13** raw locators, all fixed |

**PR8 (branch `worktree-chore-lint-m7-e2e`): #29, #30.** Milestone 7 closed.

Notes:
- **#29 tsconfig** — `frontend/tsconfig.json` now includes `e2e/` and `playwright.config.ts`: one project for `tsc --noEmit`, type-aware ESLint and the import resolver. CRA's type checker reports only `src/**` issues, so the dev server and the build are unaffected. e2e had no type errors.
- **#29 Jest / RTL off** — `react-app/jest` turns Jest and Testing Library rules on for every `*.spec.*` file, so `prefer-screen-queries` read Playwright's `page.getByRole` as an RTL query (282 hits). The e2e override turns off every rule of both plugins, generated from their rule lists.
- **#29 naming** — the `src` check-file rule (letters and digits only) rejects the kebab-case that `e2e-testing.md` prescribes. The e2e override: kebab-case files (middle extensions ignored, so `create-student.draft.spec.ts` passes) and folders; page objects in `e2e/pages/` are PascalCase.
- **#29 scope** — `lint`, `lint:fix`, `format`, `format:check` take `e2e/**/*.ts` (Prettier also `e2e/**/*.md`) and `playwright.config.ts`; so do `frontend/.lintstagedrc.json` and the hook's staged-file filter (new hook tests). CI runs the scripts, so the workflow is unchanged.
- **#30 plugin** — `eslint-plugin-playwright@2.11.0` only needs `eslint >=8.40` and still ships the legacy `plugin:playwright/*` configs, so unlike effector 0.17+ or check-file 3.x it is not blocked by TS 4.9.5 / `.eslintrc.js`. It recognises `test` by name, so specs that import `test` from `e2e/fixtures` are covered (checked with probe specs).
- **#30 tags** — `valid-test-tags` with `allowedTags` checks the vocabulary only (Playwright also reads `@word` in a title as a tag). That a suite carries a level and an area tag is four `no-restricted-syntax` selectors over `test.describe` and its `.serial` / `.parallel` / … forms (`describe.configure` excluded). "Exactly one level tag" stays review-checked.
- **#30 raw locators** — all 13 fixed rather than allowlisted. The OTP code inputs of `EmailVerificationForm` and `VerifyStep` had no accessible name (an a11y violation per `frontend.md`) and got `aria-label="Цифра N из 6"`; password fields → `getByLabel(/^Пароль/)` and its pair; the copy-invite button already had an `aria-label`; `text=/…/` → `getByText`; MUI X date sections → `getByRole("spinbutton")`; three `xpath=following-sibling` lookups of report amounts → `data-testid` (`earnings-amount`, `tax-amount`), since nothing in the markup ties an amount to its card title.
- Not adopted: `no-skipped-test` (the convention allows `test.skip` with a TODO and an issue) and the rest of `recommended` (no convention behind it; `no-force-option` would flag 2). Left as warnings, as in `src/`: 10 `no-non-null-assertion`, 3 unused `tutor` fixture args (requested for their side effect), 1 `no-empty-pattern` (Playwright requires `async ({}, use)`).
- Verified locally against the test-DB backend: full suite 59 passed, 1 skipped, 2 failed; every rewritten locator is exercised by a passing spec. `push-subscribe.spec.ts` failed on every run: it clicked the «Уведомления» tab only when a non-waiting `isVisible()` saw it, which never happens right after `goto`, so it is now a plain auto-waiting click (3/3 green). `admin-login.spec.ts` fails with «Админ не настроен»: the local `.env.test` sets no `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`, an environment gap outside this change. The admin and student-cabinet specs also need `ADMIN_JWT_SECRET` / `STUDENT_JWT_SECRET` in the backend env.

---

## Not practically lintable (stays in CLAUDE.md / review)

No props drilling · business logic in models · "no logic in `.map()`" · atomic stores vs. object stores · model section order · `sample` arg order · `useEffect` for data fetching · "extract a function only if reused 2+ times" · minimal comments · Russian error messages · timezone helper usage · "every folder has `index.ts`" (no standard rule — would need a custom script/test) · loading via global overlay · controllers wrapped in try-catch · return-early · Prisma-generated types reuse.
