# Code Style Guide For Frontend

This guide covers coding conventions, naming patterns, and best practices for the project.

## Table of Contents

- [Effector Naming Conventions](#effector-naming-conventions)
- [File Naming](#file-naming)
- [TypeScript Conventions](#typescript-conventions)
- [Code Style Conventions](#code-style-conventions)
- [Effector Rules](#effector-rules)
- [Common Patterns](#common-patterns)

## Effector Naming Conventions

ESLint enforces these naming conventions for Effector entities:

- **Stores:** `$storeName` (prefix with `$`)
- **Events:** `eventName` (camelCase)
- **Effects:** `effectNameFx` (suffix with `Fx`)
- **Gates:** `FeatureGate` or `{ PageGate }` from `createGate()`

**Examples:**

```typescript
// Stores
export const $teams = createStore<Team[]>([]);
export const $isLoading = createStore(false);
export const $formValue = createStore<FormData>({});

// Events
export const pageOpened = createEvent();
export const teamDeleted = createEvent<number>();
export const handleChange = createEvent<{ name: string; value: string }>();

// Effects
export const teamsLoadFx = createEffect<void, Team[]>();
export const teamSaveFx = createEffect<TeamPayload, void>();

// Gates
export const { PageGate, pageOpened } = createGate();
export const CampaignsGate = createGate();
```

## File Naming

Follow these conventions for consistent file organization:

- **Models:** `[feature].model.ts` (stores, events, effects)
- **API:** `[feature].api.ts` (API effects)
- **Types:** `[feature].types.ts` (type definitions only)
- **Components:** `[ComponentName]/[ComponentName].tsx` (PascalCase directory and file, each component in separate directory)
- **Pages:** `[PageName]/[PageName].tsx` (PascalCase directory and file)

**Important rules:**

- **ALWAYS put type definitions in `*.types.ts` files** - Never define types in constants, models, or component files
- Types should be imported with `import type { TypeName } from "./path"` syntax
- **DO NOT create files with multiple components** - each component should be in its own directory with its own file and styles

## TypeScript Conventions

### Use `type` instead of `interface`

**ALWAYS use `type` instead of `interface`** for type definitions for consistency and better type composition.

```typescript
// ✅ DO use type
type User = {
  id: number;
  name: string;
  email: string;
};

type UserWithRole = User & {
  role: string;
};

// ❌ DON'T use interface
interface User {
  id: number;
  name: string;
}
```

### Use typed string literals instead of enums

**PREFER typed string literals over enums** for constant values.

```typescript
// ✅ DO use typed string literals
export type Strategy = "simple" | "advanced" | "predictive_ai";
export type DialerMode = "low" | "medium" | "high";

const strategy: Strategy = "simple";

// ❌ DON'T use enum
enum Strategy {
  Simple = "simple",
  Advanced = "advanced",
  PredictiveAi = "predictive_ai",
}

const strategy = Strategy.Simple;
```

## Code Style Conventions

### Avoid unnecessary small utility functions

Don't extract trivial one-liners unless they provide meaningful abstraction or are reused multiple times.

```typescript
// ❌ DON'T create unnecessary wrapper functions
export const getNetworkConnection = (): NetworkInformation | undefined => {
  return (
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection
  );
};

export const checkConnection = () => {
  const connection = getNetworkConnection();
  // ... use connection
};

// ✅ DO inline simple logic
export const checkConnection = () => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  // ... use connection
};
```

**When to extract functions:**

- Logic is reused in multiple places (3+ times)
- Function provides meaningful abstraction with clear purpose
- It simplifies complex conditional logic
- It improves testability

### Don't use JSDoc for obvious code

Code should be self-documenting. Only add comments for complex business logic or non-obvious behavior.

```typescript
// ❌ DON'T add JSDoc for obvious code
/**
 * Gets the user name
 * @returns {string} The user name
 */
export const getUserName = (user: User): string => {
  return user.name;
};

// ✅ DO write self-documenting code without JSDoc
export const getUserName = (user: User): string => {
  return user.name;
};
```

### Minimize comments in general

Write clear, readable code instead of explaining unclear code with comments.

```typescript
// ❌ DON'T explain obvious logic with comments
export const calculateTotal = (items: Item[]) => {
  // Initialize sum variable to 0
  let sum = 0;
  // Loop through all items
  for (const item of items) {
    // Add item price to sum
    sum += item.price;
  }
  // Return the total sum
  return sum;
};

// ✅ DO write clear code without noise
export const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};
```

**When comments ARE appropriate:**

- Complex business logic that isn't obvious from the code
- Workarounds for bugs in external libraries
- Performance optimizations that look counterintuitive
- Important architectural decisions

## Effector Rules

These rules are enforced by ESLint and are critical for maintainable Effector code.

### ALWAYS use `sample` for data flow

Never use `.on()` or `.watch()` operators.

```typescript
// ❌ DON'T use .on()
$teams.on(teamDeleteFx.done, (teams, { params }) =>
  teams.filter((t) => t.id !== params)
);

// ✅ DO use sample
sample({
  clock: teamDeleteFx.done,
  source: $teams,
  fn: (teams, { params }) => teams.filter((t) => t.id !== params),
  target: $teams,
});
```

### Why avoid `.on()` and `.watch()`

- `.on()` creates imperative, hard-to-trace data flow
- `.watch()` creates side effects outside declarative flow
- `sample` provides declarative, testable, and debuggable logic
- Use `.watch()` ONLY as last resort for logging/debugging with detailed explanation

### Additional Effector rules

- Never use `store.getState()` (use `sample` with `source` instead)
- No `forward()` or `guard()` (use `sample`)
- Keep correct options order in `sample`: `{ clock, source, filter, fn, target }`
- No duplicate `.on()` calls on same store

### Form state lives in model, not components

Store form state in Effector stores within the model, not in component local state (React useState). Events should read data from model stores instead of receiving it as payload.

```typescript
// ❌ DON'T pass form data through action payload
export const $clientId = createStore("")
export const $clientSecret = createStore("")
export const apiConnectClicked = createEvent<{ client_id: string; client_secret: string }>()

// Component
const [clientId, setClientId] = useState("")
const [clientSecret, setClientSecret] = useState("")
onClick={() => actions.apiConnectClicked({ client_id: clientId, client_secret: clientSecret })}

// ✅ DO store form state in model, action reads from stores
export const { $formValue, $formErrors, handleChange, handleSubmit } = createEffectorForm({
  defaultValue: { client_id: "", client_secret: "" },
  validationSchema: { /* ... */ },
  submitFormFx: apiConnectFx
})

// Component
const formValue = useUnit($formValue)
onChange={(value) => actions.handleChange({ name: "client_id", value })}
onClick={actions.handleSubmit}
```

## Common Patterns

- Strongly avoid large React components (more than 150 lines). Split logic and UI into smaller components.
- Extract shared logic and UI into reusable components or hooks.
- Move as much business and state logic as possible from React components into Effector models (store, events, effects).
- One file — one React component. Place hooks and helpers in separate files or in shared files.
- If you edit a long component, try to split it into smaller components according to guidelines.
- Use async/await for asynchronous code
- Use arrow functions for concise function expressions
- Use destructuring for cleaner code
- Use template literals for string interpolation
- Use spread operator for arrays and objects
- For React components, use functional components with hooks
- For functions use types of parameters, not type of function
- Don't use `any` type, use `unknown` instead
- Don't use deprecated features or libraries
- Errors from backend send in Russian language

### Creating a new Effector model

```typescript
// api/index.ts
export * as featureApi from "./feature.api";

// models/feature-list/feature-list.model.ts - Business logic
import { attach, createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";
import { featureApi } from "../../api";

// Gate for lifecycle
export const { PageGate, pageOpened } = createGate();

// Stores
export const $data = createStore<DataType[]>([]);
export const $isLoading = featureApi.dataLoadFx.pending;

// Attach effect
export const dataLoadFx = attach({ effect: featureApi.dataLoadFx });

// Events
export const dataChanged = createEvent<DataType[]>();

// Logic - use sample, not .on()
sample({
  clock: pageOpened,
  target: dataLoadFx,
});

sample({
  clock: dataLoadFx.doneData,
  target: $data,
});

// models/feature-list/index.ts
export * as featureListModel from "./feature-list.model";
```
