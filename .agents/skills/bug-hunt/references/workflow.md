## Codex execution contract

Read the complete procedure below before executing this skill. `$ARGUMENTS` means
arguments/instructions in the user's invocation; it is not a literal environment
variable or shell fragment. Slash-command spellings in older chats map to the
corresponding `$skill-name`; execute the skill's instructions with available tools.

- Read root/nested `AGENTS.md`, applicable conventions and `docs/codex-workflow.md`.
  Work on this Mac. Resolve a supplied `--worktree PATH` to that checkout; otherwise
  use the assigned checkout. Use local `git -C <checkout>`, worktree-local dependencies,
  Docker databases and ports from `scripts/dev-stack.sh`; never connect to `home`,
  use SSH/sshfs, symlink `node_modules`, or test against real production data.
- Task setup, draft PR, commits/pushes and CI follow the current global workflow.
  Keep an assigned worktree and never nest one; a new task from the main checkout
  uses its isolated local worktree under that workflow. Preserve unrelated changes.
  Explicit report/draft/read-only modes retain their own no-publication boundaries.
  `news`, ready-for-review, merge and deploy require their own explicit instruction.
- Before GitHub operations resolve origin and verify `gh repo view --json nameWithOwner,url`.
  Pass `--repo OWNER/REPO` or set a verified task-local `GH_REPO`; never trust a repository
  mentioned only in issue/spec text. Ambiguous write failures require read-back before retry.
- For prescribed parallel workers follow `docs/subagents.md`: inherit the configured
  Codex model, use maximum supported reasoning effort for analysis/coding/review,
  dispatch independent roles concurrently up to available slots and queue the rest.
  Never replace a required role with a silent omission; report unavailable coverage.
  Scoring and browser QA may use the inherited default effort. Workers must not
  recursively invoke the orchestration skill they are executing for the parent.
- User decisions already given in this chat satisfy the matching checkpoint. Ask
  only for missing consequential choices via an available question tool; when none
  is available, use a clear final question and resume from recorded artifacts after
  the answer. A missing answer is not authorization. Do independent work while waiting.
- Run shell commands shown as examples deliberately, with proper argv/quoting.
  Prefer `rg`/`rg --files` for searches; do not copy a placeholder literally.
  Report observed results only. Existing specs/reports do not override live config.

## Контекст

- Сегодня: `date +%Y-%m-%d`
- Аргументы: `$ARGUMENTS`
- Существующие отчёты: `ls -t docs/bug-reports/ 2>/dev/null | head -5 || echo "(папка ещё не создана)"`

## Задача

Найти потенциальные баги в кодовой базе, валидировать каждого кандидата и зафиксировать результат — в режиме, который задаёт `$ARGUMENTS`.

**Не более 10 багов за прогон.** Код до выбора пользователя не трогать.

### Режим

- **Без `--fix` (по умолчанию) — issues.** Этап 0 пропускается: ни worktree, ни ветки, ни PR, ни файлов в репозитории. Этапы 1–2, затем Этап 3а: каждый баг — отдельный GitHub issue, с проверкой, что такого ещё нет. Пользователь разбирает issues сам и берёт нужные в работу отдельными задачами. Этапов 4–7 нет.
- **`--fix` — отчёт и PR.** Этапы 0, 1, 2, 3б и 4–7: worktree с draft PR, MD-отчёт в `docs/bug-reports/YYYY-MM-DD-bug-hunt.md` (если файл с этой датой уже существует — суффикс `-2`, `-3`, …), исправление выбранного пользователем и круги ревью и QA.

- **`--report` — локальный отчёт.** Этапы 1–2 и 3б без коммита, push, PR и этапов 4–7.
  Не публиковать issues. Это также режим для обычного аудита без просьбы публиковать.
- Явный вызов навыка без другого режима сохраняет default **issues**. Указанная
  пользователем область ограничивает все роли; исключённые области перечислить.

В режиме issues перед Этапом 1 — `git fetch origin` и сравнить `git rev-parse HEAD` с `origin/main`: если не совпадают, одной строкой предупредить, что ищем по `<ветка>@<hash>`, и часть находок может быть уже исправлена в `main`.

---

## Этап 0. Worktree и draft PR (только `--fix`)

Отчёт — артефакт задачи. Выполнить task-start workflow из `AGENTS.md` и
`docs/codex-workflow.md`: использовать уже назначенный worktree; для новой задачи
из основного checkout подготовить изолированный локальный worktree без вложенности.
Имя задачи: `bug-hunt-YYYY-MM-DD`, при коллизии `-2`, `-3`, …; ветка `codex/<task>`.

