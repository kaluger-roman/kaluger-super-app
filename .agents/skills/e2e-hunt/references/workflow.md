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
- Существующие отчёты: `ls -t docs/e2e-coverage/ 2>/dev/null | grep -v '^checks$' | head -5 || echo "(папка ещё не создана)"`
- Существующие e2e: `find frontend/e2e -name "*.spec.ts" 2>/dev/null | wc -l | xargs echo "тестов:"`

## Задача

Пройти по приложению по фичам, выявить **user journeys** (последовательности действий, где пользователь получает ценность), сверить с уже написанными e2e и сформировать приоритизированный список того, что стоит покрыть в первую очередь.

Записать отчёт в `docs/e2e-coverage/YYYY-MM-DD-e2e-hunt.md` (если файл с этой датой уже есть — суффикс `-2`, `-3`, …).

**Не более 25 journey-кандидатов в одном отчёте.** Тесты НЕ писать — только репортить и приоритизировать.

`$ARGUMENTS`:
- пусто → инвентаризация всех областей
- `<area>` (auth | students | lessons | profile | reports | admin | dashboard | news) → только указанная область

### Что считается user journey, а что нет

| ✅ Journey | ❌ Не journey |
|---|---|
| «Учитель создаёт ученика → видит его в списке → открывает карточку» | «Кнопка Сохранить имеет border-radius 4px» |
| «Учитель проводит урок → списывается оплата → пересчитывается баланс» | «Тултип на иконке появляется через 200мс» |
| «Учитель восстанавливает пароль через email → логинится с новым» | «Валидация email содержит @ — проверена в 5 формах» |
| «Учитель получает push о напоминании урока за 15 мин» | «Цвет статуса урока совпадает с темой» |

Ключевой тест: «Если этот сценарий сломается — учитель пожалуется/потеряет деньги/не сможет работать?» Если да — journey, репортить. Если «увидит косметический баг» — не journey (это unit/visual тест, не e2e).

---

## Этап 1. Параллельное исследование областей

Запустить **параллельно в пределах доступных слотов, остальные роли — следующими волнами** несколько subagent'ов с ролью code explorer параллельно — по одному вызову на область. Каждому subagent дать узкий фокус.

**Обязательные области (если `$ARGUMENTS` пусто):**

1. **Auth** — регистрация, логин, email verification, восстановление пароля, смена email/пароля, logout
   - Корневые пути: `frontend/src/features/auth`, `frontend/src/features/emailVerification`, `frontend/src/features/changeEmail`, `frontend/src/features/changePassword`, `frontend/src/pages/forgotPassword`, `backend/src/services/auth*`

2. **Students** — список, создание, редактирование, удаление/архив, привязка к урокам
   - Корневые пути: `frontend/src/pages/students`, `frontend/src/features/students`, `backend/src/services/student*`, `backend/src/controllers/student*`

3. **Lessons** — создание разового, recurring-серия, проведение, отмена, изменение статуса, влияние на оплату, расписание/календарь
   - Корневые пути: `frontend/src/pages/lessons`, `frontend/src/features/lessons`, `backend/src/services/lesson*`, cron'ы recurring/status

4. **Profile / Finance** — настройки профиля, налоговые периоды/ставки, отображение финансов, смена email/пароля из профиля
   - Корневые пути: `frontend/src/pages/profile`, `frontend/src/features/taxRatePeriods`, `backend/src/services/taxPeriod*`

5. **Reports** — отчёты по урокам, ученикам, доходам, фильтры, экспорт
   - Корневые пути: `frontend/src/pages/ReportsPage`

6. **Admin** — административные функции (если есть)
   - Корневые пути: `frontend/src/pages/AdminPage`, `frontend/src/features/admin`, `backend/src/controllers/admin*`

7. **Dashboard / News** — стартовый экран, сводка, лента новостей, нотификации
   - Корневые пути: `frontend/src/pages/dashboard`, `frontend/src/pages/news`, `frontend/src/features/news`, `frontend/src/features/notificationSettings`

8. **PWA / Real-time** — push-напоминания, WebSocket события, offline indicator
   - Корневые пути: `frontend/src/app/__tests__/offline*`, push-related в `backend/src/services/`, `backend/src/lib/websocket*`

Если `$ARGUMENTS` указывает на конкретную область — запустить **только её** subagent.

**Промпт для subagent (адаптировать под область):**

> Тебе нужно составить список **user journeys** (3–6 шт.; для e2e-инвентаризации лимит до 6 на область) для области `<область — конкретные пути>` приложения tutor-app (учёт частных уроков, RU рынок).
>
> **Что такое journey:** последовательность действий пользователя (учителя), где он получает ценность или выполняет завершённое действие. От старта (вход на экран / клик) до результата (данные сохранены / страница обновлена / уведомление пришло). Не отдельный клик, не валидация поля, не визуальная деталь.
>
> **Шаги:**
> 1. Прочитай ключевые файлы области (роуты, страницы, фичи, сервисы).
> 2. Определи 3–6 главных journeys, которые **должны работать**, чтобы учитель не потерял деньги/время/данные.
> 3. Для каждого journey укажи: название, шаги (3–8 шт.), какие компоненты задействованы, какие API-эндпоинты, наблюдаемый результат (что должно стать видимо/сохраниться).
> 4. Проставь приоритет: **Critical** (деньги/auth/core CRUD без которого приложение бесполезно), **High** (часто используемое), **Medium** (важное, но редко), **Low** (edge-case).
>
> Верни в строгом формате:
>
> ```
> N. **[Critical|High|Medium|Low]** Краткое название journey
>    Область: <area-tag, например @auth, @lessons>
>    Шаги:
>      1. ...
>      2. ...
>    Задействовано (frontend): pages/.../X.tsx, features/.../Y.tsx
>    Задействовано (backend): services/Z.ts, controllers/W.ts (POST /api/...)
>    Наблюдаемый результат: ...
>    Почему важен: 1 предложение про ценность для пользователя
> ```
>
> **Ограничения:**
> - Не предлагай journey, который полностью покрывается unit-тестом (формат даты, валидация формы) — это не e2e.
> - Не дублируй варианты одного и того же journey ради объёма (один happy path + один critical edge case достаточно).
> - **Контекст проекта.** Tutor app для RU рынка. Frontend — FSD + Effector + MUI. Backend — Express + Prisma + PostgreSQL + WebSocket. UI на русском. Реальные пользователи — учителя математики/физики, ведущие частные уроки.

