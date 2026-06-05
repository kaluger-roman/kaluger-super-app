---
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git rev-list:*), Bash(git ls-files:*), Bash(git add:*), Bash(git reset:*), Bash(mkdir:*), Bash(date:*), Bash(ls:*), Bash(wc:*), Bash(jq:*), Read, Glob, Grep, Write, Agent
description: Локальный code-review (5 параллельных Sonnet reviewers + Haiku scoring 0-100) на git diff base...HEAD, с настраиваемым порогом и JSON-выводом для оркестрации.
---

## Контекст

- Сегодня: !`date -u +%Y-%m-%dT%H:%M:%SZ`
- Текущая ветка: !`git branch --show-current`
- Diff stats vs main: !`git diff --shortstat main...HEAD 2>/dev/null || echo "(нет diff'а — base ref не main? см. --base-ref)"`
- Существующие отчёты: !`ls -t docs/code-reviews/$(git branch --show-current)/ 2>/dev/null | head -5 || echo "(папка ещё не создана)"`

## Задача

Прогнать code-review **на локальные изменения текущей ветки** (а не на PR), используя ту же логику что у официального plugin'а `code-review:code-review` — 5 параллельных Sonnet-агентов + Haiku scoring 0-100, — но с тремя ключевыми отличиями:

1. **Источник diff:** изменения текущей ветки относительно `<base-ref>` (по умолчанию `main`), а не `gh pr diff`. **Автоопределение режима** (см. Этап 0): есть коммиты поверх base → committed-режим `git diff <base-ref>...HEAD`; коммитов нет (типично для `/auto-feature`, который НЕ коммитит до финальной фазы) → working-tree-режим — ревью незакоммиченного рабочего дерева БЕЗ единого коммита.
2. **Порог фильтрации настраиваемый:** по умолчанию **50** (а не 80, как в plugin'е). Меняется через `--threshold`.
3. **Вывод структурирован:** машинно-читаемый JSON в `docs/code-reviews/<branch>/iter-<N>.json` + краткий человекочитаемый stdout.

Команда предназначена для интеграции в оркестратор `/auto-feature` (в режиме `--silent`), но **полностью самостоятельна** и может вызываться вручную.

## Парсинг `$ARGUMENTS`

`$ARGUMENTS` — пробел-разделённый список флагов:

- `--threshold N` — целое 0–100, минимальный score для попадания в финальный список. По умолчанию **50**.
- `--base-ref REF` — git-ref для базы сравнения. По умолчанию **`main`**.
- `--iter N` — номер итерации, используется в имени output-файла. По умолчанию **автоинкремент** (читать `docs/code-reviews/<branch>/` и взять `max+1`, или `1` если пусто).
- `--silent` — не печатать findings в stdout, только путь к JSON-файлу одной строкой (для оркестратора).
- `--feature SLUG` — переопределяет имя поддиректории для отчёта (по умолчанию — имя текущей ветки).

Примеры:
- `/code-review-local` — порог 50, base=main, авто-iter, человекочитаемый stdout
- `/code-review-local --threshold 70 --base-ref origin/main` — строже + другой base
- `/code-review-local --silent --iter 3 --feature 029-student-cabinet` — для оркестратора

---

## Этап 0. Предполётная проверка

1. Убедиться, что есть git и мы в репозитории: `git rev-parse --is-inside-work-tree`. Если нет — ошибка.
2. Убедиться, что `<base-ref>` существует: `git rev-parse --verify <base-ref>`. Если нет — ошибка с предложением: `--base-ref origin/main` или `--base-ref HEAD~10`.
3. **Определить режим diff (committed vs working-tree)** — важно для интеграции с `/auto-feature`, который НЕ коммитит до финальной фазы:
   - Есть коммиты поверх base (`git rev-list --count <base-ref>..HEAD` > 0) → **committed**: дальше `<DIFF-CMD>` = `git diff <base-ref>...HEAD`.
   - Коммитов нет (== 0) → **working-tree** (ревью незакоммиченных изменений БЕЗ единого коммита): один раз выполнить `git add -N -- .` (пометить untracked как intent-to-add, чтобы новые файлы попали в diff), задать `<DIFF-CMD>` = `git diff <base-ref>` (двухточечный: base ↔ рабочее дерево), и **сразу после снятия патча** восстановить индекс `git reset -q` (рабочие файлы не трогает, коммитов не создаёт).
   Везде ниже `<DIFF-CMD>` = выбранная команда.
4. Посчитать размер diff'а: `<DIFF-CMD> --shortstat`. Если **0 изменений** — записать пустой JSON-отчёт и выйти со stdout `"No diff vs <base-ref> — nothing to review."`.
5. Если diff > **2000 строк** (insertions+deletions) — предупредить пользователя в stdout: `Warning: diff is large (XXXX lines) — review may take 3-5 minutes.` и продолжить.

---

## Этап 1. Сбор контекста

Прежде чем запускать reviewer'ов, собрать **shared context** один раз:

1. **Список изменённых файлов** (для маршрутизации reviewer'ов):
   ```bash
   <DIFF-CMD> --name-only
   ```
2. **Полный diff** (single source of truth для всех reviewer'ов):
   ```bash
   <DIFF-CMD> > /tmp/code-review-local-diff-$$.patch
   ```
   (в working-tree-режиме сразу после снятия патча — `git reset -q`, см. Этап 0.3.)
3. **Список релевантных CLAUDE.md:**
   - Корневой `CLAUDE.md` (если есть).
   - Для каждой изменённой папки — все `CLAUDE.md` вверх по дереву (от файла до корня).
   - Конвенции: проверить наличие `docs/conventions/{frontend,backend,frontend-testing,backend-testing,e2e-testing}.md` и подмешать в shared context (как **«дополнительный CLAUDE.md»** — нарушение конвенции = нарушение CLAUDE.md).
4. **Последние коммиты ветки** для контекста намерения:
   ```bash
   git log <base-ref>..HEAD --oneline --no-decorate
   ```

Если diff пустой — см. Этап 0, шаг 3.

---

## Этап 2. Запуск 5 параллельных reviewer-агентов

**ВАЖНО (max effort):** запустить агентов через инструмент `Agent` с `model: "opus"` и в каждом промпте явно указать:

> Operate at **maximum reasoning effort**. Think deeply before each conclusion. Do not skim — read every changed hunk carefully. Better to spend extra time than to miss a real bug.

Запустить все 5 агентов **в одном сообщении** (параллельно). Каждому передать:
- путь к diff-файлу (`/tmp/code-review-local-diff-$$.patch`),
- список изменённых файлов,
- список путей к релевантным CLAUDE.md и docs/conventions/*,
- последние коммиты ветки (контекст намерения),
- **формат ответа — строго JSON** (см. ниже).

### Роли агентов (адаптированы под локальный diff, без PR-агентов)

**Agent #1 — CLAUDE.md & conventions compliance**
- Проверяет соответствие изменений всем CLAUDE.md в зоне действия (root + nested) и файлам `docs/conventions/*.md`, релевантным изменённым файлам (frontend/* → frontend.md и frontend-testing.md; backend/* → backend.md и backend-testing.md; e2e/* → e2e-testing.md).
- Для каждого finding'а — цитировать конкретное правило (с указанием файла и строки правила).

**Agent #2 — Shallow bug scan (только diff)**
- Читает **только** diff, без расширенного контекста. Ищет очевидные баги: null-разыменования, забытые `await`, off-by-one, неправильные условия, потерянные `return`, дубликаты в массивах, опасные default'ы, неверные типы, ошибки в SQL/Prisma where-условиях.
- **Не флагать** то, что зависит от внешнего состояния (без чтения других файлов).

**Agent #3 — Deep logic & context scan**
- Может **читать связанные файлы** (Read tool) для понимания контекста: вызывающий код, сигнатуры функций, схемы Prisma.
- Ищет логические баги, требующие межфайлового понимания: неправильный порядок параметров, использование удалённого API, нарушение инвариантов модели, race conditions в Effector/WebSocket-флоу.
- **Не дублировать** Agent #2 — фокус на том, что **нельзя** увидеть из одного diff'а.

**Agent #4 — Security & data leakage**
- SQL/NoSQL injection, SSRF, открытые SECRET'ы, JWT/токены в логах, утечка PII в response (например, в `select` Prisma забыли исключить `password`), CSRF, отсутствие auth-проверок на новых роутах, raw HTML в React (XSS), небезопасный `eval`/`Function`, незаэкранированные user inputs в shell-командах.
- Особое внимание: контроллеры в `backend/src/controllers/`, любые `res.json()`, `prisma.*.findMany`, новые middleware.

**Agent #5 — Type & contract safety**
- `any` / `as any` / `// @ts-ignore` в TS (если CLAUDE.md/конвенции запрещают — это finding'и).
- Несогласованные сигнатуры между controller ↔ service ↔ Prisma-схемой.
- Изменения API-контрактов (response shape, query params) без соответствующей правки фронта.
- Изменения Prisma-схемы без миграции, или миграция без backfill для NOT NULL.
- Effector: события без типов, эффекты без error-handling, stores без явного типа.

### Формат ответа агента (обязательный)

Каждый агент возвращает **только** JSON следующего вида (без markdown-обвязки, без префиксов):

```json
{
  "agent": "claude-md|shallow-bug|deep-logic|security|type-safety",
  "findings": [
    {
      "title": "Краткое описание проблемы (одна строка, на русском)",
      "category": "bug|claude-md|convention|logic|security|type",
      "file": "backend/src/controllers/auth.ts",
      "line_start": 42,
      "line_end": 45,
      "snippet": "≤5 строк кода из diff'а, точно как в файле",
      "rationale": "Почему это проблема (1-2 предложения). Цитировать CLAUDE.md/convention правило если применимо.",
      "fix_hint": "Конкретное предложение исправления (1-2 предложения)."
    }
  ]
}
```

**Если findings нет** — вернуть `{"agent": "<role>", "findings": []}`.

---

## Этап 3. Scoring через параллельные Haiku-агенты

Собрать **все findings** со всех 5 reviewer'ов в единый список. Для **каждого finding'а** запустить отдельный Haiku-агент (параллельно, в одном сообщении, по 10–15 на батч если их много).

Каждому Haiku-агенту передать:
- title, file, line_start-line_end, snippet, rationale, fix_hint — всё из finding'а,
- diff (`/tmp/code-review-local-diff-$$.patch`) — для верификации в контексте,
- список релевантных CLAUDE.md/конвенций.

**Промпт Haiku-агенту:**

> Ты оцениваешь, насколько уверенно конкретный finding из code-review является **настоящей** проблемой (а не false positive). Прочитай diff и при необходимости связанные файлы. Верни одно число — score 0–100 — по этой рубрике:
>
> - **0** — Полностью false positive. Не выдерживает лёгкой проверки, или это pre-existing issue (не из этого diff'а).
> - **25** — Может быть проблемой, но не удалось убедиться. Если стилистическое — правило не было явно прописано в CLAUDE.md/конвенциях для этого файла.
> - **50** — Подтверждённая проблема, но мелочь или редкий случай. На фоне остального PR — не очень важно.
> - **75** — Точно проблема, высокая вероятность срабатывания в проде. Прямо влияет на функциональность, или явно нарушает CLAUDE.md.
> - **100** — Абсолютная уверенность. Точно сломает прод. Прямые доказательства из кода.
>
> Operate at maximum effort. Если сомневаешься между двумя значениями — выбирай нижнее (better safe than wrong).
>
> Верни **только JSON**: `{"score": NN, "verification_note": "одно предложение почему именно так"}`.

**Тaймаут:** если Haiku-агент не отвечает за 30 секунд — пометить score как `null` и `verification_note: "timeout"`. Такие findings попадают в JSON отчёт, но **не** в финальный фильтр (трактовать как < threshold).

---

## Этап 4. Фильтрация и подготовка JSON

1. Объединить findings со scores. Финальный объект на одну находку:
   ```json
   {
     "id": "f1",
     "agent": "shallow-bug",
     "title": "...",
     "category": "bug",
     "file": "...",
     "line_start": 42,
     "line_end": 45,
     "snippet": "...",
     "rationale": "...",
     "fix_hint": "...",
     "score": 75,
     "verification_note": "..."
   }
   ```
   `id` — последовательный `f1`, `f2`, … (по порядку после фильтрации).

2. **Дедупликация:** если два finding'а указывают на тот же `(file, line_start, title-substring)` — оставить один (с **максимальным** score), в `rationale` добавить `(also flagged by: <other-agent>)`.

3. **Фильтр по threshold:** оставить только `score >= threshold` **и** `score != null`. Остальные сохранить отдельно как `filtered_out` (с теми же полями + причина: `"below threshold"` или `"timeout"`).

4. **Severity на основе score** (для удобства оркестратора):
   - `score == 100` → `"critical"`
   - `75 <= score < 100` → `"high"`
   - `50 <= score < 75` → `"medium"`

5. **Финальный объект отчёта:**
   ```json
   {
     "schema_version": 1,
     "branch": "029-student-cabinet",
     "base_ref": "main",
     "threshold": 50,
     "iteration": 1,
     "timestamp": "2026-05-24T12:34:56Z",
     "diff_stats": { "files_changed": 47, "insertions": 1234, "deletions": 567 },
     "summary": {
       "raw_findings": 42,
       "after_dedup": 35,
       "after_score_filter": 8,
       "by_severity": { "critical": 0, "high": 3, "medium": 5 },
       "by_category": { "bug": 4, "claude-md": 2, "security": 1, "type": 1 }
     },
     "findings": [ /* отфильтрованные, отсортированные по score DESC, потом по file ASC */ ],
     "filtered_out": [ /* всё что отсеяно — для прозрачности и debug */ ]
   }
   ```

---

## Этап 5. Запись и stdout

1. `mkdir -p docs/code-reviews/<branch>/` (если `--feature SLUG` — использовать SLUG вместо ветки).
2. Имя файла: `iter-<N>.json` где `N` — из `--iter` или авто-определённый (см. парсинг аргументов).
3. Write JSON в файл.
4. Удалить временный diff: `rm -f /tmp/code-review-local-diff-$$.patch`.

### Stdout

**Если `--silent`:**

```
docs/code-reviews/029-student-cabinet/iter-3.json
```

(одна строка — путь к JSON-файлу).

**Если без `--silent`:**

```
Code review — <branch> vs <base-ref> (iter <N>, threshold ≥ <T>)
Diff: <files> файлов, +<ins>/−<del> строк
Raw findings: <raw> → после фильтра: <after_score_filter>
Severity: critical <N>, high <N>, medium <N>
Категории: bug <N>, claude-md <N>, security <N>, type <N>, convention <N>, logic <N>

Топ-3 находки:
1. [high|score=85] backend/src/controllers/auth.ts:42 — Missing null check on user.email
2. [high|score=80] frontend/src/features/.../model.ts:17 — Effector store без типа
3. [medium|score=65] backend/src/services/.../index.ts:88 — Забытый await на Prisma call

Полный JSON: docs/code-reviews/<branch>/iter-<N>.json
```

(топ-3 — только если есть финальные findings; иначе одной строкой `Чисто: 0 findings ≥ threshold`).

---

## Ограничения

- **Не редактировать прод-код.** Команда строго read-only по отношению к исходникам. Фиксы — задача вызывающей стороны (оркестратора или человека).
- **Не делать git-операций, меняющих историю/ветки/рабочие файлы.** Read-only `git diff`/`git log`/`git rev-parse`/`git rev-list` — всегда ОК. В **working-tree-режиме** (Этап 0.3) допускается ТОЛЬКО `git add -N -- .` с ОБЯЗАТЕЛЬНЫМ последующим `git reset -q` — это не меняет рабочие файлы и не создаёт коммитов. Никаких `commit`/`push`/`checkout`/`branch`/`stash`.
- **Не запускать тесты, линтеры, билды.** Это отдельные шаги (CI / pre-commit). Reviewer'ы должны явно игнорировать "issues a linter would catch".
- **Не работать с GitHub** (`gh`-командами). Это локальная команда, никаких комментариев в PR не делать.
- **Findings строго в JSON-схеме.** Если reviewer вернул не-JSON или нарушил схему — пытаться извлечь JSON по `{...}` блоку; если не получилось — пометить `agent` как `failed` и продолжить без его findings (в `summary` записать `agents_failed: ["<role>"]`).
- **Дедупликация обязательна** — иначе оркестратор будет фиксить одно и то же 5 раз.
- **Все sub-agents (reviewer'ы и scorer'ы) — opus и haiku соответственно**, оба с явным "max effort" в промпте.
- **Описания на русском** (как и весь output для пользователя). JSON-ключи — английские, как принято.
