## Контекст

Перед выполнением прочитать корневой и применимые вложенные `AGENTS.md`,
`docs/subagents.md` и нужные конвенции. Проверить локальный checkout,
`git status --short --branch`, текущую дату и существующие артефакты этой процедуры.
Работа выполняется на этом Mac; Git — `git -C <checkout>`, окружение —
`docs/dev-stack.md` и `docs/qa-docker.md`.

Подготовка Codex, worktree/state, checkpoints и браузер: [runtime.md](runtime.md).
JSON-схема state: [state.schema.json](state.schema.json).

## Задача

Полный сквозной цикл разработки фичи из описания заказчика — с **двумя человеческими чекпоинтами** (после спеки и после макетов) и **автономным** проходом всех остальных шагов:

```
[вход]
  ↓
Фаза 0: создание worktree + state.json
  ↓
Фаза 1: $speckit-specify → ✋ stop: пользователь читает spec.md, говорит правки или approve
  ↓
Фаза 2: mockup-компоненты (React + MUI в финальных местах с TODO) → screenshot через Playwright →
        ✋ stop: пользователь смотрит скриншоты, говорит правки или approve
  ↓
Фаза 3: $speckit-clarify → $speckit-plan → $speckit-tasks (без stop)
  ↓
Фаза 4: $speckit-implement — подключает Effector по TODO, бэк, миграции, тесты (без stop)
  ↓
Фаза 5: code-review loop (cap=5, threshold=50, convergence detector)
        Main диспетчеризует 9 reviewer jobs + scoring → JSON → Main фиксит
  ↓
Фаза 6: manual-QA loop (cap=3; выход раньше, если ничего не найдено или новых сценариев нет)
        browser-QA worker Codex прогоняет $manual-qa (без --fix) → findings.json → Main разбирает и фиксит сам
  ↓
Фаза 7: commit + push в ветку задачи, ожидание CI, финальный отчёт (фазы + остаток QA findings)
        ✋ stop: пользователь решает что делать дальше (фиксить остаток, $news, PR ready)
```

Все sub-agents — **модель Codex по умолчанию + max reasoning effort**, явно прописано в промптах; исключение — браузерный прогон Фазы 6 на модели Codex по умолчанию. Все правки в фазах 5 и 6 — **в основном потоке**, не в sub-agent (контекст уже прогрет, фиксы мелкие). Git: стартовый draft PR в Фазе 1 (`scripts/start-task-pr.mjs`), между фазами коммитов нет, в Фазе 7 — commit + push готовой работы в ветку задачи без вопроса (авторизация явного вызова полного pipeline; см. runtime-протокол). `$news`, `gh pr ready`, merge и деплой — только по команде пользователя.

---

## Парсинг аргументов вызова

Аргументы вызова могут содержать:

1. **Описание фичи** (любой текст) — стартует новый прогон. Описание идёт целиком в `$speckit-specify`.
2. **Пустые аргументы** — два сценария:
   - Если есть активные `state.json` (см. Контекст) — предложить **resume** через checkpoint по runtime-протоколу (см. секцию **Resume**).
   - Если активных state'ов нет — спросить пользователя описание фичи через checkpoint по runtime-протоколу.
3. **`--resume <slug>`** — явно выбрать state, без повторного вопроса о выборе запуска; проверка interrupted/blocked/checkpoint состояния по Resume остаётся.
4. **`--new <описание>`** — явный старт нового прогона, даже если активные state'ы существуют.

Примеры:
- `$auto-feature Добавить страницу со списком счетов и фильтром по периоду`
- `$auto-feature` (нет активных — спросит описание; есть — предложит resume)
- `$auto-feature --resume 030-invoices-list`

---

## State.json — единственный источник правды

Путь: `.codex/workflow/auto-feature/<slug>/state.json` (slug = `feature_slug` после Фазы 1; до Фазы 1 — временный slug из первого хеша/timestamp).

**Схема:**

```json
{
  "schema_version": 1,
  "feature_description": "Добавить страницу со списком счетов...",
  "feature_slug": "030-invoices-list",
  "branch": "codex/030-invoices-list",
  "worktree_path": "<repo>/.worktrees/030-invoices-list",
  "started_at": "2026-05-24T12:00:00Z",
  "updated_at": "2026-05-24T13:45:00Z",
  "current_phase": "implement",
  "phases": [
    {
      "name": "init",
      "status": "completed",
      "started_at": "...", "completed_at": "...",
      "artifacts": [".codex/workflow/auto-feature/030-invoices-list/state.json"],
      "notes": "Worktree created at ..."
    },
    {
      "name": "spec",
      "status": "completed",
      "artifacts": ["specs/030-invoices-list/spec.md"],
      "user_approved": true,
      "user_revisions": ["Добавить фильтр по статусу"]
    },
    { "name": "mockup",  "status": "completed", "artifacts": ["docs/mockups/030-invoices-list/"], "screenshots": [...], "user_approved": true },
    { "name": "plan",    "status": "completed", "artifacts": ["specs/030-invoices-list/plan.md", "specs/030-invoices-list/tasks.md"] },
    { "name": "implement", "status": "in_progress", "artifacts": ["frontend/src/pages/Invoices/...", "backend/src/controllers/invoices/..."] }
  ],
  "review_iterations": [
    { "iter": 1, "json_path": "docs/code-reviews/030-invoices-list/iter-1.json", "findings_before": 12, "findings_applied": 12, "convergence_signature": ["bug:frontend/.../List.tsx:42:Missing-null-check", "..."] }
  ],
  "qa_iterations": [
    { "iter": 1, "context_path": ".codex/workflow/auto-feature/030-invoices-list/qa-context-1.json", "json_path": "docs/manual-qa-reports/2026-05-24-030-invoices-list.findings.json", "findings_new": 7, "fixed": 4, "open": 2, "rejected": 1, "recheck_still_reproduces": 0, "untested": 3 }
  ],
  "qa_covered_scenarios": [ { "id": "P1.1", "title": "..." } ],
  "qa_exit_reason": "clean|exhausted|cap",
  "remaining_qa_findings": [
    { "id": 4, "title": "...", "category": "spec-mismatch", "severity": "medium", "screenshot": "...", "fix_suggestion": "...", "status": "open|rejected", "reason": "нужно решение PO" }
  ]
}
```

