# Research: История поступлений в отчётах (035-income-history)

**Feature**: `035-income-history` | **Phase**: 0 | **Spec**: [spec.md](./spec.md)

Спека утверждена, маркеров `[NEEDS CLARIFICATION]` нет; четыре развилки
закрыты в Clarifications (снимок полученной суммы, поле «Получено»,
отдельная вкладка, порции по 50 с сервера). Ниже технические решения,
которые спека оставляет реализации. Всё проверено по коду этого worktree
(ветка `035-income-history`, макеты с 18 маркерами `TODO(auto-feature)`).

---

## R1. Хранение: `Lesson.receivedAmount` + бэкфилл

**Decision**: `receivedAmount Decimal? @db.Decimal(10, 2)` в модели `Lesson`
(`backend/prisma/schema.prisma`), рядом с `isPaid` / `paymentDate`.
Миграция `add_lesson_received_amount` создаётся `prisma migrate dev
--create-only`, затем в `migration.sql` дописывается бэкфилл:

```sql
ALTER TABLE "lessons" ADD COLUMN "receivedAmount" DECIMAL(10,2);
UPDATE "lessons" SET "receivedAmount" = COALESCE("price", 0) WHERE "isPaid" = true;
```

Инвариант на уровне приложения: `isPaid = true ⇔ receivedAmount IS NOT NULL`.
Индекс не нужен.

**Rationale**:

- Тот же тип, что `price` и `Student.commissionAmount`: копейки и предел
  99 999 999,99 ₽ (FR-015, FR-020a) задаёт сам `Decimal(10,2)`.
- Nullable: у неоплаченного урока полученной суммы нет (FR-015, Key Entities).
  `0` и `NULL` различаются: `0` — «оплачен, денег не пришло» (Edge Cases).
- `COALESCE(price, 0)`: старый оплаченный урок без стоимости получает 0 ₽,
  как требует Edge Case «урок отмечен оплаченным при стоимости 0 или без
  стоимости». Неоплаченным ничего не пишется (FR-021).
- После бэкфилла `receivedAmount = price` у всех оплаченных уроков, поэтому
  каждый агрегат, переведённый на `receivedAmount` (R6), даёт ровно прежнее
  значение (SC-006): `SUM(price)` по оплаченным = `SUM(receivedAmount)`,
  фильтр `price > 0` = фильтр `receivedAmount > 0`.
- Индекс: история и карточки отбирают оплаты существующим
  `paidInRangeWhere` (`tutorId`, `isPaid`, `OR` по датам); его покрывает
  `@@index([tutorId, isPaid, status])`. Год — порядка 1000 строк на
  репетитора, полный перебор по индексу `tutorId` занимает миллисекунды.

**Alternatives considered**:

- `CHECK ("isPaid" = ("receivedAmount" IS NOT NULL))` в БД. Ловил бы забытый
  путь записи, но ломает test-support `PATCH /lessons/:id` и любые
  ручные правки; инвариант держат один хелпер записи (R3) и тесты.
  Отклонено (принцип VII).
- Отдельная таблица платежей. Спека прямо исключает составные оплаты
  и отдельную сущность «поступление» (Key Entities). Отклонено.
- Бэкфилл в коде при старте или отдельным скриптом. Одна SQL-строка
  в той же миграции атомарна и выполняется на деплое
  (`prisma migrate deploy`). Отклонено.

---

## R2. Имена и контракт

**Decision**: `receivedAmount` во всех слоях: Prisma, `UpdateLessonDto`
(бэк и фронт), фронтовый `Lesson.receivedAmount?: number | null`,
`LessonFormData.receivedAmount: string`, payload
`lessonPaymentChanged({ lessonId, isPaid, paymentDate?, receivedAmount? })`.
История — типы из макета `frontend/src/shared/types/incomeHistory.ts`
(`IncomeHistory`, `IncomeHistoryDay`, `IncomeHistoryEntry`,
`IncomeHistorySummary`, `IncomeHistoryPage`, `IncomeHistoryTax`)
без изменений; бэкенд отдаёт ровно эту форму.

**Rationale**: имена зафиксированы в маркерах `TODO(auto-feature)`
утверждённых макетов (`lesson.receivedAmount`, `formData.receivedAmount`,
`$incomeHistory`, `history.page.nextCursor`). Сериализация `Decimal` →
`number` уже глобальная (`backend/src/lib/prisma.ts`, `toJSON`), поэтому
`GET /api/lessons*` отдаёт поле числом без правок контроллеров.

---

## R3. Все пути записи оплаты на бэкенде

Полный обход кода (`grep isPaid backend/src`), пути, где урок становится
оплаченным или неоплаченным:

