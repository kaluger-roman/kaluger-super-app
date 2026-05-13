# Ускорение тестов — Research Report — 2026-05-10

> Worktree: `worktree-test-speedup-research-2026-05-10`
> Цель: найти способы дополнительно ускорить прогон тестов локально и в CI

---

## Что реализовано в этом worktree (Phase 1 + Phase 2, без изменений в тестах)

| # | Файл | Изменение | Эффект |
|---|---|---|---|
| F1 | `frontend/vitest.config.ts` | Добавлен `deps.optimizer.web.include` для MUI/router/effector/date-fns | −20…−27% локально |
| F5 | `frontend/src/__tests__/setup.ts` | Удалён MSW (`server.listen`/`resetHandlers`/`close`) — он подгружался для всех 124 файлов, но **ни один тест не регистрирует handlers** (грепнули `server.use` — 0 совпадений). Все API-тесты используют `vi.mock("@shared/api/base")` | aggregated setup: 42s → 29s (**−31%**) |
| B1 | `backend/jest.config.js` | `ts-jest` → **`@swc/jest` + `@swc-contrib/mut-cjs-exports@14.x` (wasm-плагин)**. Также fix опечатки `setupFilesAfterEach` → `setupFilesAfterEnv` — оригинальный setup.ts фактически не загружался | **38s → 14–18s, −53…−62%** |
| C1–C7 | `.github/workflows/ci.yml` | Backend matrix shards `[1,2]`; backend typecheck вынесен в отдельный job; vitest blob reporter + merge-reports job; кэш `node_modules/.vite` и Prisma client; `--maxWorkers=2` для GH 2-vCPU runners | Backend CI ≈2× быстрее за счёт параллелизма; FE CI стабильнее с merge-reports |

### Решённая в Phase 2 проблема `@swc/jest` + `spyOn`

Изначально `@swc/jest` падал на 8 тестах с `TypeError: Cannot redefine property` (`backup.test.ts`, `updateLesson.test.ts`, `reminderProcessor.test.ts`). SWC помечает CJS `exports.foo` как `configurable: false`, а `jest.spyOn` использует `Object.defineProperty`.

Стандартный фикс — wasm-плагин `swc_mut_cjs_exports` — старая версия (≤10.7.0) **несовместима** с `@swc/core@1.15.x`. **Найдено решение**: пакет переехал в `@swc-contrib/mut-cjs-exports`, версия `14.x` поддерживает `@swc/core ^1.10.0`. С ним все тесты проходят.

### Что НЕ реализовано (Phase 3 — требует рефакторинга тестов)

- **B4 (jest-prisma transactions)**: пробовал `@quramy/jest-prisma`, прогон **3.3s** (!), но 41 файл падает с `Transaction already closed` в `afterAll(() => prisma.lesson.deleteMany(...))`. Все тесты с `before/afterAll deleteMany` несовместимы с автоматическим rollback per-test. Требует переписывания 30+ файлов: убрать ручной cleanup, перенести `create` из `beforeAll` в `it`. Откатил.
- **F-isolate**: `--no-isolate` после удаления MSW даёт **24s wall (−79%)**, но 160 тестов падают из-за глобального state в Effector-сторах. Требует фикса cleanup-pattern в model-тестах.

---

## TL;DR

**Frontend (vitest 4.0.15)** — текущий baseline 113s wall (1574 теста, 123 файла).
- 🟢 **Quick win**: `deps.optimizer.web.include` → 91s (-20%) без побочек.
- 🟢 **Quick win**: `vitest --reporter=blob` + `--merge-reports` в CI вместо параллельных запусков без агрегации.
- 🟡 **Big win, требует рефакторинга**: `isolate: false` → 19.6s (-83%), но в текущем виде роняет 134 теста (Effector-сторы, MSW state протекают между тестами).
- 🟡 **Setup-time**: 42s aggregated на setup. `setupFiles` грузит MSW для всех файлов, даже unit-тестов без http.

**Backend (jest 30 + ts-jest)** — измерить локально не удалось (нет .env.test и docker daemon выключен). Анализ конфигурации:
- 🟢 **Quick win**: ts-jest → @swc/jest. Вне-проектные бенчмарки: 5–10× transform speedup, 40% быстрее CI на средних проектах.
- 🟡 **Альтернатива**: оставить ts-jest, но включить `isolatedModules: true`.
- 🟡 **Шардинг в CI**: matrix `[1/3, 2/3, 3/3]` — backend сейчас не шардирован (frontend уже да).
- 🔴 **Большой выигрыш, но рефакторинг**: per-worker isolated schemas или transaction-rollback стратегия — устраняет `deleteMany`-cleanup и позволяет реальный parallel.
- 🟢 Postgres-сервис в CI: `tmpfs` для `/var/lib/postgresql/data` (опция `--mount type=tmpfs`).