1. Проверить checkout, ветку и чистоту/принадлежность исходных изменений.
2. `node scripts/start-task-pr.mjs --title "Bug hunt YYYY-MM-DD" --summary "Отчёт о потенциальных багах по всей кодовой базе."`.
   Скрипт добавляет стартовый коммит только когда он нужен для draft PR. Если нет сети/токена,
   сохранить точный сбой, предупредить одной строкой и продолжить локально.
3. Все пути ниже (`docs/bug-reports/…`) — относительно выбранного worktree.

---

## Этап 1. Параллельное исследование

Запустить **параллельно в пределах доступных слотов, остальные роли — следующими волнами** несколько subagent'ов с ролью code reviewer параллельно — по одному Agent-вызову на область, каждый с наследуемой моделью Codex и максимальным поддерживаемым reasoning effort. В начало каждого промпта добавить: «Operate at **maximum reasoning effort**. Read the code you cite in full before concluding; better to return fewer candidates than a false positive.» Каждому subagent дать узкий фокус и попросить вернуть до 5 высокоуверенных кандидатов с `файл:строка`, severity и обоснованием.

**Обязательные области:**

1. **Frontend Effector** (`frontend/src/**/model/**`):
   - `patronum reset` со store, чьё начальное значение читается из localStorage (известный gotcha: `reset` возвращает к initial из `createStore(...)`, а не к текущему localStorage)
   - Гонки в эффектах, неотменяемые запросы при unmount
   - `sample` с неправильно подобранным `clock`/`source`/`filter`
   - Подписки store без gate/scope (утечки)

2. **Frontend React/UI** (`frontend/src/**/*.tsx`):
   - `useEffect` для data fetching (запрещён по конвенции)
   - `<form>` теги (запрещены)
   - `any` (запрещён, должно быть `unknown`)
   - `export default` (запрещён)
   - Утечки подписок (отсутствует cleanup)
   - setState после unmount, race conditions

3. **Backend services/controllers** (`backend/src/{services,controllers,routes}/**/*.ts`):
   - Связанные операции без `prisma.$transaction`
   - Утечка stack trace / Prisma errors в API ответы
   - Забытые `await`, unhandled promise rejection
   - Race conditions при create без upsert
   - Отсутствие валидации входных данных на границе

4. **Auth/Security** (`backend/src/middleware`, route definitions):
   - Роуты без `requireAuth` middleware
   - Отсутствие проверки ownership ресурса (доступ к чужим данным по id)
   - Утечка чувствительных полей в API ответах (вся `User` модель вместо select)
   - Сырые SQL/raw queries с интерполяцией
   - JWT_SECRET / другие критические env не проверяются на старте

5. **Real-time / Cron** (`backend/src/lib/websocket*`, cron jobs):
   - Двойная отправка при reconnect
   - Cron дублирует записи при рестарте сервера во время тика
   - Отсутствие идемпотентности у scheduled-операций
   - Утечки соединений (не закрывается при auth fail)
   - Timezone-баги (UTC vs локальное время)

6. **Data integrity / Prisma** (`backend/prisma/schema.prisma`, миграции, использование Prisma):
   - Отсутствие unique/index на полях, которые этого требуют
   - Конфликты soft-delete + cascade
   - Off-by-one в pagination (limit/skip/cursor)
   - Использование результата `findUnique` без проверки на `null`
   - Опасные миграции (rename без шага копирования, drop column в одном шаге)

7. **Костыли, которые прячут баги** (вся кодовая база, включая тесты):
   - Проглоченные ошибки: `catch` с одним логом на нижнем уровне, после которого вызывающий считает операцию успешной
   - Фолбэки, скрывающие промах (`?? ""`, `?? "tutor"`, «не нашли — берём первый»), из-за которых неверная ветка срабатывает молча
   - Порядок, который держится на очерёдности эффектов/колбэков или на магической задержке, вместо явной зависимости
   - Тесты, проходящие вхолостую (ожидание совпадает с начальным значением, мок обходит проверяемый код) — баг, который они «покрывают», на деле не покрыт

**Промпт для subagent (подставить в `prompt` Agent-вызова, адаптировать под область):**