**Правила:**
- Каждая запись в `phases[]` появляется при **старте** фазы (`status: in_progress`) и обновляется при завершении.
- `updated_at` обновлять **после каждой записи** в state.json.
- Запись в state.json через Write (полный файл), не append. Это просто и безопасно, файл маленький.
- Перед каждой записью — Read актуальной версии state.json (чтобы не затереть параллельные обновления, хотя в нашем sequential pipeline это не критично).

---

## Карта прогресса для пользователя

Сразу после Фазы 0 создать **семь задач** в карте прогресса по runtime-протоколу — по одной на фазу 1–7. Отмечать `in_progress` при старте фазы, `completed` при завершении. Показывать переходы короткими сообщениями; не выдумывать API прогресс-бара.

```
1. [pending] Спецификация ($speckit-specify) + ✋ approve
2. [pending] Mockups + скриншоты + ✋ approve
3. [pending] Plan / Tasks ($speckit-clarify, $speckit-plan, $speckit-tasks)
4. [pending] Implement ($speckit-implement)
5. [pending] Code-review loop (порог 50, cap 5 итераций)
6. [pending] Manual QA loop (до 3 кругов, прогон browser-QA worker, фиксы в Main)
7. [pending] Финальный отчёт
```

---

## Сквозные принципы оркестрации

1. **Max effort везде** (кроме браузерного прогона Фазы 6). В **каждом** промпте worker явно писать:
   > Operate at **maximum reasoning effort**. Use deep, careful thinking at every step. Quality matters more than speed.
2. **Модель workers наследуется из настроек Codex**. Анализ/код/review/scoring — maximum supported reasoning effort. Browser QA — та же настроенная модель; отдельного выбора более дешёвой модели нет.
3. **Sub-agent промпты самодостаточны.** Включают: цель, ссылки на AGENTS.md и конвенции, текущее состояние (релевантный кусок state.json), ожидаемый формат ответа (JSON или короткий текст).
4. **Возврат от sub-agent — структурированный.** Каждая фаза описывает свой контракт. Текстовые отчёты — короткие, чтобы не съедать контекст Main.
5. **Main делает запись в state.json.** Sub-agent создаёт артефакты, Main фиксирует их в state.
6. **Git только в начале и в конце.** Изоляция и создание `codex/` ветки — по runtime-протоколу, затем `$speckit-specify` создаёт spec с отдельным `feature_slug`. Сразу после создания ветки — стартовый draft PR (Фаза 1, `node scripts/start-task-pr.mjs`): пустой коммит + push + `gh pr create --draft` делает скрипт. Фазы 1–6 не коммитят. Фаза 7 — commit + push в ветку задачи без вопроса и ожидание CI.
7. **При ошибке любой фазы** — записать `phases[i].status = "blocked"`, в `notes` положить причину, прервать pipeline, вывести пользователю сообщение и ждать решений.

---

## Pipeline

### Фаза 0. Worktree + state.json init

**Только если** ещё нет state.json для этого описания фичи (см. Resume).

1. **Сгенерировать временный slug** из первых 30 символов сути описания: latin kebab-case,
   безопасный для пути, например `dobavit-stranicu-schetov-tmp`; при совпадении разных
   задач добавить короткий timestamp/hash. До новой записи найти/import legacy state.
2. **Выбрать или создать worktree** по [runtime-протоколу](runtime.md): основной checkout
   → отдельный `.worktrees/<temporary-slug>` с `codex/<temporary-slug>`; назначенный
   Codex worktree → использовать его, не вкладывать другой. Существующий task state
   → resume в записанном worktree. Подготовить локальные зависимости setup-local.

3. **Создать state-директорию** и записать первичный `state.json`:
   ```
   mkdir -p .codex/workflow/auto-feature/<временный-slug>/
   ```
   ```json
   {
     "schema_version": 1,
     "feature_description": "<описание>",
     "feature_slug": "<временный-slug>",
     "branch": "codex/<временный-slug>",
     "worktree_path": "<проверенный путь checkout>",
     "started_at": "<ISO>",
     "updated_at": "<ISO>",
     "current_phase": "spec",
     "phases": [
       { "name": "init", "status": "completed", "started_at": "...", "completed_at": "...",
         "artifacts": [".codex/workflow/auto-feature/<slug>/state.json"], "notes": "Worktree at ..." }
     ]
   }
   ```
4. Создать **7 задач** в карте прогресса по runtime-протоколу (см. секцию выше).
5. Сообщить пользователю одной строкой: `🚀 Auto-feature: started "<описание>". Worktree: <path>. State: .codex/workflow/auto-feature/<slug>/state.json.`

> **Worktree и Spec Kit:** `$speckit-specify` использует `.specify/scripts/bash/create-new-feature.sh`
> и возвращает отдельные `branch` и `slug`: Git branch может быть `codex/NNN-name`,
> каталог спецификации — `specs/NNN-name/`. Worktree остаётся тем же. После Фазы 1
> обновить реальные поля и переименовать каталог state из temporary slug в точный slug.
> Перед rename проверить, что целевой каталог не занят другой историей; не перезаписывать.
> Для последующих Spec Kit шагов передавать точный `SPECIFY_FEATURE=<slug>`.

