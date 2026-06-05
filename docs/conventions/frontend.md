# Frontend Conventions

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

**Import aliases:** Use `@app`, `@pages`, `@features`, `@entities`, `@shared` for cross-layer imports:

```typescript
// ✅ Good — top-level index
import { Button } from "@shared";
import { studentModel } from "@entities";

// ❌ Bad — deep imports
import { Button } from "@shared/ui";
import { Button } from "../../shared/ui";
```

## File Naming

**PascalCase** — components: `StudentCard/StudentCard.tsx`, `StudentCard.styled.ts`
**camelCase** — everything else: `lessons.model.ts`, `lessons.api.ts`, `lessons.types.ts`

**Only these extensions:** `.tsx`, `.model.ts`, `.api.ts`, `.types.ts`, `.styled.ts`, `.constants.ts`, `.helpers.ts`, `.hooks.ts`

**Folder structure:**

```
ComponentName/
├─ index.ts
├─ ComponentName.tsx
├─ ComponentName.styled.ts
├─ ComponentName.types.ts
├─ ComponentName.helpers.ts
└─ ComponentName.hooks.ts

feature/models/
├─ index.ts           # export * as listModel, * as formModel
├─ list.model.ts
└─ form.model.ts
```

## Strict Rules

### Structure

- **One component per file** in its own directory
- **Every folder has `index.ts`** — re-export public API
- **No deep imports** — max 1 level: `import { X } from "./components"` not `"./components/X/X"`
- **Separate files for:** constants, helpers, hooks, types — never mix in one file. Никаких `const X = ...` или вспомогательных функций в файле компонента — только сам компонент и его props-тип. Всё остальное → `*.constants.ts(x)` / `*.helpers.ts` / `*.types.ts` рядом
- **Shared types split by domain.** Один большой `shared/types/index.ts` не масштабируется — разнеси по `types/auth.ts`, `types/student.ts`, `types/lesson.ts`, …, а `index.ts` оставь barrel'ом из `export type`
- **Components < 150 lines** — split if larger
- **No empty files** — if a file is no longer needed, delete it completely. Never leave stub files with only `export {}`

### Types

- **Types in `*.types.ts`** (except component props inline)
- **Use `type`**, not `interface`
- **Use `import type`** for type imports
- **String literals**, not enums
- **No `any`** — use `unknown`

### Styles

- **No inline styles** — no `style={{}}`, no `sx={{}}`

- **Styled props with `$` prefix** for dynamic values, **Use `styled` from `@shared`** — for correct `$` props filtering:

  ```typescript
  import { styled } from "@shared";

  export const Box = styled(MuiBox)<{ $height: number }>`
    height: ${({ $height }) => $height}px;
  `;
  ```

- **Import as namespace:** `import * as Styled from "./X.styled"`

### Components

- **No props drilling** — use Effector stores
- **No IIFE in JSX** — extract to components
- **No logic in .map()** — extract complex callbacks to components
- **Business logic in models**, not components
- **No `<form>` tags** — use explicit `onClick` handlers on buttons instead of `onSubmit`

### Accessibility (a11y)

- **Icon-only buttons must have `aria-label`** — every `IconButton` (or styled `IconButton`) whose only visible content is an icon must include a Russian `aria-label` describing its action. `<Tooltip>` does NOT replace this — it sets `title`, which screen readers (notably VoiceOver) ignore on interactive elements.
  ```tsx
  // ✅ Good
  <IconButton aria-label="Меню урока" onClick={onMenuClick}>
    <MoreVertIcon />
  </IconButton>

  // ❌ Bad — screen reader announces just "button"
  <IconButton onClick={onMenuClick}>
    <MoreVertIcon />
  </IconButton>

  // ❌ Bad — Tooltip alone is not enough
  <Tooltip title="Меню урока">
    <IconButton onClick={onMenuClick}>
      <MoreVertIcon />
    </IconButton>
  </Tooltip>
  ```