> Тебе нужно найти до 5 **высокоуверенных** потенциальных багов в области `<область — конкретный путь>` проекта. Только реальные баги — не стиль, не форматирование, не отсутствие комментариев.
>
> Для каждого кандидата:
> 1. Прочитай связанный код, проследи путь вызова, проверь edge cases.
> 2. Если бага не воспроизводится в реалистичном сценарии или сомневаешься — отбрось. Лучше меньше, но точнее.
> 3. Прочитай тесты сценария и их assertions. Если проверка действительно опровергает баг — отбрось; тест, проходящий вхолостую, не доказывает отсутствие бага.
>
> Верни список в строгом формате:
>
> ```
> N. **[Severity: Critical|High|Medium|Low]** Краткий заголовок
>    Файл: path/to/file.ts:42
>    Описание: что не так
>    Сценарий: как воспроизвести
>    Последствия: что произойдёт у пользователя / в данных
>    Исправление: конкретное предложение (можно с before/after снippетом)
>    Валидация: что я проверил, чтобы исключить false positive
> ```
>
> **Контекст проекта.** Tutor app для RU рынка. Frontend — FSD + Effector + MUI. Backend — Express + Prisma + PostgreSQL. Конвенции: no `any`, no `export default`, no `useEffect` для data fetching, no `<form>` теги, `const fn = () =>` вместо `function fn()`, named exports, `type` вместо `interface`, error messages на русском. Известный gotcha проекта — `patronum reset` сбрасывает store к initial-значению из `createStore(...)`, а не к "логическому дефолту"; если initial читается из localStorage — `reset` вернёт значение на момент создания стора.

---

## Этап 2. Финальная валидация

Собрать всех кандидатов от subagent'ов. Для каждого:

1. Прочитать упомянутый файл (прочитать файл).
2. При необходимости — `rg`/`rg --files` для проверки usage и защит выше по стеку.
3. Убедиться, что баг достижим в реалистичном сценарии.
4. Отбросить **дубликаты** (один баг от нескольких агентов — оставить с лучшим описанием).
5. Отбросить случаи, **опровергнутые реальными assertions тестов**; наличие теста само по себе не опровергает баг.
6. Отбросить всё, в чём остаются сомнения.

**Если в сумме больше 10 — отобрать самые важные** в приоритете Critical → High → Medium → Low.

---

## Этап 3а. Issues (без `--fix`)

### Проверка дублей

Для каждого бага — минимум два поиска: по месту (имя файла или символа) и по сути (2–4 ключевых слова на русском):

```bash
gh issue list --repo OWNER/REPO --search "<ключевые слова>" --state all --limit 20 --json number,title,state,stateReason,url
```

Если достигнут лимит 20, уточнить запросы или продолжить пагинацию: усечённый поиск не доказывает отсутствие дублей. Похожие по заголовку открыть через `gh issue view <N> --repo OWNER/REPO` и сверить суть, а не только слова. Решение:

- **Открытый issue про то же** — новый не создавать. Если в находке есть то, чего в issue нет (другое место, сценарий, последствие), — `gh issue comment <N> --repo OWNER/REPO --body-file <файл>` с этим дополнением; иначе ничего не писать.
- **Закрыт как `NOT_PLANNED`** — не создавать: пользователь уже решил это не делать.
- **Закрыт как `COMPLETED`, но баг в текущем коде всё ещё есть** — новый issue, в теле первой строкой «Похоже на регрессию или неполный фикс #N».
- **Похожий, но про другое** — создавать новый, в теле ссылка «Связано с #N».

### Создание

1. Метки: `gh label create bug-hunt --repo OWNER/REPO --color B60205 --description 'Найдено $bug-hunt' --force` (идемпотентно).
2. Порядок — Critical → High → Medium → Low. На каждый баг — один issue:

   ```bash
   gh issue create --repo OWNER/REPO --title "<краткий заголовок>" --body-file <файл> --label bug --label bug-hunt
   ```

   Тело писать через инструмент записи во временный файл (scratchpad сессии, если есть; иначе `mktemp`), не heredoc. Заголовок — суть бага на русском без префиксов severity.
3. Оценить критичность всех созданных issues одним вызовом: `$score-issues <N1> <N2> …` (scorer по шкале `docs/issue-priority.md`, оценка 0–100 и метка `P0`…`P4` пишутся в issue). Severity в теле остаётся как есть.
4. Если `gh` недоступен (нет сети/токена) — не терять находки: записать тела в scratchpad, назвать путь пользователю и остановиться.

**Тело issue:**

```markdown
**Severity:** Critical | High | Medium | Low
**Файл:** `path/to/file.ts:42`
**Категория:** Frontend Effector / Backend Auth / Real-time / Data Integrity / …

## Описание

Что не так, какие компоненты задействованы.

## Воспроизведение

Шаги или входные данные, при которых баг возникает.

## Последствия

Что увидит пользователь, какие данные могут испортиться.

## Предлагаемое исправление

Конкретно, с `before/after`.

## Почему это не false positive

Что проверено при валидации: путь вызова, типы, тесты, защиты выше по стеку.

---
Найдено `$bug-hunt` YYYY-MM-DD на `<ветка>@<короткий hash>`.
```

