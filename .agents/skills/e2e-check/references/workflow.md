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
- Текущая ветка: `git branch --show-current`
- Diff vs main (только имена): `git diff --name-status main...HEAD 2>/dev/null | head -50 || echo "(нет diff)"`
- Существующие e2e: `ls frontend/e2e/ 2>/dev/null | head -20 || echo "(папки frontend/e2e/ ещё нет)"`

## Задача

Перед открытием PR проверить, что изменения в текущей ветке адекватно покрыты e2e-тестами. Команда **только репортит** — никаких автоматических коммитов; черновики тестов кладутся рядом с пометкой `.draft.spec.ts`, человек дорабатывает и переименовывает.

`$ARGUMENTS`:
- пусто → diff vs `main` (если доступен только `origin/main`, явно указать этот fallback)
- `<base-ref>` → diff vs указанный ref (например `origin/main`, `HEAD~5`, `v1.2.0`)

---

## Этап 1. Сбор diff

1. Определить base-ref (см. `$ARGUMENTS`).
2. Получить два списка:
   - **Все изменённые файлы:** `git diff --name-status <base>...HEAD`
   - **Содержимое diff** для user-facing файлов (см. ниже): `git diff <base>...HEAD -- <paths>`
3. В дополнение включить staged/unstaged diff и релевантные untracked файлы, сохраняя индекс. Если совокупный diff пуст — вывести «Нет изменений» и завершить. В отчёте отдельно назвать committed/working-tree охват.

---

## Этап 2. Идентификация user-facing изменений

Из списка изменённых файлов выделить **только то, что меняет поведение для пользователя**. Игнорировать всё остальное (тесты, конфиги, типы без рантайм-эффекта, README, миграции БД сами по себе).

### Маркеры user-facing изменений

| Категория | Где искать | Что важно |
|---|---|---|
| **Новый роут** | `frontend/src/app/components/AppRoutes/AppRoutes.tsx` (диффы по `<Route path=`) | каждая новая `path=` — новый journey-кандидат |
| **Удалённый роут** | то же место, удалённые строки | существующие e2e на этот роут — мёртвые |
| **Новая страница** | новые файлы в `frontend/src/pages/<Name>/` | связан с роутом — нужен smoke-тест |
| **Новая фича** | новые папки в `frontend/src/features/<name>/` | если фича вызывает API и меняет UI — кандидат на journey |
| **Изменения форм / submit-flows** | diff содержит `onSubmit`, `submitFx`, `<Button type="submit"`, новые поля формы | основной user action — обязателен e2e |
| **Изменения в виджете навигации** | `frontend/src/widgets/sidebar/**` | пункт меню добавлен/удалён → проверить smoke |
| **Новый/удалённый backend endpoint** | `backend/src/routes/**`, `backend/src/controllers/**` | если эндпоинт user-facing (не cron/internal) — связанный flow в UI потенциально не покрыт |
| **Изменение бизнес-правила** | `backend/src/services/**` (расчёты, статусы, оплаты, уведомления) | **высокий риск тихой регрессии** — нужен e2e на наблюдаемый эффект |
| **Push / WebSocket события** | `backend/src/lib/websocket*`, `backend/src/services/**Reminder*` | end-to-end сценарий «событие пришло — UI обновился» |

### Что НЕ считать user-facing

- `*.test.*`, `__tests__/**`, `*.styled.ts`, `*.types.ts`, `index.ts` без логики
- `docs/**`, `specs/**`, `*.md`, `package-lock.json`
- Конвенции, ESLint/Prettier, CI-конфиги
- `prisma/migrations/**` сами по себе (важна логика в сервисах, которая ими пользуется)
- Внутренние утилиты без меняющегося контракта

---

## Этап 3. Сверка с существующими тестами

1. Собрать список e2e: `find frontend/e2e -name "*.spec.ts" 2>/dev/null` + распарсить имена из `test.describe(` и теги.
2. Если `frontend/e2e/` не существует — отметить «Стартовое состояние, e2e ещё не писались» и пропустить шаг сверки (всё user-facing считается непокрытым).
3. Для каждого user-facing изменения определить статус:
   - **uncovered** — нет describe/теста, упоминающего этот роут/фичу
   - **possibly-affected** — есть тест, который трогает этот роут/фичу, и diff меняет его поведение (изменены селекторы, тексты кнопок, копи, поля форм)
   - **dead** — фича удалена, но тесты на неё остались
4. Названия/маршруты только помогают найти тесты: прочитать их assertions. Черновик с `@draft` не равен покрытию. Сверка статическая и эвристическая — не заявлять browser run.

