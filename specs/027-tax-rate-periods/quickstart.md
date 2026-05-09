# Quickstart — последовательность реализации фичи 027

Цель: за один прогон пройти от пустой ветки до зелёных тестов и работающего
end-to-end сценария «новый пользователь включает налог → задаёт периоды →
видит корректную статистику с info-iconкой».

Перед стартом убедиться, что находимся на ветке `027-tax-rate-periods`
(в worktree `.claude/worktrees/027-tax-rate-periods`).

## 0. Подготовка

```bash
# Backend
cd backend
npm install
cp .env.example .env  # если ещё нет
cp .env.test.example .env.test  # для интеграционных тестов

# Frontend
cd ../frontend
npm install
```

## 1. Backend: схема БД и миграция

### 1.1 Обновить `backend/prisma/schema.prisma`

См. data-model.md, секция «Изменения в `model User`» и «Новая модель `TaxRatePeriod`».
Обязательно:

- Удалить `User.taxRate Float @default(6.0)` из схемы
- Добавить `User.taxEnabled Boolean @default(false)`
- Добавить связь `User.taxRatePeriods TaxRatePeriod[]`
- Добавить новую модель `TaxRatePeriod` с уникальным составным индексом

### 1.2 Сгенерировать миграцию и data-migration

Поскольку Prisma при удалении колонки сгенерирует чистый `DROP COLUMN`
без переноса данных, миграцию формируем поэтапно:

```bash
cd backend
# Шаг 1: создать таблицу + добавить колонку taxEnabled (taxRate в schema пока ОСТАВИТЬ)
# Подправить schema.prisma: +TaxRatePeriod, +User.taxEnabled — НО оставить User.taxRate
npm run db:migrate -- --create-only --name tax_rate_periods
```

Открыть созданный `prisma/migrations/<ts>_tax_rate_periods/migration.sql`
и руками дополнить data-частью + удалением колонки в конце:

```sql
-- (генерируется Prisma) CREATE TABLE "tax_rate_periods" ...
-- (генерируется Prisma) ALTER TABLE "users" ADD COLUMN "taxEnabled" BOOLEAN ...

-- 1) Создать seed-период для пользователей с явно настроенной ставкой
INSERT INTO "tax_rate_periods" ("id", "userId", "startDate", "rate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text AS id,            -- если расширение pgcrypto/uuid доступно
  u."id",
  COALESCE(MIN(l."startTime"), u."createdAt") AS "startDate",
  u."taxRate",
  NOW(),
  NOW()
FROM "users" u
LEFT JOIN "lessons" l ON l."tutorId" = u."id"
WHERE u."taxRate" <> 6.0
GROUP BY u."id", u."taxRate", u."createdAt";

-- 2) Включить тумблер у этих же пользователей
UPDATE "users" SET "taxEnabled" = true WHERE "taxRate" <> 6.0;

-- 3) Удалить устаревшую колонку
ALTER TABLE "users" DROP COLUMN "taxRate";
```

После правки `migration.sql` убрать `taxRate` из `schema.prisma` (чтобы
сгенерированный клиент его не содержал). Запустить `npm run db:migrate`,
чтобы прогнать миграцию и обновить `_prisma_migrations`.

Если в проекте используется cuid, переписать `gen_random_uuid()::text`
на собственную CUID-генерацию (через временный JS-скрипт `prisma db seed`-стиля
или взять id готовым из приложения, если у пользователей с
`taxRate <> 6.0` в продакшене единицы записей).

### 1.3 Прогенерить клиент и прогнать на тестовой БД

```bash
npm run db:generate
npm run db:migrate:test
```

Тестовая БД должна получить ту же миграцию.

## 2. Backend: сервис расчёта налога

### 2.1 `backend/src/services/taxRate.ts`

Чистые функции (импортируются из контроллеров):

- `resolveRate(date: Date, periods: TaxRatePeriodDto[]): number`
  — возвращает ставку, применимую на дату; `0` если `date < periods[0].startDate`.
- `calcLessonTax(price: number, rate: number): number` — `Math.round(price * rate / 100)`.
- `buildTaxBreakdown(lessons: { price; paymentDate }[], periods: TaxRatePeriodDto[])
   : { taxAmount: number; taxBreakdown: TaxBreakdownEntry[] }` —
  агрегирует по уроком, выдаёт breakdown по ставкам с признаком
  `isOutsidePeriods` для нулевой зоны.