| Путь | Где | Что делать |
|---|---|---|
| Переключатель оплаты в попапе, значок на карточке, форма | `PUT /api/lessons/:id` → `buildLessonUpdateData` (`services/lessonUpdate/lessonUpdate.helpers.ts`), `...updateData` уходит в Prisma | новый чистый хелпер `resolveReceivedAmount` (ниже) |
| Отмена оплаченного урока (снятие оплаты) | `controllers/lessons/updateLesson.ts`, ветка `status === "CANCELLED" && isPaid && paymentDate` | дописать `dataToUpdate.receivedAmount = null` рядом с `paymentDate = null` |
| Перенос оплаты на следующий урок | `services/lessonUpdate/lessonUpdate.ts`, `tx.lesson.update({ isPaid: true, paymentDate })` | добавить `receivedAmount: existingLesson.receivedAmount` (FR-019) |
| Создание урока | `services/lessonCreation` пишет поля явно, `isPaid` не принимает | изменений нет, `receivedAmount` в create игнорируется |
| Ночной cron серий | `services/recurringLessons.ts` создаёт неоплаченные | изменений нет |
| Распространение цены на серию | `updatePriceForFutureRecurringLessons` пишет только `price` (и у предоплаченных уроков тоже) | изменений нет: снимок не трогается (FR-017, US2 сц. 12); закрепить тестом |
| Сдвиг серии | `applyShiftFutureRecurringLessons` пишет только время | изменений нет |
| Статус-крон | `lessonStatusUpdater.ts` оплату не трогает | изменений нет |
| e2e-сидирование | `routes/testSupport.ts` `POST /lessons`, `PATCH /lessons/:id` | принимать `receivedAmount`; при `isPaid` без него писать `price ?? 0`, при `isPaid: false` писать `null` |
| Бэкап | `services/backup.ts` (дамп БД целиком) | изменений нет, колонка попадает в дамп сама |

**Decision — `resolveReceivedAmount(updateData, existingLesson)`**
(чистая функция в `lessonUpdate.helpers.ts`, вызывается из
`buildLessonUpdateData`; сырое `updateData.receivedAmount` в `dataToUpdate`
не пробрасывается, только результат хелпера):

```text
wasPaid  = existingLesson.isPaid
willPay  = updateData.isPaid ?? wasPaid
if wasPaid && !willPay           → null                       (FR-018)
if !wasPaid && willPay           → updateData.receivedAmount
                                    ?? updateData.price ?? existingLesson.price ?? 0   (FR-016)
if wasPaid && willPay
   && receivedAmount передан     → updateData.receivedAmount   (FR-020)
иначе                            → не менять (ключа нет в dataToUpdate)   (FR-017)
```

Цена по умолчанию берётся из того же тела (`updateData.price`), если форма
одним сохранением поменяла цену и поставила оплату: так сервер совпадает
с полем «Получено», которое по умолчанию показывает цену из формы (FR-016,
US2 сц. 9).

**Rationale**: `buildLessonUpdateData` уже единственная точка, где тело
`PUT` превращается в данные Prisma; форма шлёт `isPaid: true` при каждом
сохранении оплаченного урока, поэтому «переход в оплачен» определяется
только сравнением с `existingLesson.isPaid`, а не наличием `isPaid` в теле.
Повторное сохранение формы без правки «Получено» шлёт то же значение,
которое уже лежит в БД, и сумма не меняется (US2 сц. 10).

---

## R4. Валидация `receivedAmount`

**Decision**: в `validateUpdateData`
(`controllers/lessons/updateLesson.validators.ts`), если
`updateData.receivedAmount !== undefined`:

1. `typeof !== "number"`, `!Number.isFinite`, `< 0`, `> 99_999_999.99`
   или больше двух знаков после запятой
   (`Math.abs(Math.round(v * 100) - v * 100) > 1e-6`) → `400`
   `RECEIVED_AMOUNT_INVALID_ERROR = "Полученная сумма должна быть неотрицательным числом не больше 99 999 999,99 ₽ с точностью до копеек"`.
2. Итоговое состояние урока не оплачен (`(updateData.isPaid ?? existingLesson.isPaid) !== true`)
   → `400` `RECEIVED_AMOUNT_UNPAID_ERROR = "Полученную сумму можно указать только у оплаченного урока"`.

`null`, строки и `NaN` отклоняются первым правилом (стереть сумму можно
только снятием оплаты). Константы рядом с `TAX_EXEMPT_INVALID_ERROR`
в `controllers/lessons/validators.ts`. В `POST /api/lessons` поле не
читается (создание урока не ставит оплату).

**Rationale**: FR-020a требует, чтобы сервер проверял те же правила, что
интерфейс. Без проверки строка `"1800"` дошла бы до Prisma (Decimal её
примет и молча сохранит), а `NaN` дал бы `500`. Правило 2 исключает
третье состояние «неоплаченный урок с суммой» и держит инвариант R1.

---

## R5. Перенос оплаты и сумма в диалоге отмены

**Decision**:

- `runLessonUpdateTransaction`: урок-получатель получает
  `{ isPaid: true, paymentDate: existing.paymentDate, receivedAmount: existing.receivedAmount }`
  (FR-019, US2 сц. 13). Отменённый урок — `receivedAmount: null` (R3).
- `getLessonCancellationInfo` (`controllers/lessons/getCancellationInfo.ts`):
  `transferAmount = receivedAmount ?? price ?? 0` — текст «Оплата в размере
  X ₽ будет перенесена» показывает переносимые деньги, а не стоимость.
