---
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(jq:*), Bash(rm:*), Bash(test:*), Bash(echo:*), Bash(npm:*), Bash(curl:*), Bash(pkill:*), Bash(lsof:*), Read, Write, Edit, Glob, Grep, Agent, EnterWorktree, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, Skill
description: Сквозной оркестратор починки бага. Создаёт worktree, воспроизводит баг и находит root cause (✋ checkpoint), фиксит с обязательным регрессионным тестом, гонит code-review-loop с порогом 50 и верифицирует фикс по шагам воспроизведения.
---

## Контекст

- Сегодня: !`date -u +%Y-%m-%dT%H:%M:%SZ`
- Текущая ветка: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`
- Активные state-файлы: !`ls -t .claude/auto-bug-fix/*/state.json 2>/dev/null | head -5 || echo "(нет активных запусков)"`

## Задача

Полный цикл починки бага из описания — с **одним человеческим чекпоинтом** (после диагностики) и **автономным** проходом остальных шагов:

```
[вход: описание бага]
  ↓
Фаза 0: создание worktree + state.json
  ↓
Фаза 1: диагностика — воспроизведение + root cause →
        ✋ stop: пользователь подтверждает диагноз и план фикса
  ↓
Фаза 2: fix + обязательный регрессионный тест (tests + lint + tsc + /changelog)
  ↓
Фаза 3: code-review loop (cap=3, threshold=50, convergence detector)
        Sub-agent делает /code-review-local → JSON → Main парсит и фиксит сам
  ↓
Фаза 4: верификация — повтор шагов воспроизведения (Playwright для UI, тесты для бэка)
  ↓
Фаза 5: финальный отчёт
        ✋ stop: пользователь решает что дальше (коммитить, PR)
```

Отличия от `/auto-feature` (осознанно выкинуто): нет speckit-pipeline (specify/clarify/plan/tasks/implement), нет фазы mockups, один checkpoint вместо двух, cap review-loop 3 вместо 5. Баг — это не фича: вместо спеки — диагноз, вместо макетов — воспроизведение.

Все sub-agents — **opus + max reasoning effort**, явно прописано в промптах. Все правки в фазе 3 — **в основном потоке**, не в sub-agent. Все git/PR операции — **только по команде пользователя в Фазе 5**, никаких commit/push автоматически.

---

## Парсинг `$ARGUMENTS`

`$ARGUMENTS` может содержать:

1. **Описание бага** (любой текст) — стартует новый прогон. Чем больше деталей (шаги воспроизведения, ожидаемое/фактическое поведение, скриншот/лог), тем лучше — но работать надо с тем, что дали.
2. **Пустой** — два сценария:
   - Если есть активные `state.json` (см. Контекст) — предложить **resume** через `AskUserQuestion` (см. секцию **Resume**).
   - Если активных state'ов нет — спросить пользователя описание бага через `AskUserQuestion`.
3. **`--resume <slug>`** — явный resume конкретного state по slug (без вопросов).
4. **`--new <описание>`** — явный старт нового прогона, даже если активные state'ы существуют.

Примеры:
- `/auto-bug-fix При удалении ученика его уроки остаются в расписании`
- `/auto-bug-fix` (нет активных — спросит описание; есть — предложит resume)
- `/auto-bug-fix --resume fix-lessons-after-delete`

---

## State.json — единственный источник правды

Путь: `.claude/auto-bug-fix/<slug>/state.json` (slug генерируется в Фазе 0 и больше не меняется — переименований как в auto-feature тут нет).

**Схема:**

```json
{
  "schema_version": 1,
  "bug_description": "При удалении ученика его уроки остаются...",
  "slug": "fix-lessons-after-delete",
  "branch": "fix-lessons-after-delete",
  "worktree_path": "/Volumes/.../.claude/worktrees/fix-lessons-after-delete",
  "started_at": "2026-09-05T12:00:00Z",
  "updated_at": "2026-09-05T13:45:00Z",
  "current_phase": "fix",
  "diagnosis": {
    "reproduced": true,
    "repro_steps": ["...", "..."],
    "root_cause": "...",
    "affected_files": ["backend/src/services/students/..."],
    "fix_plan": "...",
    "user_approved": true
  },
  "phases": [
    { "name": "init", "status": "completed", "started_at": "...", "completed_at": "...",
      "artifacts": [".claude/auto-bug-fix/<slug>/state.json"], "notes": "Worktree at ..." },
    { "name": "diagnose", "status": "completed", "user_approved": true },
    { "name": "fix", "status": "in_progress", "artifacts": ["backend/src/...", "backend/src/**/*.test.ts"] }
  ],
  "review_iterations": [
    { "iter": 1, "json_path": "docs/code-reviews/<slug>/iter-1.json", "findings_before": 3, "findings_applied": 3, "convergence_signature": ["..."] }
  ],
  "verification": {
    "regression_test_passed": true,
    "repro_verified_fixed": true,
    "screenshots": ["docs/bug-fixes/<slug>/screenshots/after-01.png"],
    "notes": "..."
  }
}
```

**Правила:**
- Каждая запись в `phases[]` появляется при **старте** фазы (`status: in_progress`) и обновляется при завершении.
- `updated_at` обновлять **после каждой записи** в state.json.
- Запись через Write (полный файл), перед записью — Read актуальной версии.

---

## TaskCreate — карта прогресса для пользователя

Сразу после Фазы 0 создать **пять задач** через `TaskCreate` — по одной на фазу 1–5. Отмечать `in_progress`/`completed` по ходу.

```
1. [pending] Диагностика (repro + root cause) + ✋ approve
2. [pending] Fix + регрессионный тест
3. [pending] Code-review loop (порог 50, cap 3 итерации)
4. [pending] Верификация фикса
5. [pending] Финальный отчёт
```

---

## Сквозные принципы оркестрации

1. **Max effort везде.** В **каждом** промпте `Agent` явно писать:
   > Operate at **maximum reasoning effort**. Use deep, careful thinking at every step. Quality matters more than speed.
2. **Sub-agents всегда `model: "opus"`.**
3. **Sub-agent промпты самодостаточны.** Включают: цель, ссылки на CLAUDE.md и конвенции, релевантный кусок state.json, ожидаемый формат ответа (JSON).
4. **Возврат от sub-agent — структурированный JSON.** Текстовые отчёты — короткие.
5. **Main делает запись в state.json.** Sub-agent создаёт артефакты, Main фиксирует их в state.
6. **Никаких автоматических git-операций** (commit / push). Worktree создаётся через `EnterWorktree`.
7. **При ошибке любой фазы** — записать `phases[i].status = "blocked"`, в `notes` причину, прервать pipeline, сообщить пользователю и ждать решений.
8. **Регрессионный тест обязателен** (правило проекта): фикс без теста, покрывающего именно сценарий бага, не считается завершённым. Исключение — чисто визуальный баг без логики; тогда обязателен скриншот «после» в Фазе 4 и явная пометка в отчёте.

---

## Pipeline

### Фаза 0. Worktree + state.json init

**Только если** ещё нет state.json для этого бага (см. Resume).

> **Перед стартом:** `EnterWorktree` — deferred tool. Если он отсутствует в текущей сессии — сначала загрузить его schema через `ToolSearch` с query `select:EnterWorktree`. То же для `TaskCreate`, `TaskUpdate`, `AskUserQuestion`.

1. **Сгенерировать slug** из описания: `fix-` + kebab-case первых ~30 символов сути бага, безопасный для пути. Например «Уроки остаются после удаления ученика» → `fix-lessons-after-delete`.
2. **Создать worktree** через `EnterWorktree` с `name: "<slug>"`. Worktree создастся в `.claude/worktrees/<slug>/` на новой ветке того же имени.
3. **Создать state-директорию** `mkdir -p .claude/auto-bug-fix/<slug>/` и записать первичный `state.json` (см. схему; `current_phase: "diagnose"`).
4. Создать **5 задач** через `TaskCreate`.
5. Сообщить пользователю одной строкой: `🐞 Auto-bug-fix: started "<описание>". Worktree: <path>. State: .claude/auto-bug-fix/<slug>/state.json.`

> **Node_modules:** в свежем worktree их нет — сделать симлинки из основного репо (`ln -s <main>/frontend/node_modules <wt>/frontend/node_modules`, аналогично для backend), иначе тесты/линт не запустятся.

---

### Фаза 1. Диагностика (repro + root cause)

**Цель:** воспроизвести баг, найти корневую причину, составить план фикса и пройти human checkpoint.

**Запустить sub-agent через `Agent`:**

- `subagent_type: "general-purpose"`
- `model: "opus"`
- `description: "Reproduce bug and find root cause"`
- Промпт:

```
You are a sub-agent in an auto-bug-fix pipeline. Your task: reproduce the bug, locate the root cause, and propose a minimal fix plan. Operate at MAXIMUM reasoning effort. Do NOT fix anything yet — diagnosis only, no code edits.