Юнит-тесты в `backend/src/services/__tests__/taxRate.test.ts`:

- пустой список периодов и пустые уроки → `{ taxAmount: 0, taxBreakdown: [] }`
- один период, все уроки внутри → одна строка breakdown с правильным rate
- два периода + уроки до первого → строка с rate=0 + isOutsidePeriods
- округление по уроку, не по итогу (например, 2 урока × 333.5₽ × 6% =
  20+20=40, а не round(667*6/100)=40 — здесь совпадает; провалидировать
  на 333.34 × 6% × 3 уроков, чтобы видеть разницу)
- дробные ставки (6.5%) — округление по уроку

### 2.2 Изменить `backend/src/controllers/statistics/getStatistics.ts`

- Вместо `prisma.user.findUnique({ select: { taxRate: true } })`
  тянуть `select: { taxEnabled: true, taxRatePeriods: { orderBy: { startDate: 'asc' } } }`.
- Для `taxBreakdown` сделать дополнительный `prisma.lesson.findMany({
    where: { tutorId, isPaid: true, paymentDate: paymentDateRange, price: { gt: 0 } },
    select: { price: true, paymentDate: true }
  })` — заменить им/дополнить существующий `paymentsInRange` (его агрегат
  оставить — он используется в других полях).
- Если `taxEnabled === false` → `taxAmount = null; taxBreakdown = null`.
- Иначе — вызвать `buildTaxBreakdown(lessons, periods)`, подставить в ответ.

Тесты в `__tests__/getStatistics.test.ts` — добавить кейсы:
- Пользователь `taxEnabled=false` → ответ `taxAmount: null, taxBreakdown: null`
- Пользователь с двумя периодами и уроками с обеих сторон границы
- Пользователь с одной оплатой до первого периода → `isOutsidePeriods: true` строка

## 3. Backend: CRUD контроллер `tax-periods`

### 3.1 Контроллеры

`backend/src/controllers/taxPeriods/`:

- `listTaxPeriods.ts`: `GET /api/tax-periods` → массив `TaxRatePeriodDto`,
  отсортированный по `startDate ASC`
- `createTaxPeriod.ts`: `POST /api/tax-periods`; валидация `rate ∈ [0,100]`,
  `startDate` парсится; обработка ошибки `P2002` Prisma (уникальность) →
  400 «Период с такой датой начала уже существует»
- `updateTaxPeriod.ts`: `PATCH /api/tax-periods/:id`; те же валидации;
  проверка ownership через `userId` из JWT; обработка `P2002`
- `deleteTaxPeriod.ts`: `DELETE /api/tax-periods/:id`; перед удалением
  проверить `taxEnabled` пользователя и количество периодов; если
  `taxEnabled === true && count === 1` → 400 «Нельзя удалить последний
  период при включённом учёте налога»

Каждый контроллер ≤150 строк, ≤2 уровня вложенности.

### 3.2 Роут и регистрация

`backend/src/routes/taxPeriods.ts` — стандартная регистрация `Router()`;
все эндпоинты под `authenticateToken`. Зарегистрировать в `app.ts`:
`app.use('/api/tax-periods', taxPeriodsRouter)`.

### 3.3 Расширить `updateProfile`

`backend/src/controllers/auth.ts` (или соответствующий файл):

- Принимать поле `taxEnabled: boolean | undefined`
- Если `taxEnabled === true`, проверить `prisma.taxRatePeriod.count({ where: { userId } }) >= 1`;
  иначе 400 «Чтобы включить учёт налога, добавьте хотя бы один период»
- Возвращать обновлённого пользователя с полем `taxEnabled`

### 3.4 Integration-тесты

`__tests__/createTaxPeriod.test.ts`, `updateTaxPeriod.test.ts`,
`deleteTaxPeriod.test.ts`, `listTaxPeriods.test.ts` — каждый покрывает:
- happy path
- 400 на дубликат даты
- 400 на ставку вне диапазона
- 401 без токена
- 404 чужой период
- (для delete) 400 на удаление последнего при `taxEnabled=true`,
  и 200/204 при `taxEnabled=false`

## 4. Frontend: типы, API-клиент, entity-модель

### 4.1 Типы