**CI (.github/workflows/ci.yml)**:
- 🟢 Кэшировать `frontend/node_modules/.vite` между запусками (vitest cache + dep optimizer cache).
- 🟢 Backend matrix sharding (см. выше).
- 🟢 Vitest blob reporter agg вместо 3 независимых прогонов.
- 🟡 `concurrency: cancel-in-progress` уже включён ✓; `paths-filter` уже есть ✓.

---

## Замеренный baseline (frontend, локально на 8 ядрах)

| Опция | Wall time | CPU time | Pass/Fail | Δ vs default |
|---|---|---|---|---|
| **default** (`forks` pool, isolate=true) | **113.19s** | 681s (5.99× cores) | ✅ 1574/1574 | — |
| `--pool=threads` | 116.19s | 637s | ❌ 1489 + 2 startup errors | -3% (worse) |
| `--pool=vmThreads` | 116.40s | 530s | ❌ 1500 + 4 fails, 7 file errors | -3% (worse) |
| `--maxWorkers=8` | 105.90s | 680s (6.38× cores) | ✅ 1574/1574 | **+6%** |
| `--no-isolate` | **19.62s** | 89s | ❌ 1440 + 134 fails | **+83%** (но ломает) |
| `deps.optimizer.web.include` (MUI/etc) | **90.91s** | 597s (6.53× cores) | ✅ 1574/1574 | **+20%** ⭐ |

**Профиль одного UI-теста** (`ForgotPasswordPage.test.tsx`): 2.81s, из них **import = 2.41s** (86%). На простом utility-тесте (`dateFormat.test.ts`): 433ms total, import = 29ms. Узкое место — повторный обход графа модулей MUI/router/effector в каждом из ~80 UI-тестов.

**Распределение времени default-прогона (123 файла)**:
- import: **599s aggregate** (90% всей работы)
- setup: 42.7s (MSW server.listen + jest-dom + cleanup wiring × 123)
- environment: 45.9s (happy-dom × 123)
- tests: 66.8s (реальный код тестов)
- transform: 10.6s (esbuild)

> Ремарка: `pool: threads` падает с `ERR_WORKER_INIT_FAILED` — где-то в зависимостях есть код, несовместимый с `worker_threads` (типичный кандидат — нативный аддон в Prisma client или `pg` cookie / тестовый код, который реквайрит Node-only fs API). Не использовать для FE.

---

## Frontend — рекомендации

### 1. ⭐ `deps.optimizer.web.include` для тяжёлых пакетов (Impact: High, Effort: Small)

**Что**: Предбандлить тяжёлые библиотеки через esbuild в один файл, вместо обхода десятков ESM-модулей на каждый testfile.

**Эффект**: −22.3s wall, −115s aggregated import (-20%).

**Diff** в `frontend/vitest.config.ts`:
```ts
test: {
  // ...existing config...
  deps: {
    optimizer: {
      web: {
        enabled: true,
        include: [
          "@mui/material",
          "@mui/icons-material",
          "@mui/system",
          "@mui/x-date-pickers",
          "@emotion/react",
          "@emotion/styled",
          "react-router-dom",
          "react-big-calendar",
          "effector-react",
          "patronum",
          "date-fns",
        ],
      },
    },
  },
}
```

**Почему работает**: Vite по умолчанию для каждого файла идёт по ESM-graph и трансформирует каждый модуль отдельно. Optimizer один раз бандлит указанный пакет в IIFE через esbuild. Для MUI с тысячами компонентов это драматичная разница.

**Риски**: иногда optimizer ломает пакеты с CJS/ESM-смесью — убрать пакет из списка.

---

### 2. ⭐ Vitest blob reporter в CI sharding (Impact: High, Effort: Small)

**Что**: Сейчас каждый из 3 шардов выводит свой результат (123/3 ≈ 41 файла на shard). Если shard упал — нет агрегированного результата. Vitest 2+ умеет писать `--reporter=blob` и потом сливать.