Bug description (verbatim, from the user):
"""
<описание из state.json>
"""

Project context: read root CLAUDE.md. Frontend is React+Effector (FSD), backend is Express+Prisma (layered MVC).

Steps:

1. **Locate the code.** Grep/read the relevant modules (frontend and/or backend) implicated by the description. Trace the data flow end to end.

2. **Reproduce.**
   - UI bug: start dev servers if needed (backend `cd backend && npm run dev`, frontend `cd frontend && npm start`, both run_in_background; poll :3001 and :3000 with curl until up, max 90s). Reproduce via Playwright MCP, capture a "before" screenshot to docs/bug-fixes/<slug>/screenshots/before-01.png. Stop servers you started when done.
   - Backend/logic bug: reproduce with a minimal failing test snippet or by tracing the code path; if a quick throwaway check helps, run existing tests around the area (`cd backend && npm test -- --testPathPatterns=<path>` / `cd frontend && npm run test -- <path>`).
   - If you CANNOT reproduce — say so explicitly with what you tried; do not fake it.

3. **Root cause.** Pin the exact file(s)/line(s) and explain WHY the behavior happens (not just where). Distinguish root cause from symptoms.

4. **Fix plan.** Minimal, no drive-by refactoring: which files change, what the regression test will assert, migration needed or not, risk notes.