- `findNextUnpaidLesson` (поиск получателя по равной цене) не меняется:
  правило выбора урока-получателя — существующее (FR-032).

**Finding (для пользователя)**: текущий код при отмене оплаченного урока
**с датой оплаты** всегда снимает с него оплату, даже если переносить
некуда (`updateLesson.ts`, ветка отмены). Edge Case спеки «переносить было
некуда — урок остаётся в истории» на сегодняшних данных выполняется только
для старых оплаченных уроков без `paymentDate`. Фича это правило не
меняет (FR-032: «MUST NOT менять правила существующих показателей»):
история показывает ровно то, что карточка «Поступления за период».
Строка «Отменён» в истории остаётся возможной и проверяется тестом
на оплаченном отменённом уроке без даты оплаты.

---

## R6. Агрегаты: что переходит на полученную сумму

**Decision** (FR-025, принцип «деньги, которые пришли → `receivedAmount`,
деньги, которые не пришли → `price`»):

| Показатель | Где | Было | Стало |
|---|---|---|---|
| Заработок | `statistics.ts` `earnings` | `_sum.price` | `_sum.receivedAmount` |
| Заработок прошлого месяца | `lastMonthEarnings` | `_sum.price` | `_sum.receivedAmount` |
| Предоплата | `prepaidIncome` | `_sum.price` | `_sum.receivedAmount` |
| Поступления за период | `paymentsInRange` через `paidInRangeWhere` | `price > 0`, `_sum.price` | `receivedAmount > 0`, `_sum.receivedAmount` |
| Налог, необлагаемые | `paidLessonsForTax` → `computeTaxSummary` | `price` | `receivedAmount` (выборка тем же `paidInRangeWhere`) |
| Списано в счёт комиссий, прогресс погашения, пометка на карточке | `utils/commission.ts` FACT | `price` | `receivedAmount` |
| Оплачено за период (страница уроков) | `lessonsQuery.ts` `paymentsSummary` | `price > 0`, `_sum.price` | `receivedAmount > 0`, `_sum.receivedAmount` |
| Долг, долг > 24 ч | `unpaidWhere` | `price` | **без изменений** |
| Потери от отмен | `lostEarnings` | `price` | **без изменений** |
| Предстоящий доход | `upcomingIncome` | `price` | **без изменений** |
| Прогноз комиссии | `utils/commission.ts` FORECAST | `price` | **без изменений** |
| Пробные / бесплатные уроки | `trialLessonsCount` (`price 0/null`) | — | **без изменений** (это про стоимость урока) |
| `/statistics/by-subject`, `/by-type`, `/by-student` | `controllers/statistics/getLessonStats.ts`, `getStudentStats.ts` | `price` | **без изменений** (вне рамок спеки, Assumptions) |

`paidInRangeWhere` (`services/statistics/statistics.helpers.ts`) меняет
`price: { gt: 0 }` на `receivedAmount: { gt: 0 }` и остаётся **единственным**
определением набора оплат: его используют и карточка, и налог, и история
(R9). Отсюда SC-001 по построению: один `where` — одно множество.

`PaidLessonForTax.price` переименовывается в `receivedAmount`;
`sumLessonPrices` → `sumReceivedAmounts`; `buildTaxBreakdown` получает
`{ price: receivedAmount, paymentDate: paymentDate ?? startTime }` —
сигнатура `services/taxRate.ts` не меняется.

**Rationale**: FR-025, FR-032. Формулы и фильтры по статусам не трогаются,
меняется только суммируемое поле. «Потенциальный доход» на фронте
складывается из тех же карточек и не меняется (Assumptions).

---

## R7. Комиссия: FACT от полученной суммы, FORECAST от стоимости

**Decision**: в `CommissionLessonInput` (`backend/src/types/lesson.ts`)
добавить `receivedAmount: number | null`; `LESSON_SELECT`
и `toAllocatorInput` (`services/commission/commission.helpers.ts`) —
то же поле. В `runPass` (`utils/commission.ts`) сумма урока берётся
функцией прохода: FACT — `receivedAmount ?? 0`, FORECAST — `price ?? 0`.
Порядок проходов, правила допуска (`isFactEligible`, `isForecastEligible`),
округление в копейках — без изменений.

**Rationale**: FR-030: «фактический зачёт по оплаченному уроку MUST
считаться от его полученной суммы — одинаково в истории, в пометке
на карточке урока, в блоке прогресса и в карточке „Списано“». Все четыре
места уже читают один `allocateCommission`, поэтому одна правка в аллокаторе
закрывает их сразу. Урок с полученной суммой 0 не получает FACT-зачёта
(`creditKop <= 0 → continue`) — денег не пришло. Переплата (`received >
price`) зачитывается по полученной сумме, ограниченной остатком комиссии.
FACT-уроки — это оплаченные `COMPLETED` с `receivedAmount > 0`, то есть
подмножество оплат истории (R9), поэтому сумма зачётов по строкам истории
равна `commissionWrittenOffSum` (SC-002).

---

## R8. Налог по каждой оплате