**Diff** в `.github/workflows/ci.yml`:
```yaml
frontend-tests:
  strategy:
    matrix:
      shard: [1/3, 2/3, 3/3]
  steps:
    # ...
    - name: Tests (shard ${{ matrix.shard }})
      run: cd frontend && npx vitest --run --reporter=blob --shard=${{ matrix.shard }}
    - name: Upload blob report
      uses: actions/upload-artifact@v4
      with:
        name: blob-${{ strategy.job-index }}
        path: frontend/.vitest-reports/
        include-hidden-files: true

frontend-tests-merge:
  needs: frontend-tests
  if: always()
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
        cache-dependency-path: frontend/package-lock.json
    - run: cd frontend && npm ci
    - uses: actions/download-artifact@v4
      with:
        path: frontend/.vitest-reports
        pattern: blob-*
        merge-multiple: true
    - run: cd frontend && npx vitest --merge-reports
```

**Эффект**: Не ускоряет сами тесты, но даёт стабильный агрегированный отчёт + дешёвый ретрай только сломавшегося шарда.

---

### 3. 🟢 Vitest cache в CI (Impact: Medium, Effort: Small)

**Что**: Vite пишет depCache в `node_modules/.vite/`. При `cache: npm` GitHub Actions она затирается каждый раз, потому что `node_modules` не кэшируется (только `~/.npm`).

**Diff** в `.github/workflows/ci.yml` после `npm ci`:
```yaml
- name: Cache vite optimizer
  uses: actions/cache@v4
  with:
    path: frontend/node_modules/.vite
    key: vite-${{ runner.os }}-${{ hashFiles('frontend/package-lock.json', 'frontend/vitest.config.ts') }}
    restore-keys: |
      vite-${{ runner.os }}-
```

**Эффект**: Первый прогон без кэша, последующие — экономия 10–20s на старте каждого шарда.

> Замечание: в Vitest 4 есть **experimental** `experimental.fsModuleCache` для file-system кэша между прогонами. Можно протестировать в отдельном PR.

---

### 4. 🟢 maxWorkers tuning (Impact: Low, Effort: Trivial)

**Что**: Локально `--maxWorkers=8` дал +6% (105 vs 113s). На GH-runners (2 vCPU) дефолт может быть избыточным.

**Diff** в CI:
```yaml
run: cd frontend && npx vitest --run --shard=${{ matrix.shard }} --maxWorkers=2
```

**Эффект**: На 2-vCPU runner снижает контеншн контекст-свитча. Замерить — экономия 5–10%.

---

### 5. 🟡 Setup-файл перетягивает MSW на все 123 теста (Impact: Medium, Effort: Medium)

`src/__tests__/setup.ts` подгружает MSW server для каждого теста, включая чистые юниты. MSW тащит `interceptors`, `@mswjs/cookies`, undici-патчи.

**Что предложить**: разделить два setup-файла:
- `setup.unit.ts` — только `@testing-library/jest-dom/vitest` + `cleanup`.
- `setup.integration.ts` — то же + MSW.

И через `projects` (vitest 3+) или `test.workspace`:
```ts
test: {
  workspace: [
    {
      extends: true,
      test: {
        name: "unit",
        include: ["src/**/__tests__/*.{model,helpers,hooks,api}.test.ts"],
        setupFiles: ["./src/__tests__/setup.unit.ts"],
      },
    },
    {
      extends: true,
      test: {
        name: "integration",
        include: ["src/**/__tests__/*.test.tsx", "src/**/api/__tests__/*.test.ts"],
        setupFiles: ["./src/__tests__/setup.ts"],
      },
    },
  ],
}
```

**Эффект**: −15–25s на setup в среднем прогоне. Вторая выгода — unit-проект можно крутить с `isolate: false`.

---

### 6. 🟡 Effector-stores → `isolate: false` в unit-проекте (Impact: High, Effort: High)

`--no-isolate` дал бы 5.7× ускорение, но 134 теста падают. Причина — модули с `createStore(...)` создают **синглтон**, и состояние утекает между тестами в одном worker-process.

**Что нужно**: договориться о паттерне `beforeEach(() => clearStore())` или использовать `effector/fork` (`fork()` создаёт новый scope, тесты прогоняются в нём).

Это большая работа (~1574 теста ревью), но потенциал — frontend-CI сократится с 2 минут до 30s. Имеет смысл, если станет узким местом deploy-pipeline. Сейчас можно оставить как backlog.

---

## Backend — рекомендации

### 1. ⭐ ts-jest → @swc/jest (Impact: High, Effort: Small)

**Что**: ts-jest гоняет полный TypeScript-компилятор на каждый файл. `@swc/jest` — то же самое, но через Rust (не делает type-check).

**Diff** в `backend/package.json`:
```json
"devDependencies": {
  "@swc/core": "^1.10.0",
  "@swc/jest": "^0.2.39"
}
```