Return JSON ONLY:

{
  "reproduced": true|false,
  "repro_steps": ["step 1", "step 2", ...],
  "repro_kind": "ui-playwright|test|code-trace",
  "before_screenshots": ["docs/bug-fixes/<slug>/screenshots/before-01.png"] ,
  "root_cause": "<2-4 sentences: exact mechanism of the bug>",
  "root_cause_location": ["backend/src/services/.../file.ts:123", ...],
  "affected_files": [...],
  "fix_plan": "<3-6 sentences: what to change and what the regression test asserts>",
  "regression_test_target": "<test file path to create/extend>",
  "migration_needed": false,
  "risks": ["..."] ,
  "warnings": []
}

On failure: { "error": "<one-sentence>", "details": "..." }
```

**Main принимает JSON:**

1. Если `error` — записать blocked, вывести пользователю, остановить.
2. Записать `diagnosis` в state.json.
3. Если `reproduced: false` — это не блокер, но в checkpoint-вопросе явно пометить: «⚠️ воспроизвести не удалось, диагноз по трассировке кода».
4. **Human checkpoint** через `AskUserQuestion`:

   ```
   Вопрос: "Диагноз: <root_cause кратко>. Где: <root_cause_location>. План: <fix_plan кратко>. Чиним?"
   Опции:
   - "Approve — чиним по плану" (Recommended)
   - "Диагноз/план надо поправить"
   - "Отмена pipeline"
   ```

5. «Approve» — `diagnosis.user_approved=true`, перейти к Фазе 2.
6. «Поправить» — follow-up `AskUserQuestion` «Что не так — опиши одной фразой», затем новый диагностический Agent с уточнением. Цикл до approve или отмены.
7. «Отмена» — `phases.diagnose.status="cancelled"`, сообщить путь к state.json, выйти.

---

### Фаза 2. Fix + регрессионный тест

**Цель:** применить минимальный фикс по утверждённому плану, с обязательным регрессионным тестом (сначала red, потом green).

**Запустить sub-agent:**

- `model: "opus"`
- `description: "Apply fix with regression test"`
- Промпт:

```
You are a sub-agent applying an approved bug fix. Operate at MAXIMUM reasoning effort.

Approved diagnosis (from orchestrator state):
<diagnosis JSON целиком>

Conventions (MANDATORY before writing each layer):
- frontend code: read docs/conventions/frontend.md
- backend code: read docs/conventions/backend.md
- frontend tests: read docs/conventions/frontend-testing.md
- backend tests: read docs/conventions/backend-testing.md
Also read root CLAUDE.md + any nested CLAUDE.md in folders you modify.

Steps:

1. **Write the regression test FIRST** at <regression_test_target> — it must encode the exact bug scenario and FAIL against current code. Run it, confirm it fails for the right reason (red). If the bug is purely visual with no logic — skip the test but say so in the response.
   - Backend: `cd backend && npm test -- --testPathPatterns=<path>`
   - Frontend: `cd frontend && npm run test -- <path>`