**Decision**: в `services/taxRate.ts` выделить из тела цикла
`buildTaxBreakdown` чистую `resolveLessonTax(amount, effectiveDate,
sortedPeriods) → { rate, isOutsidePeriods, tax }` и использовать её
в обоих местах: в `buildTaxBreakdown` (без изменения поведения, тесты 027
остаются зелёными) и в истории. Строка истории:

- учёт налога выключен → `tax: null` (FR-029);
- `isTaxExempt` → `{ kind: "EXEMPT" }` (FR-028);
- `isOutsidePeriods` (дата раньше первого периода или периодов нет) →
  `{ kind: "OUTSIDE_PERIODS" }` (FR-027, налог 0);
- иначе `{ kind: "TAXED", amount: tax, rate }` (ставка 0% — тоже `TAXED`,
  без пометки «вне», Edge Cases).

`effectiveDate = paymentDate ?? startTime`, `amount = receivedAmount`.

**Rationale**: одна функция расчёта налога по оплате для карточки и для
строк делает SC-002 («сумма налога по строкам = карточка, 0 ₽») верным
по построению: та же ставка, то же округление `Math.round` по каждой оплате.
Итог налога истории (`summary.taxTotal`) — сумма налогов строк всего
периода; интеграционный тест сверяет его с `taxAmount` из
`GET /api/statistics` (R16).

---

## R9. Эндпоинт истории: `GET /api/statistics/income-history`

**Decision**: новый маршрут в `routes/statistics.ts` (под существующим
`authenticateToken`), контроллер `controllers/statistics/getIncomeHistory.ts`,
валидатор `controllers/statistics/getIncomeHistory.validators.ts`, сервис
`services/incomeHistory/` (`incomeHistory.ts`, `.helpers.ts`, `.types.ts`,
`.constants.ts`, `index.ts`). Параметры: `startDate`, `endDate` (ISO, как
у `GET /api/statistics`), необязательные `before` или `through`
(`YYYY-MM-DD`). Ответ — `IncomeHistory` (contracts §4).

Алгоритм сервиса `collectIncomeHistory({ userId, range, timezone, before, through })`:

1. Параллельно три запроса:
   - `prisma.lesson.findMany({ where: paidInRangeWhere(userId, range), select })`
     — все оплаты периода с полями строки (`id, subject, lessonType,
     startTime, endTime, status, price, receivedAmount, paymentDate,
     isTaxExempt, prospectName, student: { id, name, archived }`);
   - пользователь: `taxEnabled`, `taxRatePeriods` (как в `collectLessonStatistics`);
   - `loadStudentAllocations(userId)` (`services/commission`): есть ли
     ученики с комиссией и `creditByLessonId` (только `state === "FACT"`).
2. В памяти (чистые хелперы):
   - ключ дня `toDateKeyInTimezone(paymentDate ?? startTime, timezone)`
     (новая функция в `utils/time.ts`, `Intl.DateTimeFormat("en-CA", { timeZone })`);
   - строки дня в порядке FR-006 (R10), дни от новых к старым;
   - налог строки (R8), зачёт комиссии строки (`null`, если учеников
     с комиссией нет; иначе FACT-сумма или `null`);
   - итоги за **весь** период: `total`, `count`, `taxTotal`,
     `taxExemptTotal`, `commissionTotal` (FR-013), суммы в копейках;
   - нарезка порции (R11).
3. Ответ: `summary` по всем оплатам, `days` только порции, `page`.

**Rationale**:

- Итоги по всему периоду всё равно требуют пройти каждую оплату (налог
  округляется по каждой), поэтому одна выборка всех оплат периода и нарезка
  в памяти дешевле, чем отдельные SQL на итоги и на порцию. Год с 1000
  оплат — один индексный запрос и ~1000 объектов в памяти, далеко внутри
  SC-009 (2 с / 1 с).
- Тот же `paidInRangeWhere` и тот же `getDateRange(startDate, endDate,
  timezone)` (`controllers/statistics/utils.ts`), что у карточек → тот же
  набор оплат (FR-002, SC-001).
- Отдельный эндпоинт, а не поле в `GET /api/statistics`: «Показать ещё»
  и перезагрузка глубины (R12) запрашивают только историю, а ошибка
  истории не должна ронять карточки (FR-011).
- Изоляция: выборка всегда по `tutorId` из токена (FR-037); токен ученика
  отвергается `authenticateToken` (закрепить в `crossRoleSecurity.test.ts`).

**Alternatives considered**:

- SQL с `GROUP BY date(COALESCE(...) AT TIME ZONE $tz)` и `LIMIT` по дням.
  Требует `$queryRaw` (в проекте нет ни одного прикладного raw-запроса),
  дублирует правила налога в SQL и всё равно нуждается в полном проходе
  для итогов. Отклонено.
- Офсет-пагинация (`skip`). Даёт повторы и пропуски при изменении данных
  между порциями — прямо запрещено FR-013b. Отклонено.

---

## R10. Порядок внутри дня (FR-006)

