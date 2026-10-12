# Data Model: История поступлений (035-income-history)

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 1. Хранимое: `Lesson.receivedAmount`

```prisma
model Lesson {
  // ...
  price          Decimal?  @db.Decimal(10, 2)
  isPaid         Boolean   @default(false)
  paymentDate    DateTime? // Дата оплаты урока
  receivedAmount Decimal?  @db.Decimal(10, 2) // Сколько реально пришло за урок; null у неоплаченного
  isTaxExempt    Boolean   @default(false)
  // ...
}
```

Миграция `backend/prisma/migrations/<ts>_add_lesson_received_amount/migration.sql`:

```sql
ALTER TABLE "lessons" ADD COLUMN "receivedAmount" DECIMAL(10,2);
UPDATE "lessons" SET "receivedAmount" = COALESCE("price", 0) WHERE "isPaid" = true;
```

Новых индексов нет (research R1).

### Инварианты

| # | Инвариант | Кто держит |
|---|---|---|
| I1 | `isPaid = false` ⇒ `receivedAmount IS NULL` | `resolveReceivedAmount`, ветка отмены в `updateLesson.ts`, test-support |
| I2 | `isPaid = true` ⇒ `receivedAmount IS NOT NULL`, `0 ≤ receivedAmount ≤ 99 999 999,99`, не больше 2 знаков | бэкфилл, `resolveReceivedAmount`, перенос оплаты, валидатор R4 |
| I3 | Правка `price` (форма, распространение на серию) не меняет `receivedAmount` | `updatePriceForFutureRecurringLessons` пишет только `price`; `resolveReceivedAmount` |
| I4 | В кабинет ученика `receivedAmount` не уходит | явный маппинг `toStudentLessonResponse` и WS-payload |

### Жизненный цикл

```text
                 PUT { isPaid: true, paymentDate, receivedAmount? }
  [не оплачен] ──────────────────────────────────────────────────▶ [оплачен]
  received=NULL     received := receivedAmount ?? price(тела) ?? price ?? 0   received=M
       ▲                                                              │
       │  PUT { isPaid: false }               PUT { receivedAmount: X }│ (форма, урок остаётся
       │  PUT { status: CANCELLED } (если есть paymentDate)            │  оплаченным, дата не меняется)
       └──────────────────────────────────────────────────────────────┘
                 received := NULL           received := X

  Отмена с переносом: получатель  isPaid := true, paymentDate := P, received := M (отменённого)
                      отменённый  isPaid := false, paymentDate := NULL, received := NULL
  Правка price / распространение цены на серию: received не меняется
```

## 2. Производное: оплата (поступление)

Отдельной таблицы нет (Key Entities). Оплата — урок, отобранный
`paidInRangeWhere(userId, range)`:

```ts
{
  tutorId: userId,
  isPaid: true,
  receivedAmount: { gt: 0 },
  OR: [{ paymentDate: range }, { paymentDate: null, startTime: range }],
}
```

- **Сумма оплаты** — `receivedAmount`.
- **Эффективная дата** — `paymentDate ?? startTime`.
- **День** — `toDateKeyInTimezone(effectiveDate, timezone)` (`YYYY-MM-DD`
  в поясе `X-Timezone`, `UTC` по умолчанию).
- **Статус урока** — любой (FR-002).

Тот же `where` у карточки «Поступления за период», налога, необлагаемых
и истории (research R6, R9).

## 3. Строка истории (`IncomeHistoryEntry`)

| Поле | Тип | Источник |
|---|---|---|
| `lessonId` | `string` | `lesson.id` |
| `student` | `{ name: string; archived: boolean } \| null` | `lesson.student` (текущее имя) |
| `prospectName` | `string \| null` | `lesson.prospectName` (пробный урок без ученика) |
| `subject` | `Subject` | `lesson.subject` |
| `lessonType` | `LessonType` | `lesson.lessonType` |
| `lessonStartTime`, `lessonEndTime` | ISO `string` | `lesson.startTime`, `lesson.endTime` |
| `lessonStatus` | `LessonStatus` | `lesson.status` |
| `price` | `number` | текущая `lesson.price ?? 0` (для значка расхождения) |
| `receivedAmount` | `number` | `lesson.receivedAmount` |
| `hasPaymentDate` | `boolean` | `lesson.paymentDate !== null` (FR-007) |
| `tax` | `IncomeHistoryTax \| null` | research R8; `null` при выключенном учёте налога |
| `commissionCredit` | `number \| null` | FACT-зачёт из `allocateCommission`; `null`, если учеников с комиссией нет или зачёта у урока нет |

```ts
type IncomeHistoryTax =
  | { kind: "TAXED"; amount: number; rate: number }  // rate в процентах, 0% — тоже TAXED
  | { kind: "OUTSIDE_PERIODS" }                       // налог 0 ₽, «вне настроенных периодов»
  | { kind: "EXEMPT" };                               // «Не облагается налогом»
```

**Порядок строк внутри дня** (FR-006, research R10):
`(имя группы ru-collation, ключ группы, lessonStartTime, lessonId)`,
группа — `student.id` или `prospect:<lessonId>`.

## 4. День (`IncomeHistoryDay`)

| Поле | Тип | Правило |
|---|---|---|
| `date` | `string` | ключ дня `YYYY-MM-DD` |
| `total` | `number` | Σ `receivedAmount` строк дня (в копейках, /100) |
| `taxTotal` | `number \| null` | Σ `tax.amount` строк `TAXED`; `null` при выключенном учёте налога |
| `entries` | `IncomeHistoryEntry[]` | все оплаты дня, день никогда не делится |

Дни идут от новых к старым (FR-003).

## 5. Итог периода (`IncomeHistorySummary`)

