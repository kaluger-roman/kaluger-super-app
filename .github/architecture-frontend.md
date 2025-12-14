# Architecture Guide Frontend

This guide covers the architectural decisions and patterns used in the project.

## Structure

This section describes the `frontend/` directory structure and the main conventions used by the codebase. It's written to be LLM-friendly (clear labels, common file patterns, and where to find features).

Top-level layout (important folders/files):

```
frontend/
├─ package.json           # frontend deps & npm scripts
├─ public/                # static index.html, manifest and assets served as-is
├─ src/                   # application source code (TypeScript + React)
│  ├─ index.tsx           # app bootstrap + root providers
│  ├─ index.css           # global styles
│  ├─ app/                # top-level App component and root-level wiring
│  ├─ pages/              # page-level route components
│  ├─ features/           # Feature-sliced units (use cases / pages scoped features)
│  ├─ entities/           # Domain entities (reusable components, models, types)
│  ├─ shared/             # cross-cutting code: api, hooks, ui primitives, config
  │  └─ api/              # network layer and API effect wrappers
  ├─ components/         # small, generic React components
  └─ types/               # global/shared TypeScript types (if present)
```

Conventions and responsibilities:

- `pages/`: route-level components. Each page is a folder with its main component and subcomponents. Pages compose `features` and `entities`.
- `features/`: Feature-sliced Design features (auth, lessons, students). Each feature contains its UI, model (Effector stores/events/effects), and API integration for that feature.
- `entities/`: Domain-focused reusable pieces (e.g., `student`, `lesson`, `user`). Entities expose models, UI components and types that features/pages consume.
- `shared/`:
  - `api/`: a thin network layer — centralized API namespace, request helpers, and effects that backend endpoints map to.
  - `ui/`: design-system primitives and wrappers around Material UI components.
  - `hooks/`, `lib/`, `model/`: shared hooks, utilities, and Effector helpers.
- `app/App.tsx`: application root — routing, global providers (Effector, i18n, theme), and global error boundaries.

Effector usage patterns:

- Models live under feature or entity folders as `*.model.ts` files and export stores (`$store`), events, and effects (`*Fx`).

Quick navigation hints:

- To find API calls, search `shared/api` and `api` namespaces inside features/entities.
- To locate state logic for a page, open `features/<featureName>/*.model.ts` or `entities/<entityName>/*.model.ts`.
- UI building blocks (buttons, inputs) live in `shared/ui` and `components/`.

Feature-Sliced Design guidelines:

- Purpose: follow Feature-Sliced Design to keep code organized by responsibility and vertical feature boundaries. Use `pages` → `features` → `entities` → `shared` as the main layering.
- Layer responsibilities:
  - `pages`: compose features into full-screen routes and manage page lifecycle (Gates).
  - `features`: encapsulate single use-cases or flows. A feature owns its UI components, Effector model (`*.model.ts`), local API wiring (via `shared/api`), and feature-scoped types. Features should not be imported by other features directly — communicate via shared models or entities.
  - `entities`: domain concepts that are reusable across features (e.g., `student`, `lesson`, `user`). Entities expose domain models, UI atoms/molecules, and typed APIs for other code to consume.
  - `shared`: cross-cutting utilities, design system components, API client layers, and global types.
- File and naming rules:
  - One component per file. Component directories use PascalCase, e.g. `StudentCard/StudentCard.tsx`.
  - Types live in `*.types.ts` files inside the same layer (e.g., `entities/student/student.types.ts`). Always use `type` (not `interface`).
  - Effector: stores start with `$`, effects end with `Fx`, and gates are exported from models where applicable.
- Dependency rules (keep layers directional):
  - `pages` -> `features` -> `entities` -> `shared` (allowed imports go downwards only).
  - No upward imports (e.g., `shared` must not import from `entities` or `features`).
  - Features may depend on other features only via `entities` or `shared` abstractions.
- When adding a new feature:
  1. Create `src/features/<featureName>/` with `index.tsx`, `<featureName>.model.ts`, `api.ts` (if needed), and a `ui/` directory for presentational components.
  2. Add types in `*.types.ts` inside the feature folder.
  3. Wire lifecycle with a Gate: export `{ PageGate, pageOpened } = createGate()` from the model and trigger loads via `sample`.
- Examples of good practices:
  - Keep heavy business logic in models (`*.model.ts`) not components.
  - Reuse entity UI components inside features instead of copy-pasting.
  - Use `attach` to customize `shared/api` effects for feature-specific parameters.

### Example: Model Structure (Imports API)

```typescript
// models/teams-list/teams-list.model.ts
import { attach, createStore, createEvent, sample } from "effector";
import { teamsApi } from "../../api"; // Import API namespace

// Gates
export const { PageGate, pageOpened } = createGate<void>();

// Stores
export const $teams = createStore<Array<Team>>([]);
export const $teamsLoading = teamsApi.teamsLoadFx.pending;

// Attach effects to pass parameters/transform data
export const teamsLoadFx = attach({ effect: teamsApi.teamsLoadFx });

// Events for store updates
export const teamsLoaded = createEvent<Array<Team>>();
export const teamDeleted = createEvent<number>();

// Business Logic - use sample, NOT .on()
sample({
  clock: pageOpened,
  target: teamsLoadFx,
});

sample({
  clock: teamsLoadFx.doneData,
  target: $teams,
});

sample({
  clock: teamsApi.teamDeleteFx.done,
  source: $teams,
  fn: (teams, { params: deletedId }) =>
    teams.filter((team) => team.id !== deletedId),
  target: $teams,
});

// models/teams-list/index.ts - Export as namespace
export * as teamsListModel from "./teams-list.model";
```

## Additional Resources

- [Effector Documentation](https://effector.dev)
- [Nx Documentation](https://nx.dev)
- [RxJS Documentation](https://rxjs.dev)