`backend/jest.config.js`:
```js
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true },
      },
    }],
  },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEach: ["<rootDir>/src/__tests__/setup.ts"],
};
```

**Эффект (по бенчмаркам Jest+TS из доков SWC и нескольких блогов)**: 5–10× transform speedup, в реальном CI — обычно −30…−50% wall time.

**Trade-off**: тип-чек не выполняется в jest. У вас уже есть отдельный `npm run build` в CI (`Type check`), так что покрыто.

---

### 2. 🟢 Если не хочется SWC — isolatedModules в ts-jest (Impact: Medium, Effort: Trivial)

```js
preset: "ts-jest",
globals: { "ts-jest": { isolatedModules: true } },
```

**Эффект**: 30–50% ускорение transform. Меньше, чем SWC, но и риска меньше.

---

### 3. ⭐ Backend sharding в CI (Impact: High, Effort: Small)

Сейчас `backend` job — один runner, все 51 файлов последовательно через jest worker pool.

**Diff** в `.github/workflows/ci.yml`:
```yaml
backend:
  strategy:
    matrix:
      shard: [1/2, 2/2]   # 2-3 шарда оптимально для 51 файла
  # ...тот же setup БД...
  steps:
    # ...
    - name: Tests (shard ${{ matrix.shard }})
      run: cd backend && npx jest --shard=${{ matrix.shard }}
```

**Caveat**: каждый shard поднимает свою копию postgres-сервиса (это уже происходит в matrix), что добавляет ~10s setup на каждый shard. Но параллельный прогон с лихвой компенсирует.

**Эффект**: ~2× ускорение wall-time для backend job.

---

### 4. 🟡 Per-worker isolated schemas (Impact: High, Effort: Medium)

Сейчас все Jest workers идут в один `tutor_test` через `prisma.user.create / deleteMany`. С увеличением workers (`--maxWorkers=4`) тесты начинают блокировать друг друга на одних и тех же FK.

**Стратегия**: использовать `JEST_WORKER_ID` в `setup.ts`, создавать схему `test_w_${id}` и натравливать Prisma на неё.

```ts
// backend/src/__tests__/setup.ts
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const schema = `test_w_${process.env.JEST_WORKER_ID ?? "1"}`;
const baseUrl = process.env.DATABASE_URL!;
process.env.DATABASE_URL = `${baseUrl}?schema=${schema}`;

beforeAll(() => {
  execSync(`npx prisma migrate deploy`, { env: process.env });
});
```

**Эффект**: можно поднять `--maxWorkers` до 4–8 без race conditions. На локальной машине ускорение 2–4×.

> ⚠️ Альтернатива дешевле и без миграций: **transaction-rollback пер тест** (`@quramy/jest-prisma` или ручной `$transaction` с throw). Каждый тест работает в транзакции, после теста — rollback. Cleanup-deletemany вообще исчезает.

---

### 5. 🟢 `tmpfs` для Postgres в CI (Impact: Low-Medium, Effort: Trivial)

GH service-контейнеры не имеют опции `tmpfs:` напрямую, но можно поднять postgres как step:

```yaml
- name: Run Postgres on tmpfs
  run: |
    docker run -d --name pg \
      --tmpfs /var/lib/postgresql/data:rw \
      -e POSTGRES_USER=testuser \
      -e POSTGRES_PASSWORD=testpass \
      -e POSTGRES_DB=tutor_test \
      -p 5432:5432 \
      postgres:16
```

**Эффект**: для тестов, которые делают тысячи INSERT/DELETE — экономия 10–20% на disk-I/O. На гулком CI-runner с медленными SSD — больше.

> Для backend-тестов с per-worker schemas + transactions это уже не критично, БД становится CPU-bound.

---

### 6. 🟢 Кэш Prisma generated client (Impact: Low, Effort: Trivial)

```yaml
- name: Cache Prisma generated client
  uses: actions/cache@v4
  with:
    path: |
      backend/node_modules/.prisma
      backend/node_modules/@prisma/client
    key: prisma-${{ runner.os }}-${{ hashFiles('backend/prisma/schema.prisma') }}
```

**Эффект**: −5…−10s на step `Prisma generate` если schema не менялась.

---

### 7. 🟢 Параллелить `Type check` + `Tests` (Impact: Low, Effort: Trivial)

Сейчас в backend job шаги последовательны: `prisma generate → migrate → build (tsc) → test`. `tsc` ничего не знает про БД, его можно параллельно с тестами в отдельном job.