---

## Этап 2. Сверка с существующими тестами

1. Собрать инвентарь: `rg --files frontend/e2e -g "*.spec.ts"` → распарсить `test.describe('...')` и теги.
2. Если папки `frontend/e2e/` нет — отметить «стартовое состояние, всё непокрыто».
3. Для каждого journey-кандидата от subagent'ов определить:
   - **uncovered** — нет соответствующего describe/теста
   - **partial** — describe есть, но покрывает только часть шагов
   - **covered** — есть describe + основные шаги покрыты тестом

Имена describe, теги и `page.goto` — только указатели для поиска. Прочитать действия и assertions тестов; `@draft` не считать полноценным покрытием. Статическая сверка остаётся эвристикой, а не доказательством успешного browser run.

---

## Этап 3. Финальная валидация и приоритизация

1. Дедуплицировать journey-кандидатов (один journey от нескольких subagent'ов — оставить с лучшей формулировкой).
2. Если journey уже **covered** — не включать в отчёт (упомянуть только в резюме как «уже покрыто: K journeys»).
3. Отбросить кандидатов, которые на проверку оказались не journey (фича/визуальная деталь/чисто unit-уровень).
4. Если суммарно > 25 — взять по приоритету: Critical → High → Medium → Low.

---

## Этап 4. Отчёт

1. `mkdir -p docs/e2e-coverage`
2. Имя файла: `docs/e2e-coverage/YYYY-MM-DD-e2e-hunt.md` (если занято — `-2`, `-3`).
3. Записать отчёт по структуре ниже.

**Структура отчёта:**

```markdown
# E2E Coverage Hunt — YYYY-MM-DD

**Всего предложено journeys:** N
**По приоритету:** Critical X / High Y / Medium Z / Low W
**По статусу покрытия:** uncovered A / partial B (covered K — не входят в отчёт)
**Покрытые области:** Auth, Students, Lessons, Profile, Reports, Admin, Dashboard, PWA

## Резюме

2–3 предложения о главных пробелах в покрытии. Указать топ-3 первоочередных journeys (Critical + uncovered).

## Топ-3 на ближайший PR

Быстрые ссылки на 3 пункта ниже, которые стоит покрыть первыми.

---

## 1. [Название journey]

- **Приоритет:** Critical | High | Medium | Low
- **Статус:** uncovered | partial
- **Тег:** `@<area>` (например `@auth`, `@lessons`)
- **Существующие тесты по области:** `frontend/e2e/<area>/...spec.ts` (если есть partial)

### Шаги journey

1. Учитель открывает …
2. Заполняет …
3. Нажимает …
4. Видит …

### Задействованные модули

- Frontend: `pages/.../X.tsx`, `features/.../Y.tsx`
- Backend: `services/Z.ts` (`POST /api/...`)

### Наблюдаемый результат

Что становится видно / сохраняется / приходит в виде уведомления.

### Почему критичен

Одно предложение про ценность / деньги / риск.

### Что покрыто сейчас

Если **partial** — какие именно шаги покрыты в каком файле; чего не хватает.
Если **uncovered** — «Покрытия нет».

---

## 2. ...
```

**Stdout-выжимка пользователю:**

```
E2E Hunt — N предложений (Critical X / High Y / Medium Z / Low W)
Покрыто уже: K, нужно покрыть: A uncovered + B partial
Топ-3: <3 коротких названия>
Полный отчёт: docs/e2e-coverage/YYYY-MM-DD-e2e-hunt.md
```

---

## Ограничения

- **Только чтение и запись отчёта.** Не писать тесты, не править прод-код, не делать git-операций.
- **Максимум 25 journey-кандидатов** на отчёт. Приоритизация Critical → High → Medium → Low.
- **Не репортить:** unit-уровневые проверки (валидация формата, расчёты), визуальные мелочи (border, padding), фичи которые ещё не реализованы (для них есть spec-документы).
- **Описания на русском.** Тэги/имена тестов — формат для последующего использования в `test.describe('...', { tag: ['@regression', '@<area>'] })`. Приоритет (Critical/High/…) живёт только в тексте отчёта: линтер принимает лишь теги из тэг-схемы `docs/conventions/e2e-testing.md`.
- **Не пересекаться с уже покрытым** — covered journeys не включать в основной список.
- В финальном сообщении пользователю — путь к отчёту, сводка по приоритетам и статусам, топ-3.