`frontend/src/shared/types/index.ts`:

```ts
export type TaxRatePeriod = {
  id: string;
  startDate: string;  // ISO date
  rate: number;
};

export type TaxBreakdownEntry = {
  rate: number;
  earnings: number;
  tax: number;
  isOutsidePeriods?: boolean;
};
```

Расширить тип `User` полем `taxEnabled: boolean`.
Расширить тип ответа статистики полями `taxAmount: number | null`,
`taxBreakdown: TaxBreakdownEntry[] | null`.

### 4.2 API-клиент

`frontend/src/shared/api/taxPeriods.ts`:

```ts
export const taxPeriodsApi = {
  list: () => axios.get<TaxRatePeriod[]>('/api/tax-periods').then(r => r.data),
  create: (input: { startDate: string; rate: number }) =>
    axios.post<TaxRatePeriod>('/api/tax-periods', input).then(r => r.data),
  update: (id: string, input: Partial<{ startDate: string; rate: number }>) =>
    axios.patch<TaxRatePeriod>(`/api/tax-periods/${id}`, input).then(r => r.data),
  remove: (id: string) =>
    axios.delete(`/api/tax-periods/${id}`).then(r => r.data),
};
```

### 4.3 Entity-модель

`frontend/src/entities/taxRatePeriod/model/tax-rate-period.model.ts`:

- `$periods: Store<TaxRatePeriod[]>` — серверный список (источник истины)
- `loadPeriodsFx` — `taxPeriodsApi.list`
- Связи: `sample({ clock: ProfilePageGate.open, target: loadPeriodsFx })`
- Юнит-тесты на `fork` — заглушки для `loadPeriodsFx` через `fork({ handlers })`

## 5. Frontend: feature `taxRatePeriods` (модалка + info-icon)

### 5.1 Модель попапа

`frontend/src/features/taxRatePeriods/model/tax-rate-periods-modal.model.ts`:

Сторы и события:
- `$isModalOpen: Store<boolean>`
- `$draftPeriods: Store<DraftPeriod[]>` — снапшот для редактирования;
  каждая `DraftPeriod` имеет `tempId`, `startDate`, `rate`, `_originalId?`
- `modalOpened: Event<void>`, `modalClosed: Event<void>`
- `periodAdded: Event<void>`, `periodRowChanged: Event<{ tempId; field; value }>`,
  `periodRemoved: Event<{ tempId }>`
- `saveRequested: Event<void>` → `savePeriodsFx({ initial, draft })` (на сервер
  отправляются индивидуальные create/update/delete; используется
  Promise.all поверх `taxPeriodsApi`)
- На успех сохранения: refresh `$periods`, `modalClosed`
- На ошибку: показ нотификации, попап остаётся открытым

Юнит-тесты на `fork` покрывают: открытие → snapshot, добавление/удаление
строки, отмена сбрасывает draft, save вызывает корректные API.

### 5.2 UI

`features/taxRatePeriods/ui/TaxRatePeriodsModal/TaxRatePeriodsModal.tsx`:
MUI `<Dialog open={$isModalOpen} onClose={modalClosed}>` со следующими частями:
- `<DialogTitle>Налоговые ставки</DialogTitle>`
- `<DialogContent>` — список `<TaxRatePeriodRow />`, каждая строка:
  date-picker для startDate, число для rate, иконка-удалить.
  Внизу — кнопка `<Button>+ Добавить период</Button>`.
- `<DialogActions>` — `Отмена` → `modalClosed`; `Сохранить` → `saveRequested`.
- Disabled `Сохранить`, если `draft` пустой при `taxEnabled=true`.

`features/taxRatePeriods/ui/TaxRateInfoTooltip/TaxRateInfoTooltip.tsx`:
- Принимает `breakdown: TaxBreakdownEntry[]`
- Рендерит `<InfoOutlinedIcon>` (MUI), обёрнутый в `<Tooltip arrow>`,
  `title` — список строк `X% × Y ₽ = Z ₽`; для записи
  `isOutsidePeriods` — суффикс `(вне настроенных периодов)`.
- Показ управляется и hover, и click (на мобильных).

Тесты RTL: рендер с разной длиной breakdown, открытие тултипа, наличие
строк, корректные значения.

## 6. Frontend: профиль (тумблер + кнопка)