```yaml
backend-typecheck:
  needs: changes
  if: needs.changes.outputs.backend == 'true'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
    - run: cd backend && npm ci
    - run: cd backend && npx prisma generate
    - run: cd backend && npm run build

backend-tests:
  # ...текущий backend job минус "Type check" step...
```

**Эффект**: −20…−30s wall-time backend job (зависит от размера build).

---

## CI — сводный план

| # | Изменение | Job | Impact | Effort |
|---|---|---|---|---|
| C1 | Vitest blob + merge-reports | frontend-tests | Качество отчётов | S |
| C2 | actions/cache for `node_modules/.vite` | frontend-tests | −10–20s/shard | S |
| C3 | `--maxWorkers=2` для GH 2-vCPU runners | frontend-tests | −5% | S |
| C4 | Backend matrix sharding `[1/2, 2/2]` | backend | ≈2× | S |
| C5 | actions/cache for `.prisma/client` | backend | −5–10s | S |
| C6 | Параллельный `backend-typecheck` job | backend | −20–30s | S |
| C7 | Postgres on tmpfs (если оставлять deleteMany) | backend | −5–15% | S |
| C8 | Larger runners (`runs-on: ubuntu-latest-4-cores`) | all | пропорционально | $$$ |

---

## Приоритезированный roadmap (по соотношению impact/effort)

### Phase 1 — Quick wins (1–2 часа, без изменений в тестах)

1. **F1**: `deps.optimizer.web.include` в `vitest.config.ts` — −20% локально, −10–15% в CI.
2. **B1**: ts-jest → @swc/jest — −30…−50% backend.
3. **C4**: backend matrix sharding `[1/2, 2/2]` — ещё ≈2× backend в CI.
4. **C2**: vitest cache в CI.
5. **C5**: prisma client cache.
6. **C6**: backend-typecheck отдельный job.

> Ожидаемый итог: backend CI с ~Xs до ~X/3s, frontend CI — стабильнее с merge-reports.

### Phase 2 — Medium-effort оптимизации (1–2 дня)

7. **F5**: Разделить vitest workspace на unit/integration с разными setupFiles.
8. **B4 (transactions)**: переход на `@quramy/jest-prisma` или ручной transaction-rollback. Убираем все `deleteMany`.

### Phase 3 — Major refactor (под потребность)

9. **F6**: `isolate: false` для unit-проекта + миграция Effector-стeров на `fork()`-pattern или явный cleanup. 5× для unit-тестов.

---

## Что точно НЕ делать

- ❌ `pool: threads` в frontend — падает с `ERR_WORKER_INIT_FAILED` на текущих depes.
- ❌ `pool: vmThreads` — медленнее и нестабильно.
- ❌ Глобальный `isolate: false` сейчас — 134 теста падают, надо чинить cleanup.
- ❌ `--shard` без `--reporter=blob`+merge — теряете консистентный отчёт.
- ❌ pg-mem / pglite вместо реального PG — рискуете дивергировать поведение (миграции могут пройти, а реальный PG-baз — нет).

---

## Источники

- [Vitest — Improving Performance](https://vitest.dev/guide/improving-performance)
- [Vitest — Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)
- [Vitest — Parallelism](https://vitest.dev/guide/parallelism)
- [Vitest discussions — Slow tests in GH Actions](https://github.com/vitest-dev/vitest/discussions/9683)
- [SWC — @swc/jest](https://swc.rs/docs/usage/jest)
- [Speeding up TypeScript Jest Tests: ts-jest VS vitest VS @swc/jest](https://www.jameslmilner.com/posts/speeding-up-typescript-jest-tests/)
- [Switching a Jest Project from Babel to SWC](https://www.joshuakgoldberg.com/blog/jest-babel-to-swc/)
- [Prisma — Integration Testing docs](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [How to Run Jest Integration Tests in Parallel Using Isolated SQL Schemas](https://medium.com/@sebastinchikn/how-to-run-jest-integration-tests-in-parallel-using-isolated-sql-schemas-f4c5e534030a)
- [Speedy Prisma and PostgreSQL Integration Tests](https://selimb.hashnode.dev/speedy-prisma-pg-tests)
- [@quramy/jest-prisma](https://github.com/Quramy/jest-prisma)
- [Blacksmith — How to run Jest tests faster in GitHub Actions](https://www.blacksmith.sh/blog/how-to-run-jest-tests-faster-in-github-actions)
- [How to speed up Vitest — BuildPulse](https://buildpulse.io/blog/how-to-speed-up-vitest)
- [vitest-profiler](https://github.com/kettanaito/vitest-profiler)