**Decision**: сортировка строк дня по ключу:
`(имя группы, ключ группы, startTime урока, id урока)`, где группа —
ученик (`student.name`, ключ `student.id`) или пробный урок без ученика
(`prospectName`, ключ `prospect:<lessonId>`); имена сравниваются
`localeCompare(…, "ru", { sensitivity: "base" })`.

**Rationale**: строки одного ученика стоят подряд (ключ группы разводит
тёзок), порядок полностью детерминирован (последний ключ — `id`), а внутри
ученика уроки идут по времени, как в макете (Анна: урок 13-го, затем 15-го).
Время платежа внутри дня не годится: `paymentDate` из поля даты хранится
полночью, у всех оплат дня он одинаковый.

---

## R11. Порции и курсор (FR-013a–c)

**Decision**: `INCOME_HISTORY_PAGE_SIZE = 50`
(`services/incomeHistory/incomeHistory.constants.ts`). Нарезка по дням
от новых к старым:

```text
page = []
for day in days (новые → старые, после фильтра курсора):
  if page не пуст и count(page) + day.entries.length > 50: stop
  page.push(day)            # первый день берётся целиком, даже если > 50
```

- `before=<dayKey>` → берутся только дни строго старше `before`;
- `through=<dayKey>` → берутся все дни новее или равные `through`, без
  ограничения 50 (R12);
- `page.nextCursor` = ключ последнего дня порции, если дальше есть дни,
  иначе `null`; `page.remainingCount` = число оплат в днях после порции.

Курсор — **ключ дня** (`YYYY-MM-DD` в часовом поясе репетитора),
непрозрачный для фронта.

**Rationale**: день никогда не делится (FR-013a), поэтому «позиция после
последней показанной оплаты» (FR-013b) всегда совпадает с «началом
следующего, более старого дня»: идентификатор оплаты в курсоре ничего
не уточняет. Курсор по значению дня, а не по номеру строки, даёт «без
повторов и пропусков среди неизменившихся оплат» (Edge Cases): оплата,
добавленная в уже показанный день, туда не попадёт до перезагрузки — это
изменившаяся оплата, спека это допускает. Валидация: `before` и `through`
одновременно → `400`; не `YYYY-MM-DD` → `400 «Некорректная позиция
продолжения истории»`.

---

## R12. Перезагрузка после правки урока «на ту же глубину» (FR-013d, FR-035)

**Decision**: фронт после успешного `lessonModel.updateLessonFx` или
`removeLessonFx`, пока открыта страница отчётов
(`statisticsModel.ReportsPageGate.status`), перезапрашивает:

- карточки — `loadStatisticsFx` с **применённым** периодом
  (`$appliedRange`, R14), а не с текущими значениями полей дат;
- историю — `loadIncomeHistoryFx({ ...appliedRange, through: lastLoadedDayKey })`,
  где `lastLoadedDayKey` — ключ последнего дня в `$incomeHistory.days`
  (если истории нет или она пустая — без `through`, первая порция).

Ответ заменяет `$incomeHistory` целиком; пока запрос идёт, старый список
остаётся на экране.

**Rationale**: `through` возвращает ровно «все дни от начала до последнего
загруженного дня включительно», итоги и пересчитанное «осталось N»
(FR-013d) одним запросом. Список не очищается и рендерится с теми же
`key` дней, поэтому DOM не пересоздаётся и прокрутка сохраняется
(FR-034, US4 сц. 2). Подписка на `updateLessonFx.done` покрывает все
действия из попапа и формы: оплата, дата оплаты, «Получено», стоимость,
признак налога, отмена (в том числе с переносом), восстановление,
перенос, — а `removeLessonFx.done` — удаление.

**Alternatives considered**: точечный патч строки на фронте. Изменение
одного урока сдвигает день, налог дня, зачёт комиссии соседних уроков
ученика и «осталось N»; пересчёт на клиенте продублировал бы сервис. Отклонено.

---

## R13. Часовой пояс и граница суток

**Decision**: день оплаты считается в часовом поясе из заголовка
`X-Timezone` (его ставит `shared/api/base.ts` на каждый запрос), при
невалидном или пустом значении — `UTC` (`isValidTimezone`, `utils/time.ts`).
Период — тем же `getDateRange`, что карточки.

**Rationale**: FR-003 / Edge Cases: «та же граница суток, что у фильтра
периода и карточек». Фильтр периода — браузерные `toLocalStartOfDay` /
`toLocalEndOfDay`, браузерный же часовой пояс приходит заголовком.

**Finding (для пользователя)**: дата оплаты из поля `type="date"`
сохраняется как UTC-полночь (`new Date("YYYY-MM-DD").toISOString()`
в `lessonActions.model.ts` и `lessonForm.helpers.ts`). Для поясов к востоку
от UTC (вся Россия) это тот же календарный день, для поясов к западу —
предыдущий. Так уже работает карточка «Поступления за период»; история
совпадает с ней и это поведение не меняет (FR-032).

---

## R14. Фронт: модели страницы отчётов

**Decision**: в `frontend/src/pages/ReportsPage/model/`:

- `statistics.model.ts` (изменить): событие `periodApplied`
  (`sample` из `[ReportsPageGate.open, statisticsLoadRequested]` с
  `{ startDate: toLocalStartOfDay, endDate: toLocalEndOfDay }`), которое
  ведёт в `loadStatisticsFx` и в новый стор `$appliedRange`.
- `reportsTabs.model.ts` (создать): `$activeTab: ReportsTab` (по умолчанию
  `"summary"`), `tabChanged`. Стор модульный и не сбрасывается при
  закрытии гейта: вкладка переживает уход со страницы, но не перезагрузку
  браузера (FR-001a). Переключение вкладки ничего не загружает.
- `incomeHistory.model.ts` (создать): `$incomeHistory`, `$incomeHistoryError`,
  `$nextPageError`, `$isNextPageLoading`, `$historyVersion`; эффекты
  `loadIncomeHistoryFx`, `loadNextPageFx`; события `incomeHistoryRequested`,
  `incomeHistoryNextPageRequested`. Первая порция грузится по
  `periodApplied` — вместе с карточками, на любой вкладке (FR-013a).
- `incomeHistoryReload.model.ts` (создать): перезагрузка после правки
  урока (R12) и открытие урока из строки (R15).
- `incomeHistory.helpers.ts`: `appendIncomeHistoryPage`, `getLastLoadedDayKey`,
  `isNotFoundError` и т. п. (чистые функции для `fn`).

Защита от гонок (Edge Cases «сменили период во время подгрузки»,
«нажали дважды»): `$historyVersion` увеличивается при каждом запросе
первой порции и уходит в параметры эффекта; `loadIncomeHistoryFx.done`
и `loadNextPageFx.done` применяются, только если `params.version ===
$historyVersion`. `incomeHistoryNextPageRequested` фильтруется по
`!$isNextPageLoading`, `!loadIncomeHistoryFx.pending` и
`nextCursor !== null`; запрос следующей порции использует период
`$appliedRange`, а не поля дат, которые репетитор мог поменять без
«Обновить». Новая порция дописывает дни, берёт её `page`, а `summary`
оставляет от первой порции (итог обновится при следующей загрузке, Edge
Cases). Ошибка первой порции — `$incomeHistoryError` «Не удалось загрузить
историю поступлений. Нажмите «Обновить», чтобы попробовать ещё раз»;
ошибка порции — `$nextPageError`, показанные дни остаются, кнопка
«Повторить» снова шлёт `incomeHistoryNextPageRequested`.

**Rationale**: модели страницы живут рядом со `statistics.model.ts`,
как сейчас (`pages/ReportsPage/model`); каждая < 200 строк; счётчик
поколения — рекомендованный конвенцией способ отбросить устаревший
ответ (`docs/conventions/frontend.md`, раздел про `delay`).

---

## R15. Попап урока поверх вкладки и полный набор диалогов

**Decision**:

- Строка истории шлёт `incomeHistoryLessonOpened(lessonId)` →
  `openLessonFx` (`lessonsApi.getById`) → `lessonsModel.viewDialogOpened(lesson)`.
  Урок берётся с сервера, а не собирается из строки (мок `buildMockLesson`
  удаляется): попапу и форме нужны все поля урока, `studentId`, комиссия.
- `404` → уведомление «Урок не найден: возможно, он удалён. История
  поступлений обновлена» и перезагрузка карточек и истории на ту же глубину
  (FR-036); прочие ошибки — `extractAxiosError(error, "Не удалось открыть урок")`.
- Набор диалогов `pages/lessons/components/LessonsDialogs` (форма, попап,
  `ConfirmDialog`, `LessonDeleteDialog`, `RescheduleDialog`) переносится
  в `features/lessons/ui/LessonDialogs/` и подключается и на странице
  уроков, и на странице отчётов. Макетная `ReportsLessonDialogs` удаляется.

**Rationale**: в макете на отчётах смонтированы только попап и форма,
а «Отменить», «Восстановить», «Перенести», «Удалить» из попапа открывают
`ConfirmDialog` / `LessonDeleteDialog` / `RescheduleDialog` — без них
кнопки попапа на отчётах молча ничего не делают. Страница не может
импортировать другую страницу (FSD), поэтому общий набор переезжает
в `features/lessons` (переиспользуется дважды, принцип VII). Ученики для
формы уже загружены при старте приложения (`appInit.model.ts`).
`openLessonFx.pending` добавляется в `$isBlocking`, как любой запрос.

---

## R16. Поле «Получено» в диалогах оплаты и в форме

**Decision**:

- Валидация и преобразования поля — чистые функции, которые нужны и моделям,
  и компонентам, переезжают из `ui/ReceivedAmountField/ReceivedAmountField.helpers.ts`
  и `.constants.ts` в `features/lessons/models/receivedAmount.helpers.ts`
  / `receivedAmount.constants.ts` (`validateReceivedAmount`,
  `toReceivedAmountInput`, `parseReceivedAmount`, `RECEIVED_AMOUNT_ERRORS`,
  `MAX_RECEIVED_AMOUNT`); в `ReceivedAmountField` остаётся подпись.
