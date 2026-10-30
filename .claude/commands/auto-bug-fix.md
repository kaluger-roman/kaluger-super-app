---
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(jq:*), Bash(rm:*), Bash(test:*), Bash(echo:*), Bash(npm:*), Bash(curl:*), Bash(pkill:*), Bash(lsof:*), Bash(docker:*), Bash(bash scripts/dev-stack.sh:*), Bash(node scripts/start-task-pr.mjs:*), Read, Write, Edit, Glob, Grep, Agent, EnterWorktree, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, Skill
description: Сквозной оркестратор починки бага. Создаёт worktree, воспроизводит баг и находит root cause (✋ checkpoint), фиксит с обязательным регрессионным тестом, гонит code-review-loop с порогом 50 и до 3 кругов manual-qa (повтор шагов воспроизведения и смежных сценариев на Sonnet, фиксы в основном потоке).
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
Фаза 4: верификация + manual-QA loop (cap=3; выход раньше, если ничего не найдено или новых сценариев нет)
        тесты области в Main; Sonnet sub-agent повторяет шаги воспроизведения и смежные сценарии через /manual-qa → Main разбирает и фиксит
  ↓
Фаза 5: commit + push в ветку задачи, ожидание CI, финальный отчёт
        ✋ stop: пользователь решает что дальше (/news, PR ready)
```

Отличия от `/auto-feature` (осознанно выкинуто): нет speckit-pipeline (specify/clarify/plan/tasks/implement), нет фазы mockups, один checkpoint вместо двух, cap review-loop 3 вместо 5. Баг — это не фича: вместо спеки — диагноз, вместо макетов — воспроизведение.

Все sub-agents — **opus + max reasoning effort**, явно прописано в промптах; исключение — браузерный прогон Фазы 4 на `sonnet`. Все правки в фазах 3 и 4 — **в основном потоке**, не в sub-agent. Git: стартовый draft PR в Фазе 0 (`scripts/start-task-pr.mjs`), между фазами коммитов нет, в Фазе 5 — commit + push готовой работы в ветку задачи без вопроса (CLAUDE.md «Commit and Push Without Asking»). `/news`, `gh pr ready`, merge и деплой — только по команде пользователя.

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
    "area_tests_passed": true,
    "repro_verified_fixed": true,
    "qa_skipped_reason": null,
    "notes": "..."
  },
  "qa_iterations": [
    { "iter": 1, "context_path": ".claude/auto-bug-fix/<slug>/qa-context-1.json", "json_path": "docs/manual-qa-reports/2026-09-05-fix-lessons-after-delete.findings.json", "findings_new": 1, "fixed": 1, "open": 0, "rejected": 0, "recheck_still_reproduces": 0, "untested": 0 }
  ],
  "qa_covered_scenarios": [ { "id": "R1", "title": "Повтор бага: ..." } ],
  "qa_exit_reason": "clean|exhausted|cap|skipped",
  "remaining_qa_findings": [
    { "title": "...", "severity": "low", "status": "open|rejected", "reason": "..." }
  ]
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
4. [pending] Верификация + manual QA loop (до 3 кругов)
5. [pending] Финальный отчёт
```

---

## Сквозные принципы оркестрации

1. **Max effort везде** (кроме браузерного прогона Фазы 4). В **каждом** промпте `Agent` явно писать:
   > Operate at **maximum reasoning effort**. Use deep, careful thinking at every step. Quality matters more than speed.
2. **Sub-agents всегда `model: "opus"`**, кроме браузерного прогона Фазы 4 (`sonnet`).
3. **Sub-agent промпты самодостаточны.** Включают: цель, ссылки на CLAUDE.md и конвенции, релевантный кусок state.json, ожидаемый формат ответа (JSON).
4. **Возврат от sub-agent — структурированный JSON.** Текстовые отчёты — короткие.
5. **Main делает запись в state.json.** Sub-agent создаёт артефакты, Main фиксирует их в state.
6. **Git только в начале и в конце.** Worktree создаётся через `EnterWorktree`. Фаза 0 — стартовый draft PR (`node scripts/start-task-pr.mjs`): пустой коммит + push + `gh pr create --draft` делает скрипт. Фазы 1–4 не коммитят. Фаза 5 — commit + push в ветку задачи без вопроса и ожидание CI.
7. **При ошибке любой фазы** — записать `phases[i].status = "blocked"`, в `notes` причину, прервать pipeline, сообщить пользователю и ждать решений.
8. **Регрессионный тест обязателен** (правило проекта): фикс без теста, покрывающего именно сценарий бага, не считается завершённым. Исключение — чисто визуальный баг без логики; тогда обязателен скриншот «после» из QA-круга Фазы 4 (QA-цикл для такого бага не пропускается) и явная пометка в отчёте.