---

### Фаза 1. Specification (`$speckit-specify`)

**Цель:** получить `specs/<slug>/spec.md` и пройти human checkpoint.

**Запустить sub-agent через `collaboration.spawn_agent`:**

- роль worker: самостоятельный исполнитель назначенной фазы
- модель Codex из текущих настроек; maximum supported reasoning effort
- `description: "Run speckit.specify and report"`
- Промпт:

```
You are a sub-agent in an auto-feature pipeline. Your single task: invoke $speckit-specify with the provided feature description, let it create the feature branch and spec.md, then return a structured summary.

Operate at MAXIMUM reasoning effort. Read the speckit.specify command file carefully (.agents/skills/speckit-specify/SKILL.md) so you follow it exactly — including its branch/spec creation script and Codex worktree rules.

Feature description (verbatim, from the user):
"""
<описание из state.json>
"""

What to do:
1. Read and follow the corresponding SKILL.md for `speckit.specify` with the description above as the argument.
2. The skill creates/resolves a codex/ branch and a separate NNN-short-name feature slug; it writes specs/<slug>/spec.md. Preserve an explicitly assigned task branch as required by the skill.
3. Read the resulting spec.md.
4. Compose a short summary for the orchestrator.

Return a JSON response (and ONLY this JSON, no other text):

{
  "branch": "<exact branch name speckit created>",
  "slug": "<exact feature-directory name, without codex/>",
  "spec_path": "specs/<slug>/spec.md",
  "summary": "<3-5 sentences: what this feature does, key user stories count, edge cases count, NEEDS_CLARIFICATION marker count>",
  "user_stories_count": N,
  "acceptance_scenarios_count": N,
  "needs_clarification_count": N,
  "checklist_path": "specs/<slug>/checklists/requirements.md",
  "warnings": ["any concerns to surface to the user, or [] if none"]
}

Do NOT invent. If something failed, return:
{ "error": "<one-sentence description>", "stderr_tail": "<last 20 lines of relevant error output>" }
```

**Main принимает JSON:**

1. Если в ответе `error` — записать в state.json (`phases.spec.status="blocked"`, `notes=error`), вывести пользователю, остановить pipeline.
2. **Переименовать state-директорию** (см. примечание про worktree в Фазе 0): `mv .codex/workflow/auto-feature/<временный>/ .codex/workflow/auto-feature/<slug>/`. Обновить state.json (`feature_slug`, `branch`, `phases.spec`).
3. **Открыть draft PR** (default полного pipeline), если PR этой задачи ещё не открыт (публикует только Main): `node scripts/start-task-pr.mjs --title "feat: <короткое название фичи>" --summary "<1–2 предложения из описания>"`. Если фича полностью решает GitHub issue из запроса (`#N` или URL), передать `--closes <N>`, даже если PR уже открыт; полноту повторно проверить перед поставкой: скрипт допишет в тело `Closes #N`, и issue закроется при мерже. Скрипт идемпотентен (при уже открытом PR только допишет сессию и недостающие `Closes #N`), сам делает пустой стартовый коммит и push. `url` из JSON-ответа записать в state.json (`pr_url`) и показать пользователю одной строкой. Если скрипт упал (нет сети/токена) — предупредить одной строкой и продолжить, pipeline не блокировать.
4. Записать в `phases.spec` фактические артефакты.
5. **Обязательный human checkpoint** по [runtime-протоколу](runtime.md):

   ```
   Вопрос: "Спека готова: specs/<slug>/spec.md (M user stories, K acceptance, L edge cases, J вопросов NEEDS_CLARIFICATION). Что дальше?"
   Опции:
   - "Approve — идём к макетам" (Recommended)
   - "Внести правки в спеку"
   - "Отмена pipeline"
   ```

5. Если «Approve» — `phases.spec.user_approved=true`, перейти к Фазе 2.
6. Если «Внести правки» — задать follow-up через checkpoint по runtime-протоколу с `question: "Опиши правки одной фразой"` (без multiSelect). Затем запустить новый worker с инструкцией «прочитай текущий spec.md и внеси такие правки: ...». После — снова показать summary и снова checkpoint. Цикл пока approve или отмена.
7. Если «Отмена» — записать `phases.spec.status="cancelled"`, сообщить пользователю путь к state.json и выйти.

---

### Фаза 2. Mockups + screenshots

**Цель:** реальные React-компоненты в финальных местах (frontend FSD: `pages/`, `features/`) с `// TODO: replace with $store` маркерами и моками вместо стора, плюс набор скриншотов desktop+mobile, ключевые состояния и открытые модалки. После — human checkpoint.

**Запустить sub-agent через `collaboration.spawn_agent`:**

- роль worker: самостоятельный исполнитель назначенной фазы
- модель Codex из текущих настроек; maximum supported reasoning effort
- `description: "Build mockup components and capture screenshots"`
- Промпт:

```
You are a sub-agent. Goal: build mockup React components for the feature described in spec.md and capture screenshots via доступный браузерный инструмент. Operate at MAXIMUM reasoning effort.

Inputs:
- Spec: specs/<slug>/spec.md
- Branch: <branch>
- Project conventions: read docs/conventions/frontend.md BEFORE writing any code. Follow ALL rules (named exports only, type not interface, no any, FSD structure, Effector models as namespaces, etc.).
- AGENTS.md (project root) — read for project-wide rules.

Steps:

0. **Record pre-mockup state** of every existing file you will edit; keep a patch/snapshot for safe rollback of this phase only.

1. **Plan the screens.** From spec.md, identify all user-facing screens this feature introduces or modifies (e.g., list page, detail page, create form, edit modal). Make a short bulleted list (in your thinking, not for output).

If no user-facing UI changes exist, report this explicitly for the mockup checkpoint; do not invent dummy screens.

2. **Write the components in FINAL locations** (frontend/src/pages/<feature>/, frontend/src/features/<feature>/):
   - Real MUI + styled-components from the project, not generic markup.
   - Replace any data normally coming from Effector with HARDCODED mocks defined at the top of the component file.
   - Mark every place that needs a store/event/effect with `// TODO(auto-feature): replace mock with $storeName` comment — these markers will guide Phase 4 implement.
   - Add routes to frontend/src/app/components/AppRoutes/AppRoutes.tsx if needed (with the same TODO marker if a guard presentation is mocked; never weaken a real auth guard).
   - Use the project's existing UI kit (frontend/src/shared/ui/...) wherever possible — do not invent new primitives at this stage.
   - DO NOT write Effector models, DO NOT touch backend, DO NOT write tests yet.

3. **Start the frontend on this CHECKOUT's allocated port.** Get ports, then start CRA in a persistent terminal session; record the handle/PID you own:
   ```
   bash scripts/dev-stack.sh ports          # → JSON with webUrl (e.g. http://localhost:3010)
   bash scripts/dev-stack.sh run-frontend   # persistent terminal session; CRA on the branch's web port
   ```
   Then poll `curl -s -o /dev/null -w "%{http_code}" <webUrl>` until 200 (max ~120 seconds). Use `<webUrl>` as the base URL for all Playwright navigation below. Mockups use mocks (no API), so neither backend nor Docker is needed at this phase. If the server fails — return error JSON immediately.

4. **Screenshots via доступный браузерный инструмент.** For EACH screen and EACH important state, do this sequence:
   a. `browser_navigate` to the route.
   b. `browser_resize` to 1440x900 (desktop) → `browser_take_screenshot` with filename like `01-desktop-list-default.png`.
   c. `browser_resize` to 375x812 (mobile) → screenshot `02-mobile-list-default.png`.
   d. For each KEY state (empty / filled / loading / error / success / opened modal / opened dropdown):
      - Use supported interactions or a dedicated mock fixture toggle to put the UI into that state; evaluate only if the actual browser tool documentation permits it (mocks should support it — toggle a mock flag at top of file if needed).
      - Take desktop + mobile screenshots.
   e. Save all screenshots to `docs/mockups/<slug>/screenshots/`.

5. **Stop only the dev-server process you started** using its recorded session/PID. If the server was already running, leave it untouched.

6. **Write index file** `docs/mockups/<slug>/index.md` with a list of all screenshots and a brief description of each.

Return JSON ONLY:

{
  "screens": [
    {
      "name": "InvoicesList",
      "route": "/invoices",
      "file": "frontend/src/pages/Invoices/Invoices.tsx",
      "states_captured": ["default", "empty", "loading", "filter-applied"],
      "screenshots": [
        "docs/mockups/<slug>/screenshots/01-desktop-list-default.png",
        "docs/mockups/<slug>/screenshots/02-mobile-list-default.png",
        ...
      ]
    }
  ],
  "todo_markers_count": N,
  "files_created": ["frontend/src/pages/Invoices/Invoices.tsx", "frontend/src/pages/Invoices/index.ts", ...],
  "files_modified": ["frontend/src/app/components/AppRoutes/AppRoutes.tsx"],
  "warnings": []
}

If something failed (npm start crashed, Playwright unavailable, etc.):
{ "error": "<one-sentence>", "step_failed": "1|2|3|4|5|6", "details": "..." }
```

**Main принимает JSON:**

1. Если `error` — записать в state.json (`phases.mockup.status="blocked"`), вывести пользователю с указанием шага, спросить (через checkpoint-вопрос): пересоздать mockup-фазу или прервать.
2. Записать в `phases.mockup` файлы и список скриншотов, а также patch/снимок до mockups для возможного согласованного отката.
3. **Обязательный human checkpoint** по [runtime-протоколу](runtime.md):

   ```
   Вопрос: "Макеты готовы: N экранов, M скриншотов в docs/mockups/<slug>/. Открой index.md или сами PNG. Что дальше?"
   Опции:
   - "Approve — переходим к плану и реализации" (Recommended)
   - "Внести правки в макеты"
   - "Откатить макеты и пропустить эту фазу" (если пользователь передумал)
   - "Отмена pipeline"
   ```

4. Approve → переход к Фазе 3.
5. «Правки» → follow-up: `"Опиши правки одной фразой"` → worker с инструкцией доработать компоненты + перефоткать → снова checkpoint. Цикл.
6. «Откатить макеты» → отдельное подтверждение «Удалить созданные mockup-файлы? Это потеря работы». После согласия убрать только файлы/patch этой фазы по inventory, сохранив изменения до mockups и историю state. Не сбрасывать целые существующие файлы. Записать skipped и перейти к Фазе 3.
7. «Отмена» → как в Фазе 1.

---

### Фаза 3. Plan / Tasks (без checkpoint)

**Цель:** прогнать `$speckit-clarify` → `$speckit-plan` → `$speckit-tasks`. Эти команды дописывают `specs/<slug>/` plan.md и tasks.md.

**Запустить sub-agent:**

- модель Codex из текущих настроек; maximum supported reasoning effort
- `description: "Run speckit clarify+plan+tasks"`
- Промпт:

```
You are a sub-agent. Operate at MAXIMUM reasoning effort. Sequentially invoke three skills, in this order:

1. $speckit-clarify — if spec.md still has any unresolved [NEEDS CLARIFICATION] markers OR if the spec contains ambiguities flagged by your own re-read. Resolve the exact feature via SPECIFY_FEATURE. Use the already approved spec and best informed defaults for ordinary unresolved implementation choices; persist every assumed answer in the spec/response. This phase has no extra checkpoint. Do not treat a missing answer as authorization to expand scope or perform an external action.
2. $speckit-plan — use the exact SPECIFY_FEATURE; it reads spec.md.
3. $speckit-tasks — use the exact SPECIFY_FEATURE; it reads spec.md + plan.md.

After each skill, briefly verify the corresponding artifact was created (Read the file's first ~30 lines).

Return JSON ONLY:

{
  "clarify_run": true,
  "clarify_questions_answered": N,
  "plan_path": "specs/<slug>/plan.md",
  "tasks_path": "specs/<slug>/tasks.md",
  "tasks_count": N,
  "tasks_by_phase": { "setup": N, "backend": N, "frontend": N, "tests": N, ... },
  "warnings": []
}

On failure: { "error": "...", "skill_failed": "clarify|plan|tasks" }.
```

**Main:** записать артефакты в state.json. Без user checkpoint. При error — остановить и сообщить.

---

### Фаза 4. Implement (`$speckit-implement`)

**Цель:** прогнать `$speckit-implement` — она по `tasks.md` создаёт код, миграции, тесты. **Важно:** sub-agent должен подключить Effector к mockup-компонентам по TODO-маркерам.

**Запустить sub-agent:**

- модель Codex из текущих настроек; maximum supported reasoning effort
- `description: "Run speckit.implement with Effector wiring"`
- Промпт:

```
You are a sub-agent driving full feature implementation. Operate at MAXIMUM reasoning effort.

Context:
- Spec: specs/<slug>/spec.md
- Plan: specs/<slug>/plan.md
- Tasks: specs/<slug>/tasks.md
- Mockup TODO markers count: <N from phases.mockup or 0 if skipped>
- Conventions (MANDATORY before writing each layer):
  - frontend: read docs/conventions/frontend.md
  - backend: read docs/conventions/backend.md
  - frontend tests: read docs/conventions/frontend-testing.md
  - backend tests: read docs/conventions/backend-testing.md
- Project rules: read root AGENTS.md + any nested AGENTS.md in folders you modify.

Steps:

1. **Run $speckit-implement by reading and following the corresponding SKILL.md.** It iterates through tasks.md. Let it create services, controllers, routes, Prisma migrations, Effector models, tests, etc.

2. **Wire Effector into mockup components** (if mockups exist): run `rg "TODO\(auto-feature\)" frontend/src` across frontend/src/, and for each marker:
   a. Read the file.
   b. Look at the mocked data shape.
   c. Find or create the matching Effector store/event/effect (this is part of $speckit-implement, but verify it landed; if not — add it following the conventions).
   d. Replace mock with `useUnit($store)` / event call / effect call. Remove the TODO comment.
   e. Remove the hardcoded mock from the top of the file.
   f. Read the conventions file again if you forgot a rule — no `useEffect` for fetching, no `<form>` tags, type not interface, named exports.

3. **Run tests** for the changed code:
   - Backend: `bash scripts/dev-stack.sh test-backend --testPathPatterns=<relevant-path>` (per current conventions).
   - Frontend: `npm --prefix frontend test -- <relevant-path>` (vitest, per current conventions).
   - Fix what fails.

4. **Run lint & types:**
   - `npm --prefix frontend run lint` (fix violations).
   - `npm --prefix backend run build` (must pass — strict TS).

5. **Run `$changelog --worktree <worktree_path>`** to update CHANGELOG.md (per project rule). Do NOT run $news yet — that's a user decision at Phase 7.

Return JSON ONLY:

{
  "implement_completed": true,
  "tasks_done": N, "tasks_skipped": [<ids with reason>],
  "files_created": [...], "files_modified": [...], "migrations_added": [...],
  "tests_added": [...],
  "lint_clean": true,
  "tsc_clean": true,
  "test_results": { "backend": "passed|failed", "frontend": "passed|failed" },
  "todo_markers_remaining": N,
  "warnings": []
}

On failure: { "error": "...", "step_failed": "implement|wiring|tests|lint|tsc|changelog", "tail": "<last error output>" }.
```

**Main:**

1. Если `error` — записать blocked, остановить, сообщить пользователю с указанием шага и хвостом ошибки.
2. Если `todo_markers_remaining > 0` — записать warning в state, но продолжить.
3. Если тесты не прошли — записать blocked. Дальше идти нельзя — сначала фиксы.
4. Записать артефакты, перейти к Фазе 5.

---

### Фаза 5. Code-review loop

**Цель:** прогнать `$code-review-local --threshold 50` в цикле, фиксить findings в основном потоке, до пустого результата или convergence detector. Cap = 5 итераций.

> **БЕЗ КОММИТОВ между итерациями.** `$code-review-local` рассматривает объединение
> committed diff, tracked working-tree изменений и релевантных новых файлов; индекс
> пользователя не меняется. Все исправления остаются в рабочем дереве до Фазы 7.
> Не делать `git add -N`, `git reset`, commit/amend и не обходить hooks делегированием.

**Логика цикла (в Main):**

```
iter = 1
prev_signatures = []
while iter <= 5:
  1. Main dispatch → $code-review-local --silent --threshold 50 --iter <iter>
     → возвращает путь к JSON
  2. Main: Read JSON
  3. Если findings.length === 0 и review coverage complete → BREAK (success); иначе записать incomplete coverage warning, не считать clean
  4. Compute signatures = sorted list of "<category>:<file>:<line_start>:<title-first-30-chars>"
  5. Если signatures == prev_signatures (или overlap ≥80%; определение ниже) → BREAK (convergence)
     записать в state.json `convergence_detected: true`
  6. Main применяет фиксы (см. ниже)
  7. Записать в state.review_iterations[iter]
  8. prev_signatures = signatures
  9. iter += 1
```

**Диспетчеризация review без лишнего waiting-worker:**

Main читает `.agents/skills/code-review-local/SKILL.md` и выполняет её orchestration
с аргументами `--silent --threshold 50 --iter <N> --feature <slug> --worktree <path>`:
отдельные девять reviewer jobs, затем независимый scorer для каждого кандидата.
Очередь ограничена реальными слотами Codex; все используют настроенную модель и max
reasoning effort. Это сохраняет независимость девяти углов, не занимая слот wrapper,
который лишь ждёт. Результат фазы: `{ "json_path": "<path>/docs/code-reviews/<slug>/iter-<N>.json" }`.
Main читает JSON, проверяет схему и статусы всех reviewers/scorers; провал покрытия
не считать чистым ревью, даже если `findings` пуст. Роль `claude-md` в JSON v1 — legacy
имя для проверки нынешнего AGENTS.md/конвенций, а не ссылка на отсутствующий файл.

**Сходимость и журнал:** подпись точно `<category>:<file>:<line_start>:<title-first-30-chars>`;
сортировать и дедуплицировать. Для двух непустых наборов overlap = размер пересечения /
`current.length`; одинаковые наборы дают 100%. Сравнивать только
с предыдущим законченным проходом. Записать `review_iterations` и report path даже
для clean/convergence/cap, сохранить `convergence_detected`, exit reason и все
неисправленные/failed findings. При resume продолжать номера, не затирать iter JSON.

**Main применяет фиксы (в основном потоке, НЕ в sub-agent):**

Для каждого finding из JSON (отсортированных по score DESC):

1. Read целевого файла (file + строки вокруг line_start/line_end).
2. Перечитать `docs/conventions/<frontend|backend>.md` (релевантные).
3. Если категория `bug` или `claude-md` или `security` — **обязательно** добавить regression-тест (frontend → vitest, backend → jest), кроме случая когда баг чисто-визуальный без логики.
4. Edit правка по `fix_hint`. Минимальная — без попутного рефакторинга.
5. Прогнать релевантные тесты + lint (для frontend) / tsc (для backend) для затронутого файла.
6. Если тест/линт упал после фикса — попробовать вторично доработать. Если снова не получилось — **откатить только правку этой попытки** по сохранённому patch/снимку, сохранив прежние изменения, записать в state.review_iterations[iter].failed_fixes этот finding, продолжить.
7. После всех фиксов итерации — обновить state.json.

**После цикла (либо success, либо convergence, либо cap=5):**

- Записать в state.json `phases.review`.
- Если convergence или cap — это **warning** в финальном отчёте Фазы 7, но pipeline продолжается к Фазе 6.

> **Почему фиксы в Main, а не в sub-agent:** обсуждено с пользователем. Контекст Main уже прогрет фичей, фиксы обычно мелкие (≤5 строк), холодный sub-agent на каждую итерацию был бы дороже по токенам и медленнее. Также — единый sub-agent на все фиксы итерации мог бы согласовывать решения по диагонали финдингов, в Main мы делаем их по очереди явно.

---

### Фаза 6. Manual QA loop (до 3 кругов)

**Цель:** прогнать фичу в браузере кругами. Прогон в браузере делает отдельный QA-worker с моделью Codex из текущих настроек через `$manual-qa` **без** `--fix`: он только тестирует и пишет отчёт. Находки разбирает и чинит Main, как фиксы ревью в Фазе 5. Следующий круг перепроверяет исправленное и берёт ещё не пройденные сценарии.

> **БЕЗ КОММИТОВ**, как в Фазе 5. `bash scripts/qa-stack.sh up` пересобирает образы из рабочего дерева (`up --build`), поэтому каждый круг видит фиксы прошлого; БД стека между кругами сохраняется.

**Логика цикла (в Main):**

```
iter = 1
covered = []     # сценарии, пройденные в прошлых кругах: { id, title }
recheck = []     # находки, исправленные Main в прошлом круге, с шагами воспроизведения
known = []       # находки, которые Main не чинит: open (нужно решение / не вышло) и rejected (не подтвердились)
while iter <= 3:
  1. Main пишет .codex/workflow/auto-feature/<slug>/qa-context-<iter>.json:
     { iteration: iter, recheck, covered_scenarios: covered, known_open_findings: known }
  2. Sub-agent (browser-QA worker) → $manual-qa --context <path> → краткий JSON с путём к findings.json
  3. Main: Read findings.json; merge covered with coverage.scenarios (pass|fail|warn), unique by id and title
  4. recheck_results со статусом still_reproduces → вторая попытка фикса; снова не вышло → в known (open)
  5. Main разбирает новые findings (см. ниже) → fixed | open | rejected
  6. Записать state.qa_iterations[iter], state.qa_covered_scenarios = covered
  7. Выход:
     - новых findings нет и ни одна перепроверка не still_reproduces → BREAK (clean)
     - coverage.untested пуст и в этом круге ничего не исправлено → BREAK (exhausted:
       все сценарии пройдены в прошлых кругах, перепроверять нечего, нового не потестить)
  8. recheck = исправленные в этом круге (шаги и expected из findings.json); iter += 1
```

**Продолжение QA и атомарный checkpoint каждого круга.** На новом запуске
начальные iter/covered/recheck/known задаются как ниже; при resume их не обнулять.
До dispatch сохранять в state `qa_cursor: {iteration, stage, context_path,
covered_scenarios, recheck, known_open_findings, finding_decisions}`. `stage`:
`prepared | reported | fixing | round_complete`; после отчёта добавить paths и
после каждого решения/фикса атомарно записывать disposition (fixed/open/rejected),
причину, затронутые файлы/проверки и точные шаги следующего recheck. В конце круга
одной записью сохранить qa_iterations, covered, known и qa_pending_recheck, затем
следующий iteration. Не перезаписывать прежний qa-context-N.json: записанный контекст
переиспользуется только для того же ещё не выполненного круга, новые круги получают
следующий свободный номер. Resume после completed round начинает следующий; после
reported/fixing продолжает разбор записанного отчёта и решений, не запускает повторно
браузер и не считает фиксы проверенными без recheck. Если legacy state содержит
только counts без решений и невозможно восстановить результат из patch/report,
зафиксировать неопределённость и согласовать точечный recheck; не делать вид, что
все исправленные находки перепроверены. Auto-bug-fix наследует этот же протокол.

`clean` означает отсутствие новых находок и повторного воспроизведения в данном круге; известные open/rejected и непройденные сценарии всё равно остаются в отчёте. Не объявлять полное покрытие только из-за clean.

После 3-го круга исправленное в нём не перепроверяется браузером — это `cap`; его покрывают регрессионные тесты фиксов. Записать `qa_exit_reason`.

**Sub-agent для прогона:**

- модель Codex из текущих настроек для browser QA
- `description: "Run manual-qa iter N"`
- Промпт (без строки про max effort: шаги механические, на высоком effort они только дороже):

```
Single task: invoke the $manual-qa skill with arguments `--context <path to qa-context-N.json>` and let it do the full run.
Do NOT pass --fix and do NOT edit any source code: you test and report, the orchestrator fixes.

Pre-checks:
- Ensure Docker is running (`docker info`). $manual-qa boots its own isolated per-branch QA stack
  (`bash scripts/qa-stack.sh up`) — do NOT start dev servers on :3000/:3001 for it.
  If Docker is down — abort and report (the user must start Docker Desktop).

Be precise in findings: exact steps, expected vs actual, a screenshot, the file/line if you can see it.
Do not report what you could not observe yourself.

After $manual-qa completes, leave the QA stack up (default behaviour).

Return JSON ONLY:

{
  "report_md_path": "docs/manual-qa-reports/<date>-<report-slug>[-N].md",
  "findings_json_path": "docs/manual-qa-reports/<date>-<report-slug>[-N].findings.json",
  "readiness": "green|yellow|red",
  "scenarios_run": N,
  "untested": N,
  "new_findings": N,
  "recheck": { "fixed": N, "still_reproduces": N }
}

On failure: { "error": "...", "details": "..." }
```

**Main разбирает находки (в основном потоке, по severity DESC):**

1. **Подтвердить.** browser-QA worker может ошибиться: Read скриншоты находки и код по `file`/`line_hint`, найти причину. Не подтверждается ни кодом, ни скриншотом — `rejected` с причиной (в `known`, чтобы следующий круг не репортил снова; в финальном отчёте отдельной строкой).
2. **Решить, чинить ли.** Флаг `unambiguous_fix` от прогона — подсказка, решает Main по критериям Этапа 6 `$manual-qa` («Что чинить» / «Что НЕ чинить»: без миграций, смены API-контрактов, архитектурных перестановок и решений PO). Не подходит — `open` с причиной, без вопроса пользователю (pipeline автономный, остаток уходит в Фазу 7).
3. **Починить** как фикс ревью в Фазе 5: перечитать `docs/conventions/*.md`, минимальная правка, регрессионный тест для `bug` и `spec-mismatch` (кроме чисто визуального без логики), тесты + lint/tsc затронутого. Две неудачные попытки — откатить только правку этой попытки по сохранённому patch/снимку, `open`.

**После цикла:** `remaining_qa_findings` = все `open` и `rejected`; `remaining_qa_untested` сохраняет `coverage.untested` последнего круга (не смешивать несовместимые записи в одном массиве). Итоговый отчёт включает оба. Также сохранить `qa_pending_recheck` для fixes последнего cap-круга, не проверенных браузером. `cap` — warning в отчёте Фазы 7, pipeline продолжается.

> **Почему прогон browser-QA worker, а фиксы в Main:** прогон — это navigate/click/snapshot по чек-листу, сильная модель там почти ничего не добавляет, а стоит в разы дороже и медленнее. Разбор и починка требуют понимания причины и соседних сценариев — это делает Main, у которого контекст фичи уже прогрет.

---

### Фаза 7. Commit + push, CI, финальный отчёт

**Цель:** закоммитить и запушить проверенную работу в ветку задачи (не спрашивая), дождаться CI, напечатать сводку всего pipeline и список того, что осталось решить.

Main делает:

1. Прочитать актуальный state.json.
2. **Commit + push** (внутри worktree): `git add` код фичи, тесты, миграции, `specs/<slug>/`, CHANGELOG.md, `docs/code-reviews/<slug>/` и md-отчёты manual-qa; НЕ добавлять `.codex/workflow/auto-feature/`, скриншоты (`docs/**/screenshots/`) и `.playwright-mcp/`. Коммит в стиле `feat(<область>): <суть>` (тело — что сделано). Pre-commit хук упал — исправить причину и закоммитить снова, `--no-verify` не использовать. Затем `git push origin <branch>`.
Перед финальным commit выполнить все затронутые checks: для frontend/backend кода `npm run check -- --full`; для scripts/tooling — `npm run test:scripts`, для landing — lint/test/build в landing, для изменённых E2E — соответствующий Playwright scope. Не называть их пройденными без результата. Обновить changelog по конечному diff (включая review/QA fixes).
3. **CI:** дождаться завершения чеков PR (`gh pr checks <pr>` ограниченными ожиданиями до исчезновения `pending`; сопоставить checks с текущим pushed HEAD, не принять результат старого commit). Упало — `gh run view <run-id> --log-failed`, починить, новый коммит + push, ждать снова (до 3 циклов исправления CI после исходного запуска; дальше — blocked с хвостом лога).
4. Записать в state.json `commit` (hash) и `ci` (итог чеков).
5. Сформировать **компактный отчёт** в чат:

```markdown
# 🏁 Auto-feature complete — <slug>

**Worktree:** <path>
**Branch:** <branch>
**Spec:** specs/<slug>/spec.md

## Фазы

| # | Фаза | Статус | Артефакты |
|---|---|---|---|
| 1 | Specification | ✅ | spec.md, M stories, K scenarios |
| 2 | Mockups | ✅ | N экранов, M скриншотов |
| 3 | Plan/Tasks | ✅ | plan.md, tasks.md (N задач) |
| 4 | Implement | ✅ | X файлов, Y миграций, Z тестов; lint+tsc clean |
| 5 | Code-review loop | ✅ / ⚠️ convergence | N итераций, M findings зафикшено |
| 6 | Manual QA loop | ✅ clean / ✅ exhausted / ⚠️ cap | N кругов, K сценариев, J находок исправлено, R осталось |
| 7 | Commit + CI | ✅ | <hash>, чеки PR зелёные |

## Что осталось решить руками

<если remaining_qa_findings пусто>
✨ Ничего — все находки исправлены.

<иначе — таблица>
| # | Severity | Категория | Заголовок | Где | Статус и причина | Что предлагает QA |
|---|---|---|---|---|---|---|
| 1 | high | spec-mismatch | ... | frontend/.../X.tsx | open: нужно решение PO | ... |

<если остались непройденные сценарии (coverage.untested) — список одной строкой>

Скриншоты остатков — в docs/manual-qa-reports/<date>-<report-slug>[-N]/screenshots/

## Дальше — твои решения

- Просмотр диффа: `git -C <worktree_path> diff main`
- Фикс остатков: дать мне инструкцию какие пункты выше править
- PR (<pr_url>, draft): `$news` или ready только по следующей явной команде; при обновлении PR сохранить секцию «Сессии Codex» и обоснованные `Closes #N`
- Очистка mockup-кода: если фаза 2 запускалась, убедись что нет оставшихся `TODO(auto-feature)` (проверь rg — у меня в state.implement.todo_markers_remaining = X)
- State: .codex/workflow/auto-feature/<slug>/state.json

✋ Жду твоего следующего хода.
```

6. Отметить все 7 задач карты прогресса как `completed` (если ещё не отмечены).
7. **НЕ удалять** state.json — он остаётся для возможного resume / истории.

---

## Resume

Если аргументы вызова пустые и есть активные state.json, или передан `--resume <slug>`:

1. **Без флага** — спросить через checkpoint по runtime-протоколу:
   ```
   "Найдены активные auto-feature-запуски. Что сделать?"
   - "Resume <slug-1> (фаза X)"
   - "Resume <slug-2> (фаза Y)"
   - "Начать новый прогон"
   - "Только посмотреть state (без действий)"
   ```
2. **При resume** — Read state.json, определить `current_phase`, выполнить шаги:
   - Если `current_phase` имеет фазу со статусом `in_progress` — спросить "Возобновить с этой фазы?" — если да, запустить её sub-agent заново.
   - Если фаза `blocked` — показать `notes` ошибки и спросить "Попробовать снова или пропустить?".
   - Если все фазы `completed` — показать финальный отчёт ещё раз.
3. Проверить checkout и legacy history по runtime.md; все команды выполнять с workdir=`worktree_path`, Git с `-C`. Не создавать вложенный worktree.
4. Если Фаза 1 пройдена и есть ветка задачи `codex/...` — `node scripts/start-task-pr.mjs --title "feat: <название>"`: откроет PR, если его нет, или допишет текущую сессию в существующий.

---

## Ограничения

- **Commit/push — только в Фазе 7** (сам, без вопроса) и стартовый `node scripts/start-task-pr.mjs` (Фаза 1 и Resume). Не коммитить между фазами, не push в `main`, без force-push, без `gh pr create` / `gh pr ready` / merge.
- **Не запускать `$news`.** Его делает пользователь перед PR (подготовка новостей и тем более запись в БД — отдельный запрошенный шаг).
- **Не запускать deploy** (`/deploy`, GH Actions trigger).
- **Не удалять worktree.** Это решение пользователя после мержа.
- **Не запускать $e2e-check автоматически.** Он создаёт черновики тестов — это отдельный шаг по запросу пользователя после ревью.
- **Не пропускать конвенции.** Каждый sub-agent в фазах 2, 4 обязан прочитать docs/conventions/* перед написанием кода.
- **Не отвечать пользователю длинно.** В чат — только то что просит phase (sub-agent summary), checkpoint-вопрос на checkpoint, финальный отчёт. Между фазами достаточно одной строки `→ Фаза N: <название>...`.
- **При cap=5 в review loop** — это **не ошибка**, а warning. Зацикливание может означать спорные стилистические выборы, не блокирует PR. Сообщить пользователю в Фазе 7. То же для cap=3 в QA loop.
- **Если worktree уже существует** — проверять и использовать его через workdir/-C, без второго экземпляра и вложения.