- Попап и форма (`PaymentStatus`): в `PaymentStatus.model.ts` сторы
  `$receivedAmountInput`, производный `$receivedAmountError` (только при
  `$pendingStatus === true`), событие `receivedAmountChanged`;
  `confirmDialogOpened` принимает `{ isPaid, price }` и ставит
  `$receivedAmountInput = toReceivedAmountInput(price)`. В форме `PaymentStatus`
  уже получает `price` из `formData.price` (правка макета в
  `LessonStatusSection`), поэтому по умолчанию стоит цена из формы (US2 сц. 9).
- Значок на карточке (`LessonStatusIcons`): то же в `LessonStatusIcons.model.ts`,
  `paymentDialogOpened({ lessonId, price })`.
- Подтверждение (кнопка и Enter) заблокировано при ошибке (уже в макете:
  `isConfirmBlocked`, `ConfirmStatusDialog.confirmDisabled`). При
  подтверждении `lessonPaymentChanged({ lessonId, isPaid: true, paymentDate,
  receivedAmount: parseReceivedAmount(input) })`; снятие оплаты шлёт
  `isPaid: false` без суммы (поле в диалоге снятия не показывается).
- Форма: `LessonFormData.receivedAmount: string`; `prepareFormData` —
  `toReceivedAmountInput(lesson.receivedAmount ?? lesson.price)` у оплаченного,
  `""` у неоплаченного; `onPaymentChange` из `PaymentStatus` в форме
  получает четвёртым аргументом сумму и пишет её в `formData`; снятие
  оплаты в форме очищает поле. `PaidDetailsFields` показывает
  `formData.receivedAmount`, правит через `setFormData`, ошибку берёт
  из `lessonFormModel.$receivedAmountError`. `canSubmitLessonForm` и
  `validateFormData` блокируют сохранение при ошибке (FR-020a).
  `prepareSubmitData` шлёт `receivedAmount` **только** у оплаченного урока
  (иначе сервер вернёт `400`, R4).
- Хук-мок `ReceivedAmountField.hooks.ts` (`useState` + `useEffect`)
  удаляется: значение поля идёт в API и проходит валидацию, а такое
  состояние по конвенции живёт в Effector.

**Rationale**: FR-016, FR-020, FR-020a; конвенция «Form state in Effector».
Соседний `usePaymentDate` (`useState` + `useEffect`) — существующий долг
вне рамок фичи, не трогается.

---

## R17. Показ полученной суммы

**Decision**: `ReceivedAmountHint` (`shared/ui`, из макета) — единственный
компонент пометки: значок в строке истории (`variant="icon"`) и пометка
«получено M ₽» в попапе (`variant="full"`, только у оплаченного урока).
`isReceivedAmountMismatch` сравнивает суммы в копейках. Пометки в карточках
списка и календаря нет (FR-024).

**Rationale**: уже утверждено в макете; остаётся покрыть тестами
(R20), включая «нажатие на значок не открывает попап» (FR-022): триггер
использует `useTooltipTrigger.handleClick` (`stopPropagation`) и гасит
`keydown`.

---

## R18. Кабинет ученика

**Decision**: кода не требует. `toStudentLessonResponse`
(`services/studentCabinet/studentCabinet.helpers.ts`) собирает урок
из пяти явных полей, WS-рассылка ученику (`broadcastStudentLessonUpdated`)
— из явного списка. Закрепить тестами, как для `isTaxExempt` в 034:
`GET /api/student-cabinet/lessons` не содержит `receivedAmount`, payload
рассылки после оплаты тоже (FR-026).

---

## R19. WebSocket и живые обновления

**Decision**: новых WS-событий нет. Отчёты не подписаны на WS; правки
из попапа на этой же вкладке обновляют историю и карточки через R12.
Глобальный обработчик `lesson_status_updated` (`app/model/webSocket.model.ts`)
перечитывает урок через `lessonModel.syncLessonFx`, а не отправляет статус
обратно `PUT`-ом, поэтому `updateLessonFx.done` от него не срабатывает
и отчёты по нему не перезагружаются.
Изменения из другой вкладки или устройства видны при следующей загрузке
данных страницы (смена периода, «Обновить», повторное открытие отчётов) —
ровно как требует Edge Case спеки.

**Rationale**: тьюторский канал несёт только `lesson_status_updated`,
одно соединение на пользователя; то же решение в 033 (R10) и 034 (R12).

---

## R20. Производительность списка на телефоне (FR-013e, SC-009)

**Decision**: без виртуализации и новых зависимостей. `IncomeHistoryDay`
оборачивается в `memo`; дописывание порции сохраняет ссылки на уже
загруженные объекты дней (`[...prev.days, ...page.days]`), поэтому старые
дни не перерисовываются. Строка — один `ButtonBase` с текстом и чипами,
без тяжёлых компонентов.

**Rationale**: несколько сотен строк из нескольких порций — обычный
объём для MUI `List`; виртуализация сломала бы «тот же скролл» (FR-034)
и поиск по странице. Проверяется вручную на 375px (quickstart §5).

---