2. **Apply the minimal fix** per fix_plan. No drive-by refactoring, no unrelated cleanup.

3. **Go green:** rerun the regression test + existing tests around the touched area. Fix until green.

4. **Lint & types:**
   - `cd frontend && npm run lint` (if frontend touched)
   - `cd backend && npm run build` (if backend touched — strict TS must pass)

5. **Run /changelog** via the Skill tool to update CHANGELOG.md. Do NOT run /news — that's the user's decision later.

Return JSON ONLY:

{
  "fix_applied": true,
  "files_modified": [...], "files_created": [...], "migrations_added": [...],
  "regression_test": { "path": "...", "red_confirmed": true, "green_confirmed": true, "skipped_visual_only": false },
  "test_results": { "backend": "passed|failed|n/a", "frontend": "passed|failed|n/a" },
  "lint_clean": true, "tsc_clean": true,
  "warnings": []
}

On failure: { "error": "...", "step_failed": "test-red|fix|test-green|lint|tsc|changelog", "tail": "<last error output>" }
```

**Main:**

1. Если `error` или тесты `failed` — записать blocked, остановить, сообщить с хвостом ошибки.
2. Если `red_confirmed: false` (тест сразу зелёный) — warning в state: тест может не ловить баг; отметить для финального отчёта.
3. Записать артефакты, перейти к Фазе 3.

---

### Фаза 3. Code-review loop

**Цель:** прогнать `/code-review-local --threshold 50` в цикле, фиксить findings в основном потоке. Cap = 3 итерации (дифф багфикса маленький).

> **БЕЗ КОММИТОВ.** `/code-review-local` сам автоопределяет режим: на ветке без коммитов он ревьюит **рабочее дерево**. Main **НЕ** делает `git commit` между итерациями. (Если в main-сессии нужны `curl`/`lsof` — делегируй сабагенту: changelog-hook может ложно блокировать их, пока CHANGELOG не в коммите.)

**Логика цикла (в Main):**

```
iter = 1
prev_signatures = []
while iter <= 3:
  1. Sub-agent → /code-review-local --silent --threshold 50 --iter <iter> --feature <slug>
     → возвращает путь к JSON
  2. Main: Read JSON
  3. Если findings.length === 0 → BREAK (success)
  4. Compute signatures = sorted list of "<category>:<file>:<line_start>:<title-first-30-chars>"
  5. Если signatures == prev_signatures (или ≥80% совпадает) → BREAK (convergence),
     записать `convergence_detected: true`
  6. Main применяет фиксы (см. ниже)
  7. Записать в state.review_iterations[iter]
  8. prev_signatures = signatures; iter += 1
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

**Main применяет фиксы (в основном потоке):**

Для каждого finding (по score DESC):

1. Read целевого файла вокруг line_start/line_end.
2. Перечитать релевантный `docs/conventions/<frontend|backend>.md`.
3. Если категория `bug` / `claude-md` / `security` — добавить тест, если сценарий ещё не покрыт регрессионным тестом Фазы 2.
4. Edit по `fix_hint` — минимально, без попутного рефакторинга.
5. Прогнать релевантные тесты + lint/tsc для затронутого файла.
6. Упало после фикса — вторая попытка; снова упало — откатить (`git checkout -- <file>`), записать в `failed_fixes`, продолжить.
7. После всех фиксов итерации — обновить state.json.

**После цикла:** записать `phases.review`. Convergence или cap=3 — warning в отчёте Фазы 5, pipeline продолжается.

---

### Фаза 4. Верификация фикса

**Цель:** подтвердить, что баг действительно починен, повторив шаги воспроизведения из диагноза. Это НЕ полный /manual-qa — только целевой сценарий бага + ближайшие смежные сценарии.

**Sub-agent:**

- `model: "opus"`
- `description: "Verify bug is fixed"`
- Промпт:

```
Operate at MAXIMUM reasoning effort. Task: verify a bug fix by re-running the original reproduction.

Diagnosis repro steps:
<repro_steps + repro_kind из state.json>

Steps:

1. Run the regression test: <path> — must pass.
2. If repro_kind is "ui-playwright": start dev servers (backend :3001, frontend :3000, run_in_background, curl-poll до готовности, max 90s), re-run the EXACT repro steps via Playwright MCP, confirm the buggy behavior is gone. Capture "after" screenshots to docs/bug-fixes/<slug>/screenshots/after-NN.png. Also sanity-check 1-2 adjacent scenarios of the same screen (no new breakage). Stop servers you started.
3. If repro_kind is "test" or "code-trace": run the full test suite of the touched area (not just the regression test).

Return JSON ONLY:

{
  "regression_test_passed": true,
  "repro_verified_fixed": true|false,
  "adjacent_checks": [ { "scenario": "...", "ok": true } ],
  "screenshots": ["docs/bug-fixes/<slug>/screenshots/after-01.png"],
  "notes": "..."
}

On failure or if the bug still reproduces: { "error": "...", "still_reproduces": true|false, "details": "..." }
```

**Main:**

1. Если `still_reproduces: true` — это блокер: записать blocked, вернуть краткий диагноз пользователю, спросить через AskUserQuestion: вернуться к Фазе 1 (передиагностика с новыми данными) или остановиться.
2. Иначе записать `verification` в state.json, перейти к Фазе 5.

---

### Фаза 5. Финальный отчёт

**Цель:** сводка пользователю. Никаких git/PR действий.

1. Прочитать актуальный state.json.
2. Сформировать компактный отчёт:

```markdown
# 🏁 Auto-bug-fix complete — <slug>

**Worktree:** <path>
**Branch:** <branch>
**Баг:** <bug_description>

## Фазы

| # | Фаза | Статус | Итог |
|---|---|---|---|
| 1 | Диагностика | ✅ | root cause: <кратко>; repro: <ui/test/trace> |
| 2 | Fix + тест | ✅ | N файлов, регрессионный тест red→green |
| 3 | Code-review loop | ✅ / ⚠️ convergence | N итераций, M findings зафикшено |
| 4 | Верификация | ✅ | repro не воспроизводится, K смежных проверок ok |

<warnings, если есть: тест не был red, convergence, cap, visual-only без теста и т.п.>

## Дальше — твои решения

- Просмотр диффа: `git -C <worktree_path> diff main`
- Скриншоты before/after: docs/bug-fixes/<slug>/screenshots/
- Коммит: `/commit-commands:commit` (внутри worktree)
- PR: `/commit-commands:commit-push-pr` (перед этим /news — по твоему решению)
- State: .claude/auto-bug-fix/<slug>/state.json

✋ Жду твоего следующего хода.
```

3. Отметить все 5 TaskCreate-задач `completed`.
4. **НЕ удалять** state.json.
5. **НЕ делать** git операций.

---

## Resume

Если `$ARGUMENTS` пустой и есть активные state.json, или передан `--resume <slug>`:

1. **Без флага** — спросить через `AskUserQuestion`:
   ```
   "Найдены активные auto-bug-fix-запуски. Что сделать?"
   - "Resume <slug-1> (фаза X)"
   - "Resume <slug-2> (фаза Y)"
   - "Начать новый прогон"
   - "Только посмотреть state (без действий)"
   ```
2. **При resume** — Read state.json, определить `current_phase`:
   - фаза `in_progress` — спросить «Возобновить с этой фазы?» — если да, запустить её sub-agent заново.
   - фаза `blocked` — показать `notes` и спросить «Попробовать снова или пропустить?».
   - все `completed` — показать финальный отчёт ещё раз.
3. Перед резумом — проверить, что мы в правильном worktree (`pwd` vs `worktree_path`). Если нет — `EnterWorktree` с `path: <worktree_path>`.

---

## Ограничения

- **Не запускать `git commit`, `git push`, `gh pr create`.** Только по явной команде пользователя в Фазе 5 или после.
- **Не запускать `/news`.** Его делает пользователь перед PR.
- **Не запускать deploy.**
- **Не удалять worktree.**
- **Минимальный фикс.** Никакого попутного рефакторинга; найденные по дороге чужие проблемы — в warnings финального отчёта, не в дифф.
- **Не пропускать конвенции.** Sub-agents фаз 2 и 3 обязаны читать docs/conventions/* перед написанием кода.
- **Не отвечать пользователю длинно.** Между фазами — одна строка `→ Фаза N: <название>...`; полноценно — только checkpoint и финальный отчёт.
- **Скриншоты не коммитить** (`docs/bug-fixes/<slug>/screenshots/`, `.playwright-mcp/` — local-only, правило проекта).
- **Если worktree УЖЕ существует** (повторный запуск с тем же описанием) — не создавать второй, войти через `EnterWorktree path:`.