### 6.1 Модель профиля

`frontend/src/pages/profile/models/profile.model.ts`:
- Удалить `$taxRateInput`, `taxRateInputChanged`, и любые ветки c `taxRate`
- Добавить `$taxEnabled: Store<boolean>`, `taxEnabledToggled: Event<boolean>`
- В `updateProfileFx` отправлять `taxEnabled` вместо `taxRate`
- Добавить дисбалд логику: «нельзя сохранить `taxEnabled=true`, если
  `$periods.length === 0`» — раннее предупреждение через нотификацию

### 6.2 UI

`pages/profile/ProfilePage.tsx`:
- В блоке «Налоги» (готовом из 006) заменить инпут процента на
  `<Switch checked={taxEnabled} onChange={...} />`
- Если `taxEnabled` включён, показать кнопку `<Button>Настроить ставки</Button>`,
  диспатч `modalOpened`
- Подключить `<TaxRatePeriodsModal />`

Тесты RTL для `ProfilePage`: рендер с `taxEnabled=false`/`true`, клик
по `Switch`, клик по кнопке открывает попап.

## 7. Frontend: карточка налога на отчётах

### 7.1 `pages/ReportsPage/components/FinancialStatistics/FinancialStatistics.tsx`

- Заменить `taxRate: number` на `taxAmount: number | null`,
  `taxBreakdown: TaxBreakdownEntry[] | null`
- Если оба `null` → не рендерить карточку вовсе
- Иначе:
  - `breakdown.length === 1` → подпись `Налоги ({breakdown[0].rate}%)`,
    info-icon скрыт
  - иначе → подпись `Налоги` + `<TaxRateInfoTooltip breakdown={breakdown} />`
- В тестах: моки на разные варианты ответа `/api/statistics`

## 8. E2E (Playwright)

`frontend/tests/e2e/tax-rate-periods.spec.ts`:
- Регистрируется новый пользователь
- Идёт в профиль — карточка «Налоги» с выключенным тумблером
- Включает тумблер — пытается сохранить — получает нотификацию
  «добавьте хотя бы один период»
- Открывает попап, добавляет 2 периода, сохраняет
- Заходит на отчёты — видит карточку с info-iconкой;
  hover — тултип со списком ставок
- Возвращается в профиль, выключает тумблер — карточки на отчётах нет

## 9. Quality gates перед коммитом

```bash
# Backend
cd backend
npm run lint && npm run build && npm test

# Frontend
cd ../frontend
npm run lint && npm run format:check && npm test && npm run find-cycle
```

Все четыре пункта должны быть зелёными (Constitution VI + workflow).

## 10. Финал

- Обновить `CHANGELOG.md` через `/changelog`
- Сгенерировать пользовательскую новость через `/news`
- Открыть PR через `/commit-commands:commit-push-pr`

## Нюансы и подводные камни

1. **Cuid в data-миграции**: если в схеме используются cuid через `@default(cuid())`,
   raw SQL не сгенерирует совместимый id. Варианты: (а) сгенерировать UUID
   через `gen_random_uuid()::text` (требует расширения pgcrypto), (б) использовать
   Prisma `prisma migrate` + отдельный скрипт с `prisma.taxRatePeriod.create`.
   Выбор — на момент реализации; для маленькой базы вариант (б) безопаснее.

2. **Дата-точность**: `startDate` хранится как `DateTime`, но семантически —
   день. Frontend отправляет ISO без времени; backend парсит в `new Date(...)` —
   дата получается в UTC 00:00. Все сравнения — в UTC.

3. **Округление**: `Math.round(price * rate / 100)` пер-урока
   соответствует «округление по уроку, не по итогу». Тесты должны
   фиксировать именно это поведение, чтобы случайно не «упростить» суммой.

4. **Производительность**: 1000 уроков × 5 периодов в `buildTaxBreakdown`
   — это 5000 операций; на типовом железе < 5 мс. Не оптимизировать
   преждевременно.

5. **WebSocket**: статистика не пушится при правках периодов; пользователь
   видит обновление при следующем переходе на ReportsPage. Это сознательный
   выбор (см. research.md, Decision 12).

6. **Тумблер выключается, периоды остаются**: специально, чтобы при
   повторном включении не нужно было вводить заново. Фронту нужно
   просто скрыть UI без удаления данных.