## R21. Глобальный индикатор загрузки

**Decision**: `loadIncomeHistoryFx.pending` и `openLessonFx.pending`
добавляются в `$isBlocking` (`app/model/blocking.model.ts`), как
`loadStatisticsFx`. `loadNextPageFx.pending` — **не** добавляется:
загрузка порции показывается только на кнопке «Показать ещё»
(«Загружаем оплаты…», `aria-busy`).

**Rationale**: конвенция требует общий оверлей для запросов, но FR-013c
прямо говорит «без общего блокирующего индикатора страницы» для порции:
оверлей закрыл бы список, который репетитор листает. Исключение одно
и записано в Complexity Tracking плана.

---

## R22. Снос макетных заглушек

**Decision**: снять все 18 маркеров `TODO(auto-feature)`; удалить
`IncomeHistory/incomeHistoryMocks.helpers.ts`, моки из
`IncomeHistory.constants.ts` (`MOCK_*`, `INCOME_HISTORY_MOCK_*`; файл
удаляется, если пустеет), `getMockIncomeHistoryState`,
`pickMockIncomeHistory`, `applyMockVisibility` (видимость налога и комиссий
теперь задают `null` с сервера), `IncomeHistoryMockState`,
`IncomeHistoryVisibility`, `useMockReportsTab` и `REPORTS_TAB_MOCK_PARAM`
(вкладка не в URL, FR-001a), `buildMockLesson`, `ReceivedAmountField.hooks.ts`,
`ReportsLessonDialogs/`. Финальная проверка:
`grep -rn "TODO(auto-feature)\|MOCK_INCOME\|incomeHistoryMock\|reportsTab=\|useMockReportsTab\|buildMockLesson\|useReceivedAmountInput" frontend/src backend/src` пуст.

---

## R23. Тестовая стратегия

**Backend (Jest + Supertest, реальная тестовая БД)**:

- юнит: `resolveReceivedAmount` (все переходы R3), `resolveLessonTax`
  и неизменность `buildTaxBreakdown`, `allocateCommission` FACT/FORECAST,
  `toDateKeyInTimezone` (DST, полночь, `Europe/Moscow` vs `UTC`), хелперы
  истории (порядок дня, нарезка порции: < 50, ровно 50, день > 50,
  `before`, `through`, `remainingCount`, итоги в копейках), валидаторы;
- интеграция `PUT /api/lessons/:id`: отметка с суммой и без, правка
  стоимости после оплаты, распространение цены на предоплаченные уроки
  серии, повторное сохранение формы, правка «Получено» у оплаченного
  урока (дата оплаты не меняется), снятие оплаты, отмена с переносом
  (сумма отменённого урока у получателя), `400` по R4;
  `GET /cancellation-info` `transferAmount`;
- интеграция статистики: каждый показатель R6 — по полученной сумме
  или по стоимости, неизменность при `received = price` (SC-006),
  комиссия FACT от полученной суммы;
- интеграция `GET /api/statistics/income-history`: итоги = карточки
  `GET /api/statistics` за тот же период (сумма, число, налог, необлагаемые,
  комиссия; SC-001, SC-002) — на наборе со сменой ставки, зоной 0%,
  необлагаемым уроком, комиссией, изменённой стоимостью; группировка
  по дням в `X-Timezone`; порции и курсоры; `400`; `401`; чужие уроки
  не видны; токен ученика отвергается;
- `lessonsQuery` `paymentsSummary`; кабинет ученика без поля; test-support.

**Frontend (Vitest + RTL + MSW, `fork`)**: модели `reportsTabs`,
`incomeHistory` (первая порция с карточками, ошибка, «Показать ещё»,
двойной клик, устаревший ответ после смены периода, перезагрузка на
глубину только при открытом гейте, 404 при открытии урока),
`statistics` (`$appliedRange`), `PaymentStatus.model`,
`LessonStatusIcons.model`, `lessonActions` (сумма уходит в `PUT`),
хелперы формы и `receivedAmount`; компоненты истории (все состояния
макета), `ReceivedAmountHint`, `ReceivedAmountField`, `PaymentFields`,
`PaidDetailsFields`, диалоги оплаты (по умолчанию цена, ошибка блокирует
кнопку и Enter), `LessonDetails`, `ReportsTabs`, ссылка в `IncomeCards`,
`ConfirmStatusDialog.confirmDisabled`, `LessonDialogs`.

**E2E (Playwright, `@regression`)**: `reports/income-history.spec.ts`
(`@reports`): дни и итог = карточка, вкладка, переход по ссылке карточки,
попап из строки и снятие оплаты без перезагрузки, «Показать ещё» на
посеянном длинном периоде; `lessons/received-amount.spec.ts` (`@lessons`):
отметка оплаты с «Получено» 1800 ₽ → пометка в попапе, правка в форме.
Существующие `lessons/mark-payment.spec.ts`,
`lessons/cancel-with-payment-shift.spec.ts`, `reports/*` должны остаться
зелёными; `LessonSeed` в `frontend/e2e/helpers/db.ts` получает
`receivedAmount?`.