- **`<img>` must have `alt`** — empty `alt=""` is allowed only for purely decorative images.
- **Use semantic elements** — `<button>` for clickable actions, not `<div onClick>`. If you must use a non-button element, add `role="button"`, `tabIndex={0}`, and a keyboard handler (`onKeyDown` for Enter/Space).
- **Form inputs must be labeled** — every input needs a connected `<label>` (via `htmlFor`/`id`) or `aria-label`/`aria-labelledby`. MUI `TextField` with the `label` prop satisfies this; raw `<input>` does not.

### Code Quality

- **Named exports only** — no `export default`
- **Function expressions only** — use `const fn = () => {}`, not `function fn() {}`
- **No ESLint errors** — run `npm run lint` and fix all errors before finishing
- **No TypeScript errors** — run `npx tsc --noEmit` and fix all errors before finishing

### Shared utilities

- **Дата/время** — все примитивы (`addDays`, `getWeekStart`, `getWeekEnd`, `groupByDay`, `formatTime`, `formatDuration`, `formatTimeRange`, `toDateKey`) живут в `shared/lib/date.helpers.ts`. Не объявлять локальные `setDate(getDate() + n)` в компонентах/моделях — импортировать из `@shared`.
- **Локализованные форматтеры** (`formatDate`, `formatWeekRange`, `formatMonth`, `formatDay`) — в `shared/lib/dateFormat.ts`. Тоже импортировать через `@shared`.
- **Ошибки axios** — единый `extractAxiosError(err, fallback?)` в `shared/lib/error.helpers.ts`. Не дублировать `axiosError?.response?.data?.error || axiosError?.message || "..."` в каждой модели. При необходимости фолбэк — вторым аргументом.

## Effector Conventions

**Naming (ESLint enforced):**

- Stores: `$storeName`
- Events: `eventName`
- Effects: `effectNameFx`
- Gates: `FeatureGate`

**Model structure order:**

1. Gates
2. Stores
3. Events
4. Effects
5. Samples

**Forbidden:**

- `.on()`, `.watch()`, `store.getState()`
- `forward()`, `guard()` — use `sample` instead
- `useStore` — use `useUnit`
- `useUnit` with array destructuring — use separate calls for stores
- Side effects in `fn` — `fn` must be a pure function (no API calls, no mutations, no model events calls, no model effects calls)
- `useEffect` for initial data fetching — use `createGate` + `sample({ clock: Gate.open, target: fetchFx })` instead
- `useEffect` + `setInterval`/`setTimeout` для таймеров, дёргающих события модели — таймер живёт **внутри модели**. Для периодических тиков используем `interval` из `patronum` (`{ tick, isRunning }`), для одиночной задержки — `delay` из `patronum`. Не свой `createEffect(() => setTimeout(...))` с `scopeBind` — `patronum` уже сделал scope-safe реализацию

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

**Timers in models (patronum):**

```typescript
import { interval } from "patronum";

// ✅ периодический тик внутри модели
const { tick, isRunning } = interval({
  timeout: 1000,
  start: cooldownStarted,
  stop: cooldownEnded,
});

sample({ clock: tick, target: cooldownTick });
```

Тестирование: внутренний `timeoutFx` `interval`'а остаётся `pending`, пока не сработает `setTimeout`. Поэтому в `effector` тестах с `allSettled` используем fire-and-forget паттерн (`void allSettled(...)` + `await new Promise(r => setImmediate(r))`) и явно гасим интервал событием `stop` в конце теста — иначе тест таймаутит.

**Form state:** Keep in Effector stores, not React `useState`. Use `useState` only for purely visual state with no business logic (e.g., tooltip open, animation flag). Any state that feeds into API calls, validation, or business logic must be in Effector.

**Atomic stores:** Avoid large object stores. Instead of `$uiState: { isOpen, selected, anchor }` use separate `$isOpen`, `$selected`, `$anchor`.

**Models < 200 lines** — split into smaller models if larger.

**Split models by domain** — separate models by logical responsibility (e.g., `list.model.ts`, `form.model.ts`, `dialogs.model.ts`).

**Extract complex fn/filter to helpers:**