Итоговое сообщение пользователю (режим issues): сводка `N багов: Critical X, High Y, Medium Z, Low W`, затем списком — новые issues (ссылка, критичность 0–100, severity, заголовок), комментарии к существующим (ссылка, что добавлено) и отброшенные как дубли (ссылка на существующий issue). Подсказать следующий шаг: взять issue в работу отдельной задачей (`$auto-bug-fix`) или прогнать `$bug-hunt --fix`.

---

## Этап 3б. Отчёт (`--fix` или `--report`)

1. Если папки `docs/bug-reports/` нет — создать через `mkdir -p docs/bug-reports`.
2. Сформировать имя файла `docs/bug-reports/YYYY-MM-DD-bug-hunt.md` (если такой уже есть — `-2`, `-3`, …).
3. Записать отчёт по структуре ниже (запись файла).
4. **Только для `--fix`:** закоммитить и запушить отчёт в ветку worktree: `git add docs/bug-reports/<файл>`, `git commit -m "docs(bug-hunt): report YYYY-MM-DD"`, `git push`. PR остаётся draft — что из отчёта брать в работу, решает пользователь.

**Для `--report`:** после записи отчёта вернуть путь и завершить. Не выполнять пункт 4, не переходить к выбору/исправлениям, не коммитить и не пушить.

**Структура отчёта:**

```markdown
# Bug Hunt Report — YYYY-MM-DD

**Всего багов:** N (Critical: X, High: Y, Medium: Z, Low: W)
**Покрытые области:** Frontend Effector, Backend Auth, Real-time, …

## Резюме

2–3 предложения о главных рисках, обнаруженных в этом проходе.

---

## 1. [Заголовок бага]

- **Severity:** Critical | High | Medium | Low
- **Файл:** `path/to/file.ts:42`
- **Категория:** Frontend Effector / Backend Auth / Real-time / Data Integrity / …

### Описание

Что именно не так, в каком сценарии воспроизводится, какие компоненты задействованы.

### Воспроизведение

Шаги или конкретные входные данные, при которых баг возникает.

### Последствия

Что увидит пользователь, какие данные могут испортиться, какой бизнес-эффект.

### Предлагаемое исправление

Конкретно. С `before/after` фрагментом кода.

\`\`\`ts
// before
const x = ...

// after
const x = ...
\`\`\`

### Почему это не false positive

Что было проверено при валидации: путь вызова, типы, тесты, защиты выше по стеку.

---

## 2. ...
```

---

## Этап 4. Исправление выбранного (✋ checkpoint, только `--fix`)

Аргумент области (например, `frontend --fix`) ограничивает поиск и сам по себе не одобряет ещё неизвестные находки. Если пользователь уже выбрал конкретные пункты отчёта или явно поручил исправить все подтверждённые находки в заданной области, использовать этот выбор. Иначе после готового отчёта — один вопрос пользователю через доступный инструмент вопросов с выбором нескольких пунктов: какие багов из отчёта исправить в этом worktree (варианты — пункты отчёта, Quick Wins первыми; плюс «Ничего, только отчёт»). Если выбрано «Ничего» — команда на этом заканчивается.

Выбранное Main исправляет **сам, в основном потоке** (не в sub-agent), по тем же правилам, что Фаза 2 `$auto-bug-fix` (fix + регрессионный тест):

1. Перед правкой — перечитать релевантный `docs/conventions/*.md`.
2. На каждое исправление — регрессионный тест (frontend → vitest, backend → jest через `bash scripts/dev-stack.sh test-backend`), кроме чисто визуальных правок без логики.
3. После правок — тесты затронутых файлов, lint затронутых пакетов, `npm --prefix backend run build`, frontend TypeScript; перед коммитом полный `npm run check -- --full` для затронутого frontend/backend кода и отдельные checks scripts/landing/E2E, если они затронуты.
4. **Без промежуточных коммитов:** правки остаются в рабочем дереве до Этапа 7 (ревью смотрит незакоммиченные фиксы). Commit + push — в Этапе 7 без вопроса; `$news` и `gh pr ready` — только по команде пользователя.

## Этап 5. Code-review loop

