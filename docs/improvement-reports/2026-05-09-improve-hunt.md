# Improvement Hunt Report — 2026-05-09

**Всего предложений:** 10
**По impact:** High 10 / Medium 0 / Low 0
**По effort:** S 9 / M 1 / L 0
**Покрытые области:** UX, Security, Performance (backend + frontend), a11y, DX, Maintainability

## Резюме

Главные направления улучшений сосредоточены вокруг трёх кластеров: (1) **производительность Postgres и cron-jobs** — таблица `Lesson` не имеет ни одного `@@index`, при этом в hot-path кронах присутствуют классические N+1; (2) **безопасность модуля screen-upload** — endpoint без rate limiting и с публично известным fallback-секретом; (3) **базовый UX/a11y polish** — пустые экраны при загрузке, IconButton без `aria-label`, дублирование axios-error-helpers по 6 копиям. 9 из 10 пунктов — Quick Wins (High Impact + Small Effort).

Топ-3 быстрых побед: (1) индексы на `Lesson`, (2) rate limit на `/api/screen/upload`, (3) DB-probe в `/health`.

## Quick Wins (High Impact + Small Effort)

1. [Пустой экран при первой загрузке `ReportsPage`](#1-пустой-экран-при-первой-загрузке-reportspage)
2. [Отсутствие индексов на таблице `Lesson`](#2-отсутствие-индексов-на-таблице-lesson)
3. [N+1 в `processScheduledReminders` — до 200 запросов на cron-тик](#3-n1-в-processscheduledreminders--до-200-запросов-на-cron-тик)
4. [`POST /api/screen/upload` без rate limiting](#4-post-apiscreenupload-без-rate-limiting)
5. [`SCREEN_SECRET` с hardcoded fallback](#5-screen_secret-с-hardcoded-fallback)
6. [`DayColumnView` перерендеривается каждую минуту без `memo`](#6-daycolumnview-перерендеривается-каждую-минуту-без-memo)
7. [`IconButton`-кнопки-иконки без `aria-label`](#7-iconbutton-кнопки-иконки-без-aria-label)
8. [Дубликат `AxiosLike` / `extractAxiosError` в 6 местах](#8-дубликат-axioslike--extractaxioserror-в-6-местах)
9. [`/health` не проверяет соединение с БД](#9-health-не-проверяет-соединение-с-бд)

---

## 1. Пустой экран при первой загрузке `ReportsPage`

- **Impact:** High
- **Effort:** S (≤2 ч)
- **Категория:** UX
- **Файл/место:** `frontend/src/pages/ReportsPage/ReportsPage.tsx:26-28`

### Текущее поведение

`$statistics` инициализируется как `null`. При первом открытии страницы срабатывает `loadStatisticsFx`, но компонент рендерит `return null`, пока эффект не завершится. Пользователь видит абсолютно пустой экран без спиннера, без текста, без объяснений.

```tsx
const loading = useUnit(statisticsModel.$isLoading);
const error = useUnit(statisticsModel.$error);

if (!statistics) {
  return null; // пустой экран, даже когда loading === true
}
```

### Предлагаемое улучшение

Развести три состояния — initial loading / error-without-data / data-ready:

```tsx
if (!statistics && loading) {
  return (
    <Styled.CenteredFallback>
      <CircularProgress />
    </Styled.CenteredFallback>
  );
}
if (!statistics && error) {
  return <Styled.ErrorPaper><Typography color="error">{error}</Typography></Styled.ErrorPaper>;
}
if (!statistics) {
  return null;
}
```

### Почему это важно

Первое открытие раздела «Отчёты» **всегда** даёт пустой экран на сотни мс (или секунды на медленном соединении). Пользователь не понимает, грузится страница или сломалась — типичная гипотеза «приложение зависло» провоцирует повторные клики и навигацию.

### Это улучшение, не фича

Данные уже загружаются и состояния `loading`/`error` уже вычисляются — нужно только корректно показать индикатор.

---

## 2. Отсутствие индексов на таблице `Lesson`

- **Impact:** High
- **Effort:** S (≤2 ч + миграция)
- **Категория:** Performance — Backend
- **Файл/место:** `backend/prisma/schema.prisma:87-115`

### Текущее поведение

Модель `Lesson` не имеет ни одного `@@index`. При этом `Student`, `TaxRatePeriod`, `PushSubscription`, `ScheduledReminder` индексы имеют. Все запросы по `tutorId` (обязательный фильтр везде), `startTime` (диапазонные фильтры в `getLessons`, `getStatistics`, cron-ах) и `status` (`lessonStatusUpdater`, `reminderProcessor`) идут seq-scan по таблице.

```prisma
model Lesson {
  tutorId   String
  startTime DateTime
  status    LessonStatus @default(SCHEDULED)
  // ...
  @@map("lessons")
  // @@index — отсутствует
}
```

### Предлагаемое улучшение

```prisma
@@index([tutorId, startTime])          // getLessons (date range), getStatistics, cron
@@index([tutorId, status])             // lessonStatusUpdater, getLessons?status=...
@@index([tutorId, isPaid, status])     // statistics earnings/unpaid aggregates
```

### Почему это важно

`getStatistics` делает 9+ параллельных `count`/`aggregate` по `Lesson`. На пользователе с 500+ уроками каждый запрос — full table scan. Составной индекс `(tutorId, startTime)` сокращает стоимость с O(N) до O(log N + result_set). Это также удешевляет ежеминутный `lessonStatusUpdater`.

### Это улучшение, не фича

Индексы не меняют поведение — только скорость существующих запросов и нагрузку на БД.

---

## 3. N+1 в `processScheduledReminders` — до 200 запросов на cron-тик

- **Impact:** High
- **Effort:** S
- **Категория:** Performance — Backend
- **Файл/место:** `backend/src/services/reminderProcessor.ts:67-97`

### Текущее поведение

После загрузки batch до 100 напоминаний, для **каждого** в цикле выполняются последовательно `findUnique` к `reminderSettings` и `findUnique` к `user`:

```ts
for (const reminder of reminders) {
  const settings = await prisma.reminderSettings.findUnique({
    where: { userId: reminder.userId },
  });
  // ...
  const user = await prisma.user.findUnique({
    where: { id: reminder.userId },
    select: { timezone: true },
  });
}
```

100 напоминаний → до **200 последовательных** запросов на один прогон cron (каждую минуту), даже если уникальных `userId` всего 5.

### Предлагаемое улучшение

```ts
const userIds = [...new Set(reminders.map((r) => r.userId))];
const [settingsMap, usersMap] = await Promise.all([
  prisma.reminderSettings.findMany({ where: { userId: { in: userIds } } })
    .then((rows) => new Map(rows.map((s) => [s.userId, s]))),
  prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } })
    .then((rows) => new Map(rows.map((u) => [u.id, u]))),
]);
// в цикле:
const settings = settingsMap.get(reminder.userId);
const user = usersMap.get(reminder.userId);
```

200 запросов → **2 запроса**.

### Почему это важно

Cron срабатывает каждую минуту. На активной системе с 5+ репетиторами и 2-3 интервалами напоминаний это десятки лишних round-trips каждые 60 секунд. С учётом отсутствия индексов на `Lesson` (см. п.2) совокупный эффект на DB особенно заметен.

### Это улучшение, не фича

Семантика обработки напоминаний не меняется — только способ батчевой загрузки справочников.

---

## 4. `POST /api/screen/upload` без rate limiting

- **Impact:** High
- **Effort:** S
- **Категория:** Security
- **Файл/место:** `backend/src/routes/screen.ts:8-12`

### Текущее поведение

Все остальные чувствительные эндпоинты покрыты `authRateLimiter` / `adminLoginRateLimiter`. Endpoint `/screen/upload` принимает бинарные данные до 5 MB и записывает файл на диск (`writeFileSync`) без какого-либо лимита.

```ts
screenRouter.post(
  "/upload",
  express.raw({ type: ["image/*", "application/octet-stream"], limit: "5mb" }),
  uploadScreen
);
```

### Предлагаемое улучшение

Добавить отдельный `screenUploadRateLimiter` (например, 60 запросов / 15 мин на IP) в `middleware/rateLimit.ts`:

```ts
screenRouter.post("/upload", screenUploadRateLimiter, express.raw(...), uploadScreen);
```

### Почему это важно

С валидным screen-токеном (а fallback-секрет публично известен — см. п.5) злоумышленник может непрерывно заливать 5 MB-файлы, исчерпывая дисковое пространство VPS (300 запросов/мин = 1.5 GB/мин записи на диск).

### Это улучшение, не фича

Бизнес-функционал screen upload работает без лимита; лимит снижает поверхность атаки, не меняя UX легитимного использования.

---

## 5. `SCREEN_SECRET` с hardcoded fallback

- **Impact:** High
- **Effort:** S
- **Категория:** Security
- **Файл/место:** `backend/src/controllers/screen/helpers.ts:3` + `backend/.env.example`

### Текущее поведение

```ts
const SCREEN_SECRET = process.env.SCREEN_SECRET || "screen-monitoring-secret-key";
```

Если `SCREEN_SECRET` не установлена — секрет равен публично известной строке. Любой может сгенерировать валидный токен для произвольного `userId`:
```
hmac256("screen-monitoring-secret-key", userId).slice(0, 16)
```
и заливать файлы на диск под именем `${userId}.ext`. Переменная при этом не задокументирована в `.env.example`.

### Предлагаемое улучшение

Сделать секрет обязательным по аналогии с `getJwtSecret()`:

```ts
const getScreenSecret = (): string => {
  const secret = process.env.SCREEN_SECRET;
  if (!secret) throw new Error("SCREEN_SECRET is not set");
  return secret;
};
```

Добавить в `backend/.env.example`:
```
SCREEN_SECRET="generate-with: openssl rand -hex 32"
```

### Почему это важно

Подделка screen-токена позволяет писать файлы под чужим userId-префиксом. Hardcoded fallback маскирует ошибку конфигурации в продакшене — проблема не выявляется до инцидента.

### Это улучшение, не фича

Функционал не меняется; убирается небезопасный default + добавляется явное требование к конфигурации.

---

## 6. `DayColumnView` перерендеривается каждую минуту без `memo`

- **Impact:** High
- **Effort:** S
- **Категория:** Performance — Frontend
- **Файл/место:** `frontend/src/pages/lessons/components/ScheduleView/DayColumnView/DayColumnView.tsx`, `ScheduleView/ScheduleMain/ScheduleMain.tsx:25-70`

### Текущее поведение

`useNowTicker` обновляет `now: Date` каждые 60 секунд и пробрасывает его в `ScheduleMain → DayColumnView`. Ни один из этих компонентов не обёрнут в `memo`, поэтому каждые 60 секунд React заново рендерит **все** колонки расписания (при загруженных нескольких неделях это 30-60 колонок), включая все `LessonBlock` внутри.

```tsx
{dateRange.map((date) => (
  <DayColumnView key={dateKey} now={now} {...rest} /> // без memo
))}
```

### Предлагаемое улучшение

```tsx
export const DayColumnView = memo<DayColumnViewProps>(({ ... }) => { ... });
```

Дополнительно: вычислять `isToday` и `nowTopPx` в `ScheduleMain` через `useMemo` и передавать в `DayColumnView` булевый `isToday` + опциональное `nowTopPx`. Тогда при тике минуты перерендерится только сегодняшняя колонка.

### Почему это важно

При 60 колонках × ~24 timeslot-ячейки + N `LessonBlock` — это сотни ненужных DOM-операций каждую минуту, постоянно. На слабых девайсах вызывает заметные подергивания.

### Это улучшение, не фича

`memo` не меняет логику — стандартная оптимизация рендера для списочных компонентов с дорогостоящим деревом.

---

## 7. `IconButton`-кнопки-иконки без `aria-label`

- **Impact:** High
- **Effort:** S
- **Категория:** a11y
- **Файл/место:**
  - `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx:76` — `MoreVertIcon`
  - `frontend/src/pages/lessons/components/WeekPagination/WeekPagination.tsx:16,22` — Chevron Left/Right
  - `frontend/src/app/components/InstallPrompt/InstallPrompt.tsx:49` — `CloseIcon`
  - `frontend/src/app/components/AppHeader/AppHeader.tsx:13` — `MenuIcon`
  - `frontend/src/features/lessons/ui/LessonStatusIcons/LessonStatusIcons.tsx:51-59,101-112` — payment / homework toggle (Tooltip не заменяет `aria-label`)

### Текущее поведение

```tsx
<IconButton size="small" onClick={(e) => onMenuClick(e, lesson)}>
  <MoreVertIcon />
</IconButton>

<IconButton onClick={() => lessonsModel.goToPrevWeek()} size="small">
  <ChevronLeft />
</IconButton>
```

Скринридеру элемент объявляется как «button» без контекста. Tooltip в `LessonStatusIcons` не помогает: MUI прокидывает `title`-атрибут, но VoiceOver на интерактивных элементах его игнорирует.

### Предлагаемое улучшение

```tsx
<IconButton aria-label="Меню урока" onClick={...}><MoreVertIcon /></IconButton>
<IconButton aria-label="Предыдущая неделя" ...><ChevronLeft /></IconButton>
<IconButton aria-label="Следующая неделя" ...><ChevronRight /></IconButton>
<IconButton aria-label="Закрыть баннер установки" ...><CloseIcon /></IconButton>
<IconButton aria-label="Открыть меню" ...><MenuIcon /></IconButton>
<IconButton
  aria-label={lesson.isPaid ? "Оплачено — изменить" : "Не оплачено — отметить"}
  ...
/>
```

### Почему это важно

WCAG 2.1 SC 4.1.2 (Name, Role, Value): каждый интерактивный элемент должен иметь доступное имя. Кнопки навигации по неделям и переключения статусов оплаты/ДЗ — самые часто используемые элементы приложения; для пользователей скринридеров они сейчас неюзабельны.

### Это улучшение, не фича

Функциональность кнопок уже реализована; `aria-label` лишь делает её доступной.

---

## 8. Дубликат `AxiosLike` / `extractAxiosError` в 6 местах

- **Impact:** High
- **Effort:** S
- **Категория:** DX / Maintainability
- **Файл/место:**
  - `frontend/src/features/changeEmail/models/changeEmail.helpers.ts:1`
  - `frontend/src/features/changePassword/models/changePassword.helpers.ts:1`
  - `frontend/src/features/lessons/models/lessons-reload.helpers.ts:14`
  - `frontend/src/features/taxRatePeriods/model/tax-rate-periods-modal.helpers.ts:56`
  - `frontend/src/pages/profile/models/profile.helpers.ts:7`
  - `frontend/src/pages/profile/models/finances.helpers.ts:14`
  - плюс 3 inline-применения `as { response?: { data?: { error?: string } } }` в `students/models/studentsFeedback.model.ts:58,70,82`

### Текущее поведение

Один и тот же inline-тип и логика `e.response?.data?.error || e.message || "<дефолт>"` переписаны вручную 6 раз, с уже расходящимися вариантами (`changeEmail.helpers` смотрит `axiosError.message`, `lessons-reload.helpers` принимает `defaultMessage` параметром, остальные имеют локальный `type AxiosLike`).

### Предлагаемое улучшение

Создать `frontend/src/shared/lib/axios-error.helpers.ts`:

```ts
export type AxiosLikeError = {
  response?: { data?: { error?: string } };
  message?: string;
};

export const extractAxiosErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const e = error as AxiosLikeError;
  return e?.response?.data?.error || e?.message || fallback;
};
```

Реэкспортировать через `shared/lib/index.ts` и заменить 6 локальных копий + 3 inline-as.

### Почему это важно

При изменении формата ошибки на бэке (например, `error` → `message`) придётся править 6+ мест. Расхождение **уже** есть. Один helper — одна точка изменения, проще покрыть тестами.

### Это улучшение, не фича

Функциональность не меняется — консолидация существующих копий в одном модуле.

---

## 9. `/health` не проверяет соединение с БД

- **Impact:** High
- **Effort:** S
- **Категория:** Maintainability / Observability
- **Файл/место:** `backend/src/index.ts:51-53`

### Текущее поведение

```ts
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
```

Endpoint всегда возвращает 200, даже если Prisma/PostgreSQL недоступны. nginx, pm2, внешний мониторинг считают сервер живым, пока бизнес-операции продолжают падать с 500.

### Предлагаемое улучшение

```ts
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({
      status: "ERROR",
      reason: "database_unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});
```

Дополнительно — добавить post-deploy probe в `.github/workflows/deploy.yml` после `pm2 restart backend`:
```yaml
sleep 5
curl --fail --silent --max-time 10 http://localhost:3001/health || (pm2 logs backend --lines 50 && exit 1)
```

### Почему это важно

При потере соединения с БД (миграция зависла, диск переполнен, креденшелы протухли) сейчас никто не узнает до жалоб пользователей. Probe в deploy дополнительно ловит «молчаливые» сбои в момент релиза.

### Это улучшение, не фича

Endpoint уже существует и его уже опрашивают (мониторинг/деплой). Меняется лишь то, что endpoint начинает делать свою заявленную работу — проверять готовность сервиса.

---

## 10. N+1 в `processRecurringLessons` — до 65 запросов на cron-прогон

- **Impact:** High
- **Effort:** M (полдня)
- **Категория:** Performance — Backend
- **Файл/место:** `backend/src/services/recurringLessons.ts:44-63`

### Текущее поведение

Для каждой недели в 3-месячном горизонте (~13 итераций на recurring-pattern) выполняется отдельный `findMany` для проверки конфликтов:

```ts
while (currentStart <= threeMonthsFromNow) {
  const conflicts = await prisma.lesson.findMany({   // ← 1 запрос на неделю
    where: {
      tutorId: lastLesson.tutorId,
      status: { not: "CANCELLED" },
      OR: [{ startTime: { lt: currentEnd }, endTime: { gt: currentStart } }],
    },
  });
  // ...
}
```

При 5 уникальных recurring-паттернов = 5 × 13 ≈ **65 запросов** в одном cron-прогоне 2 AM. Все — по таблице без индексов (см. п.2).

### Предлагаемое улучшение

Загрузить все существующие уроки репетитора в диапазоне `[now, +3 мес]` одним запросом до цикла, делать конфликт-проверку in-memory:

```ts
const existingLessons = await prisma.lesson.findMany({
  where: {
    tutorId: lastLesson.tutorId,
    status: { not: "CANCELLED" },
    startTime: { lt: threeMonthsFromNow },
    endTime: { gt: new Date() },
  },
  select: { startTime: true, endTime: true },
});
// в цикле:
const hasConflict = existingLessons.some(
  (l) => l.startTime < currentEnd && l.endTime > currentStart,
);
```

65 запросов → 1 запрос на паттерн.

### Почему это важно

Daily cron в 2 AM — единственная задача, длительно держащая соединение с БД. Сокращение в 65× напрямую уменьшает окно, в течение которого БД нагружена ночными расчётами; масштабируется хорошо при росте числа репетиторов.

### Это улучшение, не фича

Семантика конфликт-контроля сохраняется полностью — меняется только способ загрузки данных (батч вместо цикла).
