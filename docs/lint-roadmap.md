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
| **frontend** | `.eslintrc.js` (legacy): `@typescript-eslint/recommended`, `import` (order + FSD `no-restricted-paths`), `unused-imports`, `testing-library`, `effector`, `jsx-a11y/recommended`, `no-explicit-any`, Tier A rules (#1–9), Tier B rules (#19–23), `check-file` naming (#25), `jest` focused/disabled tests (#26) | lint + `tsc --noEmit` |
| **backend** | `eslint.config.mjs` (flat): `eslint` + `typescript-eslint` recommended + Tier A rules (#12–17) + Tier B rules (#18, #23, #24) + `check-file` naming (#25) + `jest` test rules (#26) | lint + `tsc` build |
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
| 27 | `husky` + `lint-staged` (lint + format on staged files) | TODO |
| 28 | Backend lint + `format:check` in CI | TODO |

---

## Milestone 7 — E2E (`frontend/e2e/**`)

| # | Rule | Convention | Status | Violations |
| --- | --- | --- | --- | --- |
| 29 | Lint `frontend/e2e/**` at all — `npm run lint` covers only `src/`, although `e2e-testing.md` says ESLint applies there; type-aware rules need a tsconfig that includes `e2e/` | e2e conventions | TODO | _TBD_ |
| 30 | `eslint-plugin-playwright`: `no-focused-test`, `no-wait-for-timeout`, `no-wait-for-selector`, `no-page-pause`; `check-file` kebab-case `*.spec.ts` | no `waitForTimeout`, `expect().toBeVisible()` over `waitForSelector`, kebab-case spec names | TODO | _TBD_ |

---

## Not practically lintable (stays in CLAUDE.md / review)

No props drilling · business logic in models · "no logic in `.map()`" · atomic stores vs. object stores · model section order · `sample` arg order · `useEffect` for data fetching · "extract a function only if reused 2+ times" · minimal comments · Russian error messages · timezone helper usage · "every folder has `index.ts`" (no standard rule — would need a custom script/test) · loading via global overlay · controllers wrapped in try-catch · return-early · Prisma-generated types reuse.
