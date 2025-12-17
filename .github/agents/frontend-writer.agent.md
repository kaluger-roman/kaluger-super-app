---
description: "Write frontend code following project conventions"
tools:
  [
    "runCommands",
    "runTasks",
    "edit",
    "runNotebooks",
    "search",
    "new",
    "extensions",
    "todos",
    "runSubagent",
    "usages",
    "vscodeAPI",
    "problems",
    "changes",
    "testFailure",
    "openSimpleBrowser",
    "fetch",
    "githubRepo",
  ]
---

Follow DRY, KISS, YAGNI, and other best practices.

# Frontend Architecture

Stack: React + TypeScript + Effector + Material UI

## Structure (Feature-Sliced Design)

```
frontend/src/
├─ app/          # Root component, routing, providers
├─ pages/        # Route components (compose features)
├─ features/     # Use-case modules (auth, lessons, students)
├─ entities/     # Domain models (student, lesson, user)
├─ shared/       # API, UI kit, hooks, utils
└─ components/   # Generic UI components
```

**Import direction:** `pages` → `features` → `entities` → `shared` (only downward)

## File Naming

| Type      | Pattern                           | Example                       |
| --------- | --------------------------------- | ----------------------------- |
| Component | `ComponentName/ComponentName.tsx` | `StudentCard/StudentCard.tsx` |
| Model     | `feature.model.ts`                | `lessons.model.ts`            |
| API       | `feature.api.ts`                  | `lessons.api.ts`              |
| Types     | `feature.types.ts`                | `lessons.types.ts`            |
| Styles    | `feature.styled.ts`               | `StudentCard.styled.ts`       |
| Constants | `feature.constants.ts`            | `lessons.constants.ts`        |
| Helpers   | `feature.helpers.ts`              | `lessons.helpers.ts`          |
| Hooks     | `feature.hooks.ts`                | `lessons.hooks.ts`            |

**Only these extensions allowed:** `.tsx`, `.model.ts`, `.api.ts`, `.types.ts`, `.styled.ts`, `.constants.ts`, `.helpers.ts`, `.hooks.ts`. No custom extensions like `.utils.ts`, `.data.ts`, etc.

**Group related files in folders:**
```
StudentCard/
├─ index.ts              # re-export
├─ StudentCard.tsx       # component
├─ StudentCard.styled.ts # styles
├─ StudentCard.types.ts  # types (if needed)
├─ StudentCard.constants.ts
└─ StudentCard.hooks.ts
```

## Strict Rules

- **One component per file** — each in its own directory
- **Every folder must have `index.ts`** — re-export public API, import from folder not files (except `shared/`)
- **Types only in `*.types.ts`** (except component props)
- **Use `type`, not `interface`**
- **Use string literals, not enums**
- **Use `import type` for type imports**
- **No `any`** — use `unknown`
- **No `export default`** — only named exports/imports
- **No props drilling** — use Effector stores
- **No IIFE in JSX** — extract `{(() => { ... })()}` to separate components
- **No logic in .map()** — if map callback has calculations, extract to a component
- **No inline styles** — no `style={{}}`, no `sx={{}}`, use `*.styled.ts` files only
- **Import styled as namespace** — `import * as Styled from "./Component.styled"`, use as `<Styled.Container>`
- **No unnecessary wrappers** — use `onDelete={deleteDialogOpened}` not `onDelete={(x) => deleteDialogOpened(x)}`
- **Components < 150 lines** — split if larger
- **Business logic in models**, not components
- **No ESLint errors** — code must pass linting after changes
- **Build must pass** — no TypeScript errors

## Effector Conventions

**Naming (ESLint enforced):**

- Stores: `$storeName`
- Events: `eventName`
- Effects: `effectNameFx`
- Gates: `FeatureGate`

**Forbidden:**

- `.on()`, `.watch()`, `store.getState()`
- `forward()`, `guard()` — use `sample` instead
- `useStore` — use `useUnit`
- `useUnit` with array destructuring — use separate calls for stores

**useUnit pattern:**
```typescript
// ✅ Stores: separate lines
const lessons = useUnit(model.$lessons);
const students = useUnit(model.$students);

// ✅ Actions: object
const actions = useUnit({ save: model.saved, delete: model.deleted });

// ❌ Don't
const [lessons, students] = useUnit([model.$lessons, model.$students]);
```

**sample order:** `{ clock, source, filter, fn, target }`

**Form state:** Keep in Effector stores, not React useState.

**Atomic stores:** Avoid large object stores. Instead of `$uiState: { isOpen, selected, anchor }` use separate `$isOpen`, `$selected`, `$anchor`.

**Models < 200 lines** — split into smaller models if larger.

**Export models as namespace:** `export * as featureModel from "./feature.model"`, use as `featureModel.$store`, `featureModel.eventName`

## New Feature Template

```typescript
// features/feature-name/feature-name.model.ts
import { attach, createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";
import { featureApi } from "../../api";

export const PageGate = createGate();
export const $data = createStore<DataType[]>([]);
export const $isLoading = featureApi.loadFx.pending;

sample({ clock: PageGate.open, target: featureApi.loadFx });
sample({ clock: featureApi.loadFx.doneData, target: $data });
```

## Code Style

- Extract functions only if reused 3+ times
- Minimal comments — only for non-obvious logic
- Use `attach` for feature-specific API effects
- Backend errors are in Russian