Считается по **всем** оплатам периода, независимо от порции (FR-013).

| Поле | Тип | Должно совпадать с (`GET /api/statistics`) |
|---|---|---|
| `total` | `number` | `paymentsInRangeSum` |
| `count` | `number` | `paymentsInRangeCount` |
| `taxTotal` | `number \| null` | `taxAmount` (null ⇔ null) |
| `taxExemptTotal` | `number \| null` | `taxExemptIncome` (null ⇔ null) |
| `commissionTotal` | `number \| null` | `commissionWrittenOffSum`; `null` ⇔ `hasCommissionStudents = false` |

## 6. Порция (`IncomeHistoryPage`)

| Поле | Тип | Правило |
|---|---|---|
| `nextCursor` | `string \| null` | ключ последнего дня в ответе, если есть более старые дни; иначе `null` |
| `remainingCount` | `number` | число оплат в днях старше последнего дня ответа |

Нарезка (research R11): дни после фильтра курсора набираются, пока
следующий день помещается в 50 оплат; первый день берётся целиком всегда.
`before=<day>` — дни строго старше; `through=<day>` — все дни не старше
`day`, без предела 50.

## 7. Состояние фронта

### `pages/ReportsPage/model/statistics.model.ts` (изменить)

| Юнит | Тип | Назначение |
|---|---|---|
| `periodApplied` | `Event<{ startDate: string; endDate: string }>` | гейт или «Обновить» с границами дня |
| `$appliedRange` | `Store<{ startDate: string; endDate: string } \| null>` | период, по которому загружены карточки и история |

### `pages/ReportsPage/model/reportsTabs.model.ts` (создать)

| Юнит | Тип | Назначение |
|---|---|---|
| `$activeTab` | `Store<"summary" \| "history">` | по умолчанию `"summary"`, не сбрасывается при закрытии гейта |
| `tabChanged` | `Event<ReportsTab>` | переключение вкладки, ничего не загружает |

### `pages/ReportsPage/model/incomeHistory.model.ts` (создать)

| Юнит | Тип | Назначение |
|---|---|---|
| `$incomeHistory` | `Store<IncomeHistory \| null>` | итог + загруженные дни + `page` |
| `$incomeHistoryError` | `Store<string \| null>` | ошибка первой порции |
| `$nextPageError` | `Store<string \| null>` | ошибка порции «Показать ещё» |
| `$isNextPageLoading` | `Store<boolean>` | `loadNextPageFx.pending` (не в `$isBlocking`) |
| `$historyVersion` | `Store<number>` | поколение запроса для отбрасывания устаревших ответов |
| `incomeHistoryRequested` | `Event<{ startDate; endDate; through? }>` | запрос первой порции / глубины |
| `incomeHistoryNextPageRequested` | `Event<void>` | кнопка «Показать ещё» и «Повторить» |
| `loadIncomeHistoryFx` | `Effect<{ startDate; endDate; through?; version }, IncomeHistory>` | в `$isBlocking` |
| `loadNextPageFx` | `Effect<{ startDate; endDate; before; version }, IncomeHistory>` | не в `$isBlocking` |

### `pages/ReportsPage/model/incomeHistoryReload.model.ts` (создать)

| Юнит | Назначение |
|---|---|
| sample на `lessonModel.updateLessonFx.done` / `removeLessonFx.done` при `ReportsPageGate.status` | `loadStatisticsFx($appliedRange)` + `incomeHistoryRequested({ ...$appliedRange, through: lastDay })` |
| `incomeHistoryLessonOpened: Event<string>` | клик по строке |
| `openLessonFx: Effect<string, Lesson>` | `lessonsApi.getById`, в `$isBlocking` |
| sample `openLessonFx.doneData` → `lessonsModel.viewDialogOpened` | попап поверх вкладки |
| sample `openLessonFx.failData` (404) → уведомление + перезагрузка на глубину | FR-036 |

### `features/lessons` (изменить)

| Юнит | Изменение |
|---|---|
| `lessonActionsModel.lessonPaymentChanged` | payload `+ receivedAmount?: number`; в `PUT` уходит только при `isPaid: true` |
| `PaymentStatus.model` | `confirmDialogOpened({ isPaid, price })`, `$receivedAmountInput`, `$receivedAmountError`, `receivedAmountChanged` |
| `LessonStatusIcons.model` | `paymentDialogOpened({ lessonId, price })`, `$receivedAmountInput`, `$receivedAmountError`, `receivedAmountChanged` |
| `lessonFormModel` | `LessonFormData.receivedAmount: string`, `$receivedAmountError`, `$canSubmit` учитывает ошибку |
| `Lesson` (`shared/types/lesson.ts`) | `receivedAmount?: number \| null` (без мок-маркера) |
| `UpdateLessonDto` (`shared/types/lesson.ts`) | `receivedAmount?: number` |

## 8. Валидация «Получено»

| Правило | Фронт (`validateReceivedAmount`) | Бэк (`validateUpdateData`) |
|---|---|---|
| пусто | «Укажите полученную сумму» | — (поле не передано = не менять) |
| не число / < 0 | «Сумма должна быть неотрицательным числом» | `RECEIVED_AMOUNT_INVALID_ERROR` |
| > 99 999 999,99 | «Сумма не может превышать 99 999 999,99 ₽» | `RECEIVED_AMOUNT_INVALID_ERROR` |
| > 2 знаков после запятой | «Не больше двух знаков после запятой» | `RECEIVED_AMOUNT_INVALID_ERROR` |
| сумма у неоплаченного урока | поле не показывается и не отправляется | `RECEIVED_AMOUNT_UNPAID_ERROR` |
| `0` | допустимо | допустимо |