---

## Pipeline

### Фаза 0. Worktree + state.json init

**Только если** ещё нет state.json для этого бага (см. Resume).

> **Перед стартом:** `EnterWorktree` — deferred tool. Если он отсутствует в текущей сессии — сначала загрузить его schema через `ToolSearch` с query `select:EnterWorktree`. То же для `TaskCreate`, `TaskUpdate`, `AskUserQuestion`.

1. **Сгенерировать slug** из описания: `fix-` + kebab-case первых ~30 символов сути бага, безопасный для пути. Например «Уроки остаются после удаления ученика» → `fix-lessons-after-delete`.
2. **Создать worktree** через `EnterWorktree` с `name: "<slug>"`. Worktree создастся в `.claude/worktrees/<slug>/` на новой ветке того же имени.
3. **Открыть draft PR** (правило проекта, CLAUDE.md «Draft PR at Task Start»): `node scripts/start-task-pr.mjs --title "fix: <суть бага>" --summary "<описание бага, 1–2 предложения>"`. Скрипт сам делает пустой стартовый коммит и push. Если скрипт упал (нет сети/токена) — предупредить одной строкой и продолжить, pipeline не блокировать.
4. **Создать state-директорию** `mkdir -p .claude/auto-bug-fix/<slug>/` и записать первичный `state.json` (см. схему; `current_phase: "diagnose"`, плюс `pr_url` из ответа скрипта).
5. Создать **5 задач** через `TaskCreate`.
6. Сообщить пользователю одной строкой: `🐞 Auto-bug-fix: started "<описание>". Worktree: <path>. PR: <pr_url>. State: .claude/auto-bug-fix/<slug>/state.json.`

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
   - UI bug: start the dev servers on the BRANCH ports (never :3000/:3001 — parallel worktrees must not fight over them). Requires Docker running:
     ```
     bash scripts/dev-stack.sh up             # branch Postgres + migrations → JSON with webUrl/apiUrl/databaseUrl
     bash scripts/dev-stack.sh run-backend    # run_in_background; backend on the branch api port
     bash scripts/dev-stack.sh run-frontend   # run_in_background; CRA on the branch web port
     ```
     Poll `<apiUrl>/health` and `<webUrl>` with curl until up (max 120s). The branch DB is fresh — if the repro needs data, seed it: `cd backend && DATABASE_URL=<databaseUrl> npm run db:seed`. Use `<webUrl>` as the Playwright base URL. Reproduce via Playwright MCP, capture a "before" screenshot to docs/bug-fixes/<slug>/screenshots/before-01.png. Stop servers you started when done (leave the branch Postgres up).
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

### Фаза 4. Верификация + manual QA loop (до 3 кругов)

**Цель:** подтвердить, что баг действительно починен, и что рядом ничего не сломалось. Это не полный прогон фичи: в фокусе шаги воспроизведения бага и смежные сценарии затронутого места.

**Шаг 1. Тесты (Main сам):** регрессионный тест + полный набор тестов затронутой области (не только регрессионный). Упало — чинить до зелёного; не выходит — blocked.

**Шаг 2. Нужен ли браузер.** Если фикс не виден пользователю (правка не меняет UI, API-ответы, тексты; обычно `repro_kind` `test`/`code-trace` во внутренней логике) — QA-цикл пропустить: `qa_exit_reason: "skipped"`, причину в `verification.qa_skipped_reason`, перейти к Фазе 5.

**Шаг 3. QA-цикл** — ровно как Фаза 6 `/auto-feature` (прочитать её в `.claude/commands/auto-feature.md`): тот же `sonnet` sub-agent с `/manual-qa --context <path>` без `--fix`, тот же разбор находок в Main, те же условия выхода (`clean` — ничего не найдено; `exhausted` — новых сценариев нет и перепроверять нечего; `cap` — 3 круга). Отличия:

- Контекст кладётся в `.claude/auto-bug-fix/<slug>/qa-context-<iter>.json`.
- В контексте 1-го круга `must_check` = шаги воспроизведения из диагноза (`repro_steps`, `expected` — поведение без бага, `title` с префиксом «Повтор бага:») + 1–2 смежных сценария того же экрана. Спеки у бага нет: остальной план `/manual-qa` строит по diff ветки.
- Шаги воспроизведения бага в каком-либо круге снова дают баг (`must_check` или `recheck` в статусе fail/`still_reproduces`) — это блокер, а не обычная находка: записать blocked, вернуть пользователю краткий диагноз и спросить через `AskUserQuestion`: вернуться к Фазе 1 (передиагностика с новыми данными) или остановиться.
- Фиксы находок минимальные, в духе «Ограничений» ниже: находка, не связанная с фиксом (баг был и до ветки), не чинится, а уходит в `open` с пометкой «вне задачи» и в GitHub issue (правило проекта «File an Issue for Every Finding»).

**Main:** записать `verification` (`repro_verified_fixed` — по `must_check` 1-го круга), `qa_iterations`, `qa_exit_reason`, `remaining_qa_findings` в state.json, перейти к Фазе 5.

---

### Фаза 5. Commit + push, CI, финальный отчёт

**Цель:** закоммитить и запушить проверенный фикс в ветку задачи (не спрашивая), дождаться CI, дать сводку.

1. Прочитать актуальный state.json.
2. **Commit + push** (внутри worktree): `git add` только файлы фикса, тесты, CHANGELOG.md, `docs/code-reviews/<slug>/` и md-отчёты manual-qa (с `.findings.json`); НЕ добавлять `.claude/auto-bug-fix/` и скриншоты. Один коммит в стиле `fix(<область>): <суть>` (тело — причина и что изменено). Pre-commit хук упал — исправить причину и закоммитить снова, `--no-verify` не использовать. Затем `git push origin <branch>`.
3. **CI:** дождаться завершения чеков PR (`gh pr checks <pr>` в цикле до исчезновения `pending`). Упало — `gh run view <run-id> --log-failed`, починить, новый коммит + push, ждать снова (до 3 попыток; дальше — blocked с хвостом лога).
4. Записать в state.json `commit` (hash) и `ci` (итог чеков).
5. Сформировать компактный отчёт:

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
| 4 | Верификация + QA loop | ✅ clean / ✅ exhausted / ⚠️ cap / ➖ skipped | repro не воспроизводится; N кругов, K сценариев, J находок исправлено, R осталось |
| 5 | Commit + CI | ✅ | <hash>, чеки PR зелёные |

<warnings, если есть: тест не был red, convergence, cap, visual-only без теста и т.п.>

<если remaining_qa_findings не пусто — таблица: Severity | Заголовок | Где | Статус и причина (open / rejected / вне задачи + ссылка на issue)>

## Дальше — твои решения

- Просмотр диффа: `git -C <worktree_path> diff main`
- Скриншоты: before — docs/bug-fixes/<slug>/screenshots/, after — docs/manual-qa-reports/<date>-<branch>[-N]/screenshots/
- PR (<pr_url>, draft): `/news` (по твоему решению), `gh pr edit` (заголовок и описание, секцию «Сессии Claude Code» сохранить), `gh pr ready`
- State: .claude/auto-bug-fix/<slug>/state.json

✋ Жду твоего следующего хода.
```

6. Отметить все 5 TaskCreate-задач `completed`.
7. **НЕ удалять** state.json.

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
4. `node scripts/start-task-pr.mjs --title "fix: <суть бага>"` — откроет PR, если его нет, или допишет текущую сессию в существующий.

---

## Ограничения

- **Commit/push — только в Фазе 5** (сам, без вопроса) и стартовый `node scripts/start-task-pr.mjs` (Фаза 0 и Resume). Не коммитить между фазами, не push в `main`, без force-push, без `gh pr create` / `gh pr ready` / merge.
- **Не запускать `/news`.** Его делает пользователь перед PR.
- **Не запускать deploy.**
- **Не удалять worktree.**
- **Минимальный фикс.** Никакого попутного рефакторинга; найденные по дороге чужие проблемы — в warnings финального отчёта, не в дифф.
- **Не пропускать конвенции.** Фаза 2 (sub-agent) и фиксы фаз 3 и 4 (Main) — читать docs/conventions/* перед написанием кода.
- **Не отвечать пользователю длинно.** Между фазами — одна строка `→ Фаза N: <название>...`; полноценно — только checkpoint и финальный отчёт.
- **Скриншоты не коммитить** (`docs/bug-fixes/<slug>/screenshots/`, `docs/manual-qa-reports/**/screenshots/`, `.playwright-mcp/` — local-only, правило проекта).
- **При cap=3 в review или QA loop** — warning, не ошибка; сообщить в Фазе 5.
- **Если worktree УЖЕ существует** (повторный запуск с тем же описанием) — не создавать второй, войти через `EnterWorktree path:`.