```typescript
// ❌ Don't inline complex logic
sample({
  clock: submitted,
  source: $formData,
  fn: (data) => {
    const validated = validateFields(data);
    const transformed = transformForApi(validated);
    return { ...transformed, timestamp: Date.now() };
  },
  target: submitFx,
});

// ✅ Extract to feature.helpers.ts
import { prepareSubmitData } from "./feature.helpers";
sample({
  clock: submitted,
  source: $formData,
  fn: prepareSubmitData,
  target: submitFx,
});
```

**Export and import models as namespace:**

```typescript
// ✅ Export in index.ts
export * as featureModel from "./feature.model";

// ✅ Import whole model
import { featureModel } from "./models";
featureModel.$store;
featureModel.eventName;

// ✅ Import whole model such way if it's in the same folder
import * as featureModel from "./feature.model";
featureModel.$store;
featureModel.eventName;

// ❌ Don't import parts
import { $store, eventName } from "./feature.model";
```

**Re-exports only in index files** — models must not re-export other models, all re-exports go through `index.ts`

## New Feature Template

```typescript
// features/featureName/featureName.model.ts
import { createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";
import { featureApi } from "@shared";

export const PageGate = createGate();
export const $data = createStore<DataType[]>([]);
export const $isLoading = featureApi.loadFx.pending;

sample({ clock: PageGate.open, target: featureApi.loadFx });
sample({ clock: featureApi.loadFx.doneData, target: $data });
```

## Loading Indicators

Use the **global blocking overlay** (`$isBlocking` in `app/model/blocking.model.ts`) for all API requests. Do NOT add per-component spinners — add the effect's `.pending` to the `$isBlocking` combine instead. The overlay covers the whole screen with a `CircularProgress`.

```typescript
// app/model/blocking.model.ts
export const $isBlocking = combine(
  {
    addLesson: lessonModel.addLessonFx.pending,
    updateSettings: notificationsModel.updateSettingsFx.pending,
    // ... add new effects here
  },
  (pending) => Boolean(Object.values(pending).some(Boolean))
);
```

`$isBlocking` is the raw "any request pending" flag. The component renders `$isBlockingVisible`, which only turns on after blocking has lasted `BLOCKING_OVERLAY_DELAY_MS` (300ms) via `delay` from patronum — fast requests must not flash the full-screen spinner. It clears the moment `$isBlocking` goes false. When adding an effect, wire its `.pending` into the `$isBlocking` combine; visibility timing is handled for you.

## Timezone Handling

User's timezone is the browser's timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), sent automatically as `X-Timezone` header on every API request (`shared/api/base.ts`).

**Rules:**

- **Date display** — use `toLocaleDateString("ru-RU")` / `toLocaleTimeString("ru-RU")` which automatically use browser timezone
- **Date formatting** — use helpers from `shared/lib/dateFormat.ts`
- **Sending date ranges to API** — convert to UTC boundaries via `toLocalStartOfDay(date)` / `toLocalEndOfDay(date)` from `features/lessons/models/lessons-filters.helpers.ts`. These set 00:00/23:59:59 in browser local time then `.toISOString()` to UTC
- **Never send raw `Date` objects** — always convert through `toLocalStartOfDay`/`toLocalEndOfDay` or `.toISOString()`
- **MUI DatePicker values** are in browser local time — no extra conversion needed before passing to `toLocalStartOfDay`/`toLocalEndOfDay`

## Code Style

- Extract functions only if reused 2+ times
- **Minimal comments — default zero.** Перед написанием комментария спросить себя: «без него читатель ошибётся / потеряет важный контекст?» Если нет — удалить. Не писать «// эта функция делает X», «// Form fields», «// Effects», «// Reactions», «// Создаём store», «Регрессия #N» — имена/структура и git blame уже это говорят. Оставлять только: скрытые инварианты, обходы багов (с источником), неинтуитивные side-effects, спорные «почему именно так». Это применяется и к тестам — описательное `it("...")` уже даёт контекст
- Use `attach` for feature-specific API effects
- Backend errors are in Russian
- Use `frontend/src/shared/lib/dateFormat.ts` for date formatting