---

## Этап 4. Черновики тестов (опционально)

Если пользователь запросил черновики, для **uncovered** изменений уровня роут/страница/новая фича — создать draft-файл:

`frontend/e2e/<area>/<flow>.draft.spec.ts`

Где `<area>` — `auth | students | lessons | profile | reports | admin | dashboard | news` (соответствует `frontend/src/features/`), `<flow>` — kebab-case описание.

**Требования к черновику:**

- Тег `@draft` обязателен — это исключает draft-тесты из обычного прогона (`grep-invert: '@draft'`).
- Структура `test.describe('<рус. название flow>', { tag: ['@draft', '@<area>'] }, () => { ... })`.
- Один-два `test('...', async ({ page }) => { ... })` со скелетом: `page.goto`, ожидаемые шаги в комментариях `// TODO:`, минимальный финальный assert.
- Не пытаться угадать селекторы — оставить `// TODO: подобрать стабильный селектор` рядом с `page.getByRole(...)`.
- В шапке файла комментарий: `// Draft generated by $e2e-check on YYYY-MM-DD. Refine selectors and assertions, then replace the @draft tag with @regression and rename to .spec.ts`.

Не создавать черновики для **possibly-affected** и **dead** — там нужен ручной разбор.

Если черновики уже существуют по тому же пути — НЕ перезаписывать, упомянуть в отчёте.

---

## Этап 5. Отчёт

Отчёт пишется **в stdout пользователю** (короткая текстовая выжимка), а развёрнутая версия — в файл:

1. `mkdir -p docs/e2e-coverage/checks`
2. `docs/e2e-coverage/checks/YYYY-MM-DD-<branch>.md` (если занято — суффикс `-2`).

**Структура файла-отчёта:**

```markdown
# E2E Check — <branch> — YYYY-MM-DD

**Diff base:** <base-ref>
**Изменённых файлов:** N (user-facing: M)
**Существующих e2e:** K (с тегом @regression: K1)

## Резюме

1–2 предложения: главные риски покрытия в этом diff.

## Uncovered (новое без e2e)

- **[Area]** Новый роут `/profile/finance` — `frontend/src/pages/profile/.../FinanceTab.tsx:42`
  Журнал: пользователь открывает Финансы → видит ставку → меняет → сохраняет
  Черновик: `frontend/e2e/profile/finance-tab.draft.spec.ts` ✅ создан
- ...

## Possibly affected (изменения в покрытом flow)

- `frontend/e2e/lessons/create-lesson.spec.ts` — diff трогает `frontend/src/features/lessons/components/CreateLessonForm/...` (изменён лейбл кнопки `Создать` → `Сохранить`); проверить вручную.
- ...

## Dead (фича удалена, тест остался)

- `frontend/e2e/students/old-archive.spec.ts` — фича архива удалена в этом diff (`frontend/src/features/students/archive/...`).
- ...

## Не классифицировано

Файлы, для которых статус неоднозначен (приведены полный список без вердикта — для ручного просмотра).

## Что сделать перед PR

Краткий чеклист: 3–5 пунктов с высшим приоритетом.
```

**Stdout-выжимка пользователю (одно сообщение):**

```
E2E Check: <branch>
- Uncovered: N (черновиков создано: M)
- Possibly affected: K
- Dead: L
Полный отчёт: docs/e2e-coverage/checks/YYYY-MM-DD-<branch>.md
Что делать: <одна строка с главным>
```

---

## Ограничения

- **Только чтение и запись черновиков/отчёта.** Не править прод-код, не запускать `npm test`, не делать git-операций (commit/push/branch).
- **Никаких false positives ради объёма.** Если изменение не задевает поведения для пользователя — не репортить.
- **Без новых конвенций.** Тэги, имена и структура должны соответствовать `docs/conventions/e2e-testing.md` и `frontend/e2e/README.md`. Если расходятся — задать вопрос пользователю, а не выдумывать.
- **Описания на русском.** Имена тестов — на русском (`test.describe('Создание ученика', ...)`), код — TypeScript.
- **Не более 30 пунктов** в каждой секции отчёта; если больше — взять самые важные и сослаться на «полный список см. в diff».
- **Не модифицировать существующие spec-файлы.** Только новые `.draft.spec.ts`. После создания проверить синтаксис/types/lint затронутых тестов; полноценный browser run не является частью этого аудита.
- В финальном сообщении пользователю — путь к отчёту, сводка по секциям, главное действие на одну строку.
