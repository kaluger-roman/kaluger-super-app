---
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(jq:*), Bash(rm:*), Bash(test:*), Bash(echo:*), Bash(npm:*), Bash(curl:*), Bash(pkill:*), Bash(lsof:*), Bash(docker:*), Bash(bash scripts/dev-stack.sh:*), Bash(bash scripts/qa-stack.sh:*), Read, Write, Edit, Glob, Grep, Agent, EnterWorktree, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, Skill
description: Сквозной оркестратор разработки фичи. Создаёт worktree, гонит speckit-pipeline, делает mockups со скриншотами, code-review-loop с порогом 50 и manual-qa с автофиксом — с двумя human checkpoint'ами (после спеки и после макетов).
---

## Контекст

- Сегодня: !`date -u +%Y-%m-%dT%H:%M:%SZ`
- Текущая ветка: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`
- Активные state-файлы: !`ls -t .claude/auto-feature/*/state.json 2>/dev/null | head -5 || echo "(нет активных запусков)"`

## Задача

Полный сквозной цикл разработки фичи из описания заказчика — с **двумя человеческими чекпоинтами** (после спеки и после макетов) и **автономным** проходом всех остальных шагов:

```
[вход]
  ↓
Фаза 0: создание worktree + state.json
  ↓
Фаза 1: /speckit.specify → ✋ stop: пользователь читает spec.md, говорит правки или approve
  ↓
Фаза 2: mockup-компоненты (React + MUI в финальных местах с TODO) → screenshot через Playwright →
        ✋ stop: пользователь смотрит скриншоты, говорит правки или approve
  ↓
Фаза 3: /speckit.clarify → /speckit.plan → /speckit.tasks (без stop)
  ↓
Фаза 4: /speckit.implement — подключает Effector по TODO, бэк, миграции, тесты (без stop)
  ↓
Фаза 5: code-review loop (cap=5, threshold=50, convergence detector)
        Sub-agent делает /code-review-local → JSON → Main парсит и фиксит сам
  ↓
Фаза 6: /manual-qa --fix — sub-agent чинит однозначные, собирает остаток
  ↓
Фаза 7: финальный отчёт пользователю (фазы + остаток QA findings)
        ✋ stop: пользователь решает что делать дальше (фиксить, коммитить, PR)
```

Все sub-agents — **opus + max reasoning effort**, явно прописано в промптах. Все правки в фазе 5 — **в основном потоке**, не в sub-agent (контекст уже прогрет, фиксы мелкие). Все git/PR операции — **только по команде пользователя в Фазе 7**, никаких commit/push автоматически.

---

## Парсинг `$ARGUMENTS`

`$ARGUMENTS` может содержать:

1. **Описание фичи** (любой текст) — стартует новый прогон. Описание идёт целиком в `/speckit.specify`.
2. **Пустой** — два сценария:
   - Если есть активные `state.json` (см. Контекст) — предложить **resume** через `AskUserQuestion` (см. секцию **Resume**).
   - Если активных state'ов нет — спросить пользователя описание фичи через `AskUserQuestion`.
3. **`--resume <slug>`** — явный resume конкретного state по slug фичи (без вопросов).
4. **`--new <описание>`** — явный старт нового прогона, даже если активные state'ы существуют.

Примеры:
- `/auto-feature Добавить страницу со списком счетов и фильтром по периоду`
- `/auto-feature` (нет активных — спросит описание; есть — предложит resume)
- `/auto-feature --resume 030-invoices-list`

---

## State.json — единственный источник правды

Путь: `.claude/auto-feature/<slug>/state.json` (slug = `feature_slug` после Фазы 1; до Фазы 1 — временный slug из первого хеша/timestamp).

**Схема:**

```json
{
  "schema_version": 1,
  "feature_description": "Добавить страницу со списком счетов...",
  "feature_slug": "030-invoices-list",
  "branch": "030-invoices-list",
  "worktree_path": "/Volumes/.../.claude/worktrees/030-invoices-list",
  "started_at": "2026-05-24T12:00:00Z",
  "updated_at": "2026-05-24T13:45:00Z",
  "current_phase": "implement",
  "phases": [
    {
      "name": "init",
      "status": "completed",
      "started_at": "...", "completed_at": "...",
      "artifacts": [".claude/auto-feature/030-invoices-list/state.json"],
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
    { "iter": 1, "json_path": "docs/manual-qa-reports/2026-05-24-030-invoices-list.findings.json", "findings_total": 7, "autofix_applied": 5, "remaining": 2 }
  ],
  "remaining_qa_findings": [
    { "id": 4, "title": "...", "category": "spec-mismatch", "severity": "medium", "screenshot": "...", "fix_suggestion": "...", "needs_decision": "PO" }
  ]
}
```

**Правила:**
- Каждая запись в `phases[]` появляется при **старте** фазы (`status: in_progress`) и обновляется при завершении.
- `updated_at` обновлять **после каждой записи** в state.json.
- Запись в state.json через Write (полный файл), не append. Это просто и безопасно, файл маленький.
- Перед каждой записью — Read актуальной версии state.json (чтобы не затереть параллельные обновления, хотя в нашем sequential pipeline это не критично).

---

## TaskCreate — карта прогресса для пользователя

Сразу после Фазы 0 создать **семь задач** через `TaskCreate` — по одной на фазу 1–7. Mark each as `in_progress` when starting that phase, `completed` when finished. Это даёт пользователю наглядный прогресс-бар в UI.

```
1. [pending] Спецификация (/speckit.specify) + ✋ approve
2. [pending] Mockups + скриншоты + ✋ approve
3. [pending] Plan / Tasks (/speckit.clarify, /speckit.plan, /speckit.tasks)
4. [pending] Implement (/speckit.implement)
5. [pending] Code-review loop (порог 50, cap 5 итераций)
6. [pending] Manual QA (--fix) — автофикс однозначных, сбор остатка
7. [pending] Финальный отчёт
```

---

## Сквозные принципы оркестрации

1. **Max effort везде.** В **каждом** промпте `Agent` явно писать:
   > Operate at **maximum reasoning effort**. Use deep, careful thinking at every step. Quality matters more than speed.
2. **Sub-agents всегда `model: "opus"`** (если не указано иное в конкретной фазе — см. Фаза 5, scorer'ы там через `code-review-local` запускают Haiku сами).
3. **Sub-agent промпты самодостаточны.** Включают: цель, ссылки на CLAUDE.md и конвенции, текущее состояние (релевантный кусок state.json), ожидаемый формат ответа (JSON или короткий текст).
4. **Возврат от sub-agent — структурированный.** Каждая фаза описывает свой контракт. Текстовые отчёты — короткие, чтобы не съедать контекст Main.
5. **Main делает запись в state.json.** Sub-agent создаёт артефакты, Main фиксирует их в state.
6. **Никаких автоматических git-операций** (commit / push / branch создание вручную). Worktree-создание делается через `EnterWorktree`, ветку для фичи делает `/speckit.specify` своим скриптом.
7. **При ошибке любой фазы** — записать `phases[i].status = "blocked"`, в `notes` положить причину, прервать pipeline, вывести пользователю сообщение и ждать решений.

---

## Pipeline

### Фаза 0. Worktree + state.json init

**Только если** ещё нет state.json для этого описания фичи (см. Resume).

> **Перед стартом:** `EnterWorktree` — deferred tool. Если он отсутствует в текущей сессии — сначала загрузить его schema через `ToolSearch` с query `select:EnterWorktree`. То же для `TaskCreate`, `TaskUpdate`, `AskUserQuestion`, `EnterWorktree` если они не подгружены.

1. **Сгенерировать временный slug** из первых 30 символов описания: kebab-case, безопасный для пути. Например `Добавить страницу счетов` → `dobavit-stranicu-schetov-tmp`.
2. **Создать worktree** через `EnterWorktree` с `name: "<временный-slug>"`. Worktree создастся в `.claude/worktrees/<временный-slug>/` на новой ветке (того же имени).
3. **Создать state-директорию** и записать первичный `state.json`:
   ```
   mkdir -p .claude/auto-feature/<временный-slug>/
   ```
   ```json
   {
     "schema_version": 1,
     "feature_description": "<описание>",
     "feature_slug": "<временный-slug>",
     "branch": "<временный-slug>",
     "worktree_path": "<путь от EnterWorktree>",
     "started_at": "<ISO>",
     "updated_at": "<ISO>",
     "current_phase": "spec",
     "phases": [
       { "name": "init", "status": "completed", "started_at": "...", "completed_at": "...",
         "artifacts": [".claude/auto-feature/<slug>/state.json"], "notes": "Worktree at ..." }
     ]
   }
   ```
4. Создать **7 задач** через `TaskCreate` (см. секцию выше).
5. Сообщить пользователю одной строкой: `🚀 Auto-feature: started "<описание>". Worktree: <path>. State: .claude/auto-feature/<slug>/state.json.`

> **Важно про worktree-vs-speckit:** speckit.specify в Фазе 1 сам создаст новую ветку формата `NNN-short-name` через `.specify/scripts/bash/create-new-feature.sh`. В worktree это сработает как обычный `git checkout -b`: worktree остаётся, ветка меняется. После Фазы 1 — обновить в state.json поля `feature_slug` и `branch` на реальные значения, **переименовать директорию state**: `mv .claude/auto-feature/<временный-slug>/ .claude/auto-feature/<реальный-slug>/`.

---

### Фаза 1. Specification (`/speckit.specify`)

**Цель:** получить `specs/<slug>/spec.md` и пройти human checkpoint.

**Запустить sub-agent через `Agent`:**

- `subagent_type: "general-purpose"`
- `model: "opus"`
- `description: "Run speckit.specify and report"`
- Промпт:

```
You are a sub-agent in an auto-feature pipeline. Your single task: invoke /speckit.specify with the provided feature description, let it create the feature branch and spec.md, then return a structured summary.

Operate at MAXIMUM reasoning effort. Read the speckit.specify command file carefully (.claude/commands/speckit.specify.md) so you follow it exactly — including the branch-creation script.

Feature description (verbatim, from the user):
"""
<описание из state.json>
"""

What to do:
1. Use the Skill tool to invoke `speckit.specify` with the description above as the argument.
2. The skill will create a branch (NNN-short-name format) and write specs/<branch>/spec.md.
3. Read the resulting spec.md.
4. Compose a short summary for the orchestrator.

Return a JSON response (and ONLY this JSON, no other text):

{
  "branch": "<exact branch name speckit created>",
  "slug": "<same as branch>",
  "spec_path": "specs/<branch>/spec.md",
  "summary": "<3-5 sentences: what this feature does, key user stories count, edge cases count, NEEDS_CLARIFICATION marker count>",
  "user_stories_count": N,
  "acceptance_scenarios_count": N,
  "needs_clarification_count": N,
  "checklist_path": "specs/<branch>/checklists/requirements.md",
  "warnings": ["any concerns to surface to the user, or [] if none"]
}

Do NOT invent. If something failed, return:
{ "error": "<one-sentence description>", "stderr_tail": "<last 20 lines of relevant error output>" }
```

**Main принимает JSON:**

1. Если в ответе `error` — записать в state.json (`phases.spec.status="blocked"`, `notes=error`), вывести пользователю, остановить pipeline.
2. **Переименовать state-директорию** (см. примечание про worktree в Фазе 0): `mv .claude/auto-feature/<временный>/ .claude/auto-feature/<branch>/`. Обновить state.json (`feature_slug`, `branch`, `phases.spec`).
3. Записать в `phases.spec` фактические артефакты.
4. **Human checkpoint** через `AskUserQuestion`:

   ```
   Вопрос: "Спека готова: specs/<branch>/spec.md (M user stories, K acceptance, L edge cases, J вопросов NEEDS_CLARIFICATION). Что дальше?"
   Опции:
   - "Approve — идём к макетам" (Recommended)
   - "Внести правки в спеку"
   - "Отмена pipeline"
   ```

5. Если «Approve» — `phases.spec.user_approved=true`, перейти к Фазе 2.
6. Если «Внести правки» — задать follow-up через `AskUserQuestion` с `question: "Опиши правки одной фразой"` (без multiSelect). Затем запустить новый Agent с инструкцией «прочитай текущий spec.md и внеси такие правки: ...». После — снова показать summary и снова checkpoint. Цикл пока approve или отмена.
7. Если «Отмена» — записать `phases.spec.status="cancelled"`, сообщить пользователю путь к state.json и выйти.

---

### Фаза 2. Mockups + screenshots

**Цель:** реальные React-компоненты в финальных местах (frontend FSD: `pages/`, `features/`) с `// TODO: replace with $store` маркерами и моками вместо стора, плюс набор скриншотов desktop+mobile, ключевые состояния и открытые модалки. После — human checkpoint.

**Запустить sub-agent через `Agent`:**

- `subagent_type: "general-purpose"`
- `model: "opus"`
- `description: "Build mockup components and capture screenshots"`
- Промпт:

```
You are a sub-agent. Goal: build mockup React components for the feature described in spec.md and capture screenshots via Playwright MCP. Operate at MAXIMUM reasoning effort.

Inputs:
- Spec: specs/<branch>/spec.md
- Branch: <branch>
- Project conventions: read docs/conventions/frontend.md BEFORE writing any code. Follow ALL rules (named exports only, type not interface, no any, FSD structure, Effector models as namespaces, etc.).
- CLAUDE.md (project root) — read for project-wide rules.

Steps:

1. **Plan the screens.** From spec.md, identify all user-facing screens this feature introduces or modifies (e.g., list page, detail page, create form, edit modal). Make a short bulleted list (in your thinking, not for output).

2. **Write the components in FINAL locations** (frontend/src/pages/<feature>/, frontend/src/features/<feature>/):
   - Real MUI + styled-components from the project, not generic markup.
   - Replace any data normally coming from Effector with HARDCODED mocks defined at the top of the component file.
   - Mark every place that needs a store/event/effect with `// TODO(auto-feature): replace mock with $storeName` comment — these markers will guide Phase 4 implement.
   - Add routes to frontend/src/app/components/AppRoutes/AppRoutes.tsx if needed (with the same TODO marker if guard logic is mocked).
   - Use the project's existing UI kit (frontend/src/shared/ui/...) wherever possible — do not invent new primitives at this stage.
   - DO NOT write Effector models, DO NOT touch backend, DO NOT write tests yet.

3. **Start dev server on the BRANCH ports** (parallel auto-features must not fight over :3000). Get the branch's port slot, then start CRA via the dev-stack wrapper with `run_in_background: true`:
   ```
   bash scripts/dev-stack.sh ports          # → JSON with webUrl (e.g. http://localhost:3010)
   bash scripts/dev-stack.sh run-frontend   # run_in_background; CRA on the branch's web port
   ```
   Then poll `curl -s -o /dev/null -w "%{http_code}" <webUrl>` until 200 (max ~120 seconds). Use `<webUrl>` as the base URL for all Playwright navigation below. Mockups use mocks (no API), so neither backend nor Docker is needed at this phase. If the server fails — return error JSON immediately.

4. **Screenshots via Playwright MCP.** For EACH screen and EACH important state, do this sequence:
   a. `mcp__playwright__browser_navigate` to the route.
   b. `mcp__playwright__browser_resize` to 1440x900 (desktop) → `mcp__playwright__browser_take_screenshot` with filename like `01-desktop-list-default.png`.
   c. `mcp__playwright__browser_resize` to 375x812 (mobile) → screenshot `02-mobile-list-default.png`.
   d. For each KEY state (empty / filled / loading / error / success / opened modal / opened dropdown):
      - Use evaluate or click/type to put the UI into that state (mocks should support it — toggle a mock flag at top of file if needed).
      - Take desktop + mobile screenshots.
   e. Save all screenshots to `docs/mockups/<branch>/screenshots/`.

5. **Stop dev server** when done: find PID via `lsof -i :<web port>` and kill, or use the run_in_background's KillShell.

6. **Write index file** `docs/mockups/<branch>/index.md` with a list of all screenshots and a brief description of each.

Return JSON ONLY:

{
  "screens": [
    {
      "name": "InvoicesList",
      "route": "/invoices",
      "file": "frontend/src/pages/Invoices/Invoices.tsx",
      "states_captured": ["default", "empty", "loading", "filter-applied"],
      "screenshots": [
        "docs/mockups/<branch>/screenshots/01-desktop-list-default.png",
        "docs/mockups/<branch>/screenshots/02-mobile-list-default.png",
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

1. Если `error` — записать в state.json (`phases.mockup.status="blocked"`), вывести пользователю с указанием шага, спросить (через AskUserQuestion): пересоздать mockup-фазу или прервать.
2. Записать в `phases.mockup` файлы и список скриншотов.
3. **Human checkpoint** через `AskUserQuestion`:

   ```
   Вопрос: "Макеты готовы: N экранов, M скриншотов в docs/mockups/<branch>/. Открой index.md или сами PNG. Что дальше?"
   Опции:
   - "Approve — переходим к плану и реализации" (Recommended)
   - "Внести правки в макеты"
   - "Откатить макеты и пропустить эту фазу" (если пользователь передумал)
   - "Отмена pipeline"
   ```

4. Approve → переход к Фазе 3.
5. «Правки» → follow-up: `"Опиши правки одной фразой"` → Agent с инструкцией доработать компоненты + перефоткать → снова checkpoint. Цикл.
6. «Откатить макеты» → подтверждение через AskUserQuestion `"Удалить созданные mockup-файлы? Это потеря работы."` → если да: `git checkout -- <files>` и `rm -rf docs/mockups/<branch>/`, переход к Фазе 3 без mockup-артефактов.
7. «Отмена» → как в Фазе 1.

---

### Фаза 3. Plan / Tasks (без checkpoint)

**Цель:** прогнать `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks`. Эти команды дописывают `specs/<branch>/` plan.md и tasks.md.

**Запустить sub-agent:**

- `model: "opus"`
- `description: "Run speckit clarify+plan+tasks"`
- Промпт:

```
You are a sub-agent. Operate at MAXIMUM reasoning effort. Sequentially invoke three skills, in this order:

1. /speckit.clarify — if spec.md still has any unresolved [NEEDS CLARIFICATION] markers OR if the spec contains ambiguities flagged by your own re-read. Pass no arguments. If the skill needs answers, use your best informed defaults (note them in the response) — do not block.
2. /speckit.plan — pass no arguments; it reads spec.md.
3. /speckit.tasks — pass no arguments; it reads spec.md + plan.md.

After each skill, briefly verify the corresponding artifact was created (Read the file's first ~30 lines).

Return JSON ONLY:

{
  "clarify_run": true,
  "clarify_questions_answered": N,
  "plan_path": "specs/<branch>/plan.md",
  "tasks_path": "specs/<branch>/tasks.md",
  "tasks_count": N,
  "tasks_by_phase": { "setup": N, "backend": N, "frontend": N, "tests": N, ... },
  "warnings": []
}

On failure: { "error": "...", "skill_failed": "clarify|plan|tasks" }.
```

**Main:** записать артефакты в state.json. Без user checkpoint. При error — остановить и сообщить.

---

### Фаза 4. Implement (`/speckit.implement`)

**Цель:** прогнать `/speckit.implement` — она по `tasks.md` создаёт код, миграции, тесты. **Важно:** sub-agent должен подключить Effector к mockup-компонентам по TODO-маркерам.

**Запустить sub-agent:**

- `model: "opus"`
- `description: "Run speckit.implement with Effector wiring"`
- Промпт:

```
You are a sub-agent driving full feature implementation. Operate at MAXIMUM reasoning effort.

Context:
- Spec: specs/<branch>/spec.md
- Plan: specs/<branch>/plan.md
- Tasks: specs/<branch>/tasks.md
- Mockup TODO markers count: <N from phases.mockup or 0 if skipped>
- Conventions (MANDATORY before writing each layer):
  - frontend: read docs/conventions/frontend.md
  - backend: read docs/conventions/backend.md
  - frontend tests: read docs/conventions/frontend-testing.md
  - backend tests: read docs/conventions/backend-testing.md
- Project rules: read root CLAUDE.md + any nested CLAUDE.md in folders you modify.

Steps:

1. **Run /speckit.implement via the Skill tool.** It iterates through tasks.md. Let it create services, controllers, routes, Prisma migrations, Effector models, tests, etc.

2. **Wire Effector into mockup components** (if mockups exist): grep for `TODO(auto-feature)` across frontend/src/, and for each marker:
   a. Read the file.
   b. Look at the mocked data shape.
   c. Find or create the matching Effector store/event/effect (this is part of /speckit.implement, but verify it landed; if not — add it following the conventions).
   d. Replace mock with `useUnit($store)` / event call / effect call. Remove the TODO comment.
   e. Remove the hardcoded mock from the top of the file.
   f. Read the conventions file again if you forgot a rule — no `useEffect` for fetching, no `<form>` tags, type not interface, named exports.

3. **Run tests** for the changed code:
   - Backend: `cd backend && npm test -- --testPathPattern=<relevant-path>` (per CLAUDE.md memory).
   - Frontend: `cd frontend && npm run test -- <relevant-path>` (vitest, per CLAUDE.md memory).
   - Fix what fails.

4. **Run lint & types:**
   - `cd frontend && npm run lint` (fix violations).
   - `cd backend && npm run build` (must pass — strict TS).

5. **Run `/changelog`** to update CHANGELOG.md (per project rule). Do NOT run /news yet — that's a user decision at Phase 7.

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

**Цель:** прогнать `/code-review-local --threshold 50` в цикле, фиксить findings в основном потоке, до пустого результата или convergence detector. Cap = 5 итераций.

> **БЕЗ КОММИТОВ.** `/code-review-local` сам автоопределяет режим: если на ветке нет коммитов (как здесь — `/auto-feature` не коммитит до Фазы 7), он ревьюит **рабочее дерево** (`git add -N` + `git diff <base>` + `git reset`). Поэтому Main в Фазе 5 **НЕ** делает `git commit`/`git amend` между итерациями — фиксы просто остаются в рабочем дереве, и следующая итерация ревьюит их как есть. Это убирает permission-промпты на `git commit`. (Если в main-сессии нужны команды вроде `curl`/`lsof` — делегируй сабагенту: changelog-hook может ложно блокировать их в main-сессии, пока CHANGELOG не в коммите; npm/git/node/echo работают.)

**Логика цикла (в Main):**

```
iter = 1
prev_signatures = []
while iter <= 5:
  1. Sub-agent → /code-review-local --silent --threshold 50 --iter <iter>
     → возвращает путь к JSON
  2. Main: Read JSON
  3. Если findings.length === 0 → BREAK (success)
  4. Compute signatures = sorted list of "<category>:<file>:<line_start>:<title-first-30-chars>"
  5. Если signatures == prev_signatures (или ≥80% совпадает) → BREAK (convergence)
     записать в state.json `convergence_detected: true`
  6. Main применяет фиксы (см. ниже)
  7. Записать в state.review_iterations[iter]
  8. prev_signatures = signatures
  9. iter += 1
```

**Sub-agent для review (тонкая обёртка):**

- `model: "opus"`
- `description: "Run code-review-local iter N"`
- Промпт:

```
Operate at MAXIMUM reasoning effort. Single task: invoke /code-review-local skill with arguments:
  --silent --threshold 50 --iter <N> --feature <slug>

The skill will write JSON to docs/code-reviews/<slug>/iter-<N>.json and print only that path to stdout.

Return ONLY: { "json_path": "<path printed by skill>" }
```

**Main применяет фиксы (в основном потоке, НЕ в sub-agent):**

Для каждого finding из JSON (отсортированных по score DESC):

1. Read целевого файла (file + строки вокруг line_start/line_end).
2. Перечитать `docs/conventions/<frontend|backend>.md` (релевантные).
3. Если категория `bug` или `claude-md` или `security` — **обязательно** добавить regression-тест (frontend → vitest, backend → jest), кроме случая когда баг чисто-визуальный без логики.
4. Edit правка по `fix_hint`. Минимальная — без попутного рефакторинга.
5. Прогнать релевантные тесты + lint (для frontend) / tsc (для backend) для затронутого файла.
6. Если тест/линт упал после фикса — попробовать вторично доработать. Если снова не получилось — **откатить** (`git checkout -- <file>`), записать в state.review_iterations[iter].failed_fixes этот finding, продолжить.
7. После всех фиксов итерации — обновить state.json.

**После цикла (либо success, либо convergence, либо cap=5):**

- Записать в state.json `phases.review`.
- Если convergence или cap — это **warning** в финальном отчёте Фазы 7, но pipeline продолжается к Фазе 6.

> **Почему фиксы в Main, а не в sub-agent:** обсуждено с пользователем. Контекст Main уже прогрет фичей, фиксы обычно мелкие (≤5 строк), холодный sub-agent на каждую итерацию был бы дороже по токенам и медленнее. Также — единый sub-agent на все фиксы итерации мог бы согласовывать решения по диагонали финдингов, в Main мы делаем их по очереди явно.

---

### Фаза 6. Manual QA loop (`/manual-qa --fix`)

**Цель:** прогнать `/manual-qa --fix` через sub-agent (он умеет Playwright и сам чинит однозначные). Получить `findings.json`, записать остаток в state.

**Sub-agent:**

- `model: "opus"`
- `description: "Run manual-qa --fix"`
- Промпт:

```
Operate at MAXIMUM reasoning effort. Single task: invoke /manual-qa skill with argument `--fix` and let it do the full run.

Pre-checks:
- Ensure Docker is running (`docker info`). /manual-qa boots its own isolated per-branch QA stack
  (`bash scripts/qa-stack.sh up`) — do NOT start dev servers on :3000/:3001 for it.
  If Docker is down — abort and report (the user must start Docker Desktop).

After /manual-qa completes:
- It writes both an MD report and a findings.json next to it.
- Read the findings.json.
- Leave the QA stack up (default /manual-qa behaviour) — the user may want to re-check by hand.

Return JSON ONLY:

{
  "report_md_path": "docs/manual-qa-reports/<date>-<branch>.md",
  "findings_json_path": "docs/manual-qa-reports/<date>-<branch>.findings.json",
  "readiness": "green|yellow|red",
  "coverage": { "total": N, "passed": N, "failed": N, "warned": N },
  "summary": {
    "total_findings": N,
    "by_severity": {...},
    "autofix_applied": N,
    "autofix_failed": N,
    "remaining": N
  },
  "remaining_findings_compact": [
    { "id": ..., "title": ..., "category": ..., "severity": ..., "unambiguous_fix": false, "fix_suggestion": "..." }
  ],
  "started_dev_servers": true|false
}

On failure: { "error": "...", "details": "..." }
```

**Main:**

1. Если error — записать blocked, сообщить.
2. Записать в state.qa_iterations + `remaining_qa_findings = remaining_findings_compact`.
3. Перейти к Фазе 7.

> **Можно ли повторять QA?** На текущей итерации — нет. /manual-qa уже сам чинит однозначные внутри одного запуска. Повторные запуски (если пользователь захочет после Фазы 7) — отдельная команда.

---

### Фаза 7. Финальный отчёт

**Цель:** напечатать пользователю сводку всего pipeline и список того, что осталось решить. Никаких git/PR действий.

Main делает:

1. Прочитать актуальный state.json.
2. Сформировать **компактный отчёт** в чат:

```markdown
# 🏁 Auto-feature complete — <slug>

**Worktree:** <path>
**Branch:** <branch>
**Spec:** specs/<branch>/spec.md

## Фазы

| # | Фаза | Статус | Артефакты |
|---|---|---|---|
| 1 | Specification | ✅ | spec.md, M stories, K scenarios |
| 2 | Mockups | ✅ | N экранов, M скриншотов |
| 3 | Plan/Tasks | ✅ | plan.md, tasks.md (N задач) |
| 4 | Implement | ✅ | X файлов, Y миграций, Z тестов; lint+tsc clean |
| 5 | Code-review loop | ✅ / ⚠️ convergence | N итераций, M findings зафикшено |
| 6 | Manual QA | ✅ | K сценариев, J автофиксов, R осталось |

## Что осталось решить руками

<если remaining_qa_findings пусто>
✨ Ничего — все находки автофикснуты.

<иначе — таблица>
| # | Severity | Категория | Заголовок | Где | Что предлагает QA |
|---|---|---|---|---|---|
| 1 | high | spec-mismatch | ... | frontend/.../X.tsx | ... |

Скриншоты остатков — в docs/manual-qa-reports/<date>-<branch>/screenshots/

## Дальше — твои решения

- Просмотр диффа: `git -C <worktree_path> diff main`
- Фикс остатков: дать мне инструкцию какие пункты выше править
- Коммит: `/commit-commands:commit` (внутри worktree)
- PR: `/commit-commands:commit-push-pr`
- Очистка mockup-кода: если фаза 2 запускалась, убедись что нет оставшихся `TODO(auto-feature)` (проверь grep — у меня в state.implement.todo_markers_remaining = X)
- State: .claude/auto-feature/<slug>/state.json

✋ Жду твоего следующего хода.
```

3. Отметить все 7 TaskCreate-задач как `completed` (если ещё не отмечены).
4. **НЕ удалять** state.json — он остаётся для возможного resume / истории.
5. **НЕ делать** никаких git операций.

---

## Resume

Если `$ARGUMENTS` пустой и есть активные state.json, или передан `--resume <slug>`:

1. **Без флага** — спросить через `AskUserQuestion`:
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
3. Перед резумом — проверить, что мы в правильном worktree (`pwd` vs `worktree_path`). Если нет — `EnterWorktree` с `path: <worktree_path>`.

---

## Ограничения

- **Не запускать `git commit`, `git push`, `gh pr create`.** Эти действия только по явной команде пользователя в Фазе 7 или после.
- **Не запускать `/news`.** Его делает пользователь перед PR (т.к. /news пишет в БД и это побочный эффект, который должен быть осознанным).
- **Не запускать deploy** (`/deploy`, GH Actions trigger).
- **Не удалять worktree.** Это решение пользователя после мержа.
- **Не запускать /e2e-check автоматически.** Он создаёт черновики тестов — это отдельный шаг по запросу пользователя после ревью.
- **Не пропускать конвенции.** Каждый sub-agent в фазах 2, 4 обязан прочитать docs/conventions/* перед написанием кода.
- **Не отвечать пользователю длинно.** В чат — только то что просит phase (sub-agent summary), AskUserQuestion на checkpoint, финальный отчёт. Между фазами достаточно одной строки `→ Фаза N: <название>...`.
- **При cap=5 в review loop** — это **не ошибка**, а warning. Зацикливание может означать спорные стилистические выборы, не блокирует PR. Сообщить пользователю в Фазе 7.
- **Если worktree УЖЕ существует** (повторный запуск с тем же описанием) — не создавать второй, использовать `EnterWorktree path:` для входа в существующий.