Тот же цикл, что Фаза 5 `$auto-feature`: основной оркестратор запускает девять независимых review-ролей и отдельных scorer-агентов через `$code-review-local --base-ref HEAD --silent --threshold 50 --iter <N> --feature bug-hunt-YYYY-MM-DD --worktree <путь worktree>`, Main читает JSON и фиксит findings в основном потоке (с регрессионными тестами), затем следующая итерация. `--base-ref HEAD` обязателен: отчёт уже закоммичен (Этап 3б), фиксы нет, и с base `main` ревью видело бы только отчёт; при пустом `HEAD...HEAD` включается working-tree-режим, и в ревью попадают ровно незакоммиченные фиксы.

- **До 5 итераций.** Выход раньше, если результат сошёлся: findings нет; ≥80% сигнатур (`<category>:<file>:<line_start>:<title-first-30-chars>`) совпадают с прошлой итерацией (convergence: число текущих сигнатур, входящих в предыдущий набор, / число текущих сигнатур; пустой набор — clean); или все оставшиеся findings — score 50 без конкретного вреда (мелочи, которые не стоят ещё одного круга).
- Не удавшийся после двух попыток фикс — откатить адресным патчем только собственных правок (сохраняя исходные/чужие изменения) и записать в отчёт как оставшийся.

## Этап 6. Manual QA loop

Только если исправления затронули то, что видит пользователь (UI, API-ответы, тексты). Иначе — пропустить и написать почему.

Тот же цикл, что Фаза 6 `$auto-feature` (прочитать её в `.agents/skills/auto-feature/references/procedure.md`): браузерный прогон делает sub-agent с наследуемой моделью Codex через `$manual-qa --context <path>` без `--fix` (тот же промпт), находки подтверждает и чинит Main в основном потоке (с регрессионными тестами), следующий круг перепроверяет исправленное и берёт непройденные сценарии. Отличия:

- Контекст круга — `.qa/contexts/bug-hunt-YYYY-MM-DD-<N>.json` (`.qa/` в `.gitignore`).
- Спеки нет: в контексте 1-го круга `must_check` = по сценарию на каждое исправление, видимое пользователю (шаги, где проявлялась проблема, и ожидаемое поведение после фикса); остальной план `$manual-qa` строит по diff ветки вместе с незакоммиченными фиксами.
- Находки, где нужно продуктовое или дизайнерское решение, — спросить пользователя через доступный инструмент вопросов после круга (команда интерактивная), а не откладывать в остаток.
- **До 5 кругов.** Выход раньше: новых находок нет и все перепроверки прошли (clean); непройденных сценариев нет и в круге ничего не исправлено (exhausted); или новый круг не нашёл ничего ценного (только `low` без конкретного вреда).

## Этап 7. Итог

Если в Этапе 4 что-то исправлено — выполнить завершение task-ветки по `AGENTS.md` и `docs/codex-workflow.md` без повторного согласования: `$changelog --worktree <путь worktree>`, `git add` фиксов, тестов, CHANGELOG.md и `docs/code-reviews/`/md-отчётов QA (без скриншотов), коммит `fix(bug-hunt): <суть>`, `git push`, затем дождаться чеков PR (`gh pr checks`; упало — `gh run view <run-id> --log-failed`, починить, повторить).

Затем одно сообщение пользователю: путь к отчёту, ссылка на draft PR, что исправлено, hash коммита и итог CI, сколько кругов ревью и QA прошло и почему остановились (чисто / сошлось / cap), что осталось. Предложить следующий шаг: `$news`, `gh pr edit`, `gh pr ready` — только после ответа пользователя.

---

## Ограничения

- **Режим issues — только чтение кода и `gh issue`/`gh label`.** Никаких файлов в репозитории, веток, коммитов и PR.
- **`--fix`: до checkpoint Этапа 4 — только чтение и запись отчёта.** Прод-код правится только после выбора пользователя в Этапе 4. Из git-операций — локальный task-start и draft PR (Этап 0), коммит отчёта (Этап 3б), а неудавшийся фикс откатывать адресным патчем только собственных изменений; никаких `stash`/`reset`, `gh pr ready` — только по команде пользователя.
- **Максимум 10 багов** за прогон.
- **Не репортить:** typos, форматирование, отсутствие комментариев, чисто стилистические замечания.
- **Описания багов на русском.** Code-сниппеты — как в исходнике.
- **Файл и строка обязательны** для каждого бага.
- В финальном текстовом сообщении пользователю (`--fix`) — указать путь к созданному отчёту, ссылку на draft PR и одну строку со сводкой (`N багов: Critical X, High Y, Medium Z, Low W`); в режиме issues — как в конце Этапа 3а.
