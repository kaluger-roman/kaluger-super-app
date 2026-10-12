# Contracts: История поступлений (035-income-history)

Все эндпоинты под `authenticateToken` (JWT репетитора). Ошибки —
`{ error: string }` на русском. Деньги — `number` в рублях с копейками
(`Decimal` сериализуется числом, `backend/src/lib/prisma.ts`).

## 1. `PUT /api/lessons/:id` — новое поле `receivedAmount`

Тело (`UpdateLessonDto`, добавляется):

```ts
receivedAmount?: number; // 0..99 999 999,99, не больше 2 знаков
```

Семантика (research R3):

| Состояние до | Тело | Результат `receivedAmount` |
|---|---|---|
| не оплачен | `{ isPaid: true, paymentDate, receivedAmount: 1800 }` | `1800` |
| не оплачен | `{ isPaid: true, paymentDate }` | `price` из тела, иначе текущая `price`, иначе `0` |
| оплачен | `{ isPaid: false }` | `null` |
| оплачен, с `paymentDate` | `{ status: "CANCELLED" }` | `null`; получатель переноса — сумма отменённого |
| оплачен | `{ receivedAmount: 2500 }` (или вся форма с `isPaid: true`) | `2500`, `paymentDate` и `isPaid` не меняются |
| оплачен | `{ price: 2500 }` / форма без изменения «Получено» | не меняется |

Ошибки `400`:

| Условие | `error` |
|---|---|
| не число, `NaN`, `null`, строка, `< 0`, `> 99 999 999,99`, больше 2 знаков | «Полученная сумма должна быть неотрицательным числом не больше 99 999 999,99 ₽ с точностью до копеек» |
| урок после запроса не оплачен (`(isPaid ?? existing.isPaid) !== true`) | «Полученную сумму можно указать только у оплаченного урока» |

Ответ `200` — как сейчас: `{ message, lesson }`, `lesson.receivedAmount: number | null`.

## 2. Чтение уроков

`GET /api/lessons`, `GET /api/lessons/:id`, ответы `POST` / `PUT`:
у каждого урока появляется `receivedAmount: number | null` (сырые строки
Prisma, без правок контроллеров).

`GET /api/lessons?paymentDateFrom&paymentDateTo` → `paymentsSummary`:
`sum` = Σ `receivedAmount`, `count` = число оплаченных уроков
с `receivedAmount > 0` (было по `price`).

## 3. `GET /api/lessons/:id/cancellation-info`

`cancellationInfo.transferAmount` = `receivedAmount ?? price ?? 0`
отменяемого урока (было `price`). Остальное без изменений.

## 4. `GET /api/statistics/income-history` (новый)

Query:

| Параметр | Тип | Обязателен | Описание |
|---|---|---|---|
| `startDate` | ISO string | нет* | начало периода, как у `GET /api/statistics` |
| `endDate` | ISO string | нет* | конец периода |
| `before` | `YYYY-MM-DD` | нет | следующая порция: дни строго старше |
| `through` | `YYYY-MM-DD` | нет | все дни от новых до этого дня включительно, без предела 50 |

\* без дат — текущий месяц в поясе `X-Timezone`, как у карточек
(`getDateRange`). Заголовок `X-Timezone` задаёт границы дней; невалидный
или пустой → `UTC`.

Ответ `200` (`IncomeHistory`, тот же тип, что `frontend/src/shared/types/incomeHistory.ts`):

```json
{
  "summary": {
    "total": 17700,
    "count": 10,
    "taxTotal": 954,
    "taxExemptTotal": 1800,
    "commissionTotal": 3000
  },
  "days": [
    {
      "date": "2026-10-11",
      "total": 4000,
      "taxTotal": 240,
      "entries": [
        {
          "lessonId": "clx…",
          "student": { "name": "Анна Смирнова", "archived": false },
          "prospectName": null,
          "subject": "MATHEMATICS",
          "lessonType": "EGE",
          "lessonStartTime": "2026-10-13T16:00:00.000Z",
          "lessonEndTime": "2026-10-13T17:30:00.000Z",
          "lessonStatus": "SCHEDULED",
          "price": 2500,
          "receivedAmount": 2000,
          "hasPaymentDate": true,
          "tax": { "kind": "TAXED", "amount": 120, "rate": 6 },
          "commissionCredit": null
        }
      ]
    }
  ],
  "page": { "nextCursor": "2026-10-01", "remainingCount": 124 }
}
```

Правила полей:

- `summary.*` — по всем оплатам периода, не зависят от `before` / `through`
  и в точности равны `GET /api/statistics` за тот же период:
  `total = paymentsInRangeSum`, `count = paymentsInRangeCount`,
  `taxTotal = taxAmount`, `taxExemptTotal = taxExemptIncome`,
  `commissionTotal = commissionWrittenOffSum` (или `null`, если
  `hasCommissionStudents = false`).
- Учёт налога выключен → `summary.taxTotal`, `summary.taxExemptTotal`,
  `days[].taxTotal`, `entries[].tax` — `null`.
- Учеников с ненулевой комиссией нет → `summary.commissionTotal` и все
  `entries[].commissionCredit` — `null`.
- `entries[].tax`: `TAXED` (ставка на дату `paymentDate ?? startTime`,
  налог `Math.round(received × rate / 100)`), `OUTSIDE_PERIODS`
  (до первого периода или периодов нет), `EXEMPT` (`isTaxExempt`).
- `days` — от новых к старым; строки дня в порядке research R10; день
  целиком в одном ответе.
- `page.nextCursor` — передаётся следующему запросу как `before`; `null` —
  всё загружено. `page.remainingCount` — оплаты, которые ещё не показаны.
- Пустой период: `summary` с нулями (`total: 0`, `count: 0`, налог `0`
  или `null`), `days: []`, `page: { nextCursor: null, remainingCount: 0 }`.

Ошибки:

| Код | Условие | `error` |
|---|---|---|
| 400 | `startDate` / `endDate` не разбираются как дата | «Некорректный период» |
| 400 | `before` или `through` не `YYYY-MM-DD`, или переданы оба | «Некорректная позиция продолжения истории» |
| 401 / 403 | нет токена, токен ученика, невалидный токен | как у остальных `/api/statistics/*` |
| 500 | прочее | «Внутренняя ошибка сервера» |

Изоляция: только уроки `tutorId = req.user.userId` (FR-037).

## 5. `GET /api/statistics` — состав ответа не меняется

Меняется только суммируемое поле (research R6): `earnings`,
`lastMonthEarnings`, `prepaidIncome`, `paymentsInRangeSum`,
`paymentsInRangeCount`, `taxAmount`, `taxBreakdown[].earnings/tax`,
`taxExemptIncome`, `commissionWrittenOffSum`, `commissionRemainingTotal`
считаются по `receivedAmount`. `unpaidDebt*`, `lostEarnings`,
`upcomingIncome`, `trialLessonsCount` — по `price`, как раньше.

## 6. Кабинет ученика

`GET /api/student-cabinet/lessons` и WS-события ученику —
**без** `receivedAmount` (FR-026). Контракт не меняется.

## 7. Test support (только `NODE_ENV=test`, `E2E=1`)

`POST /api/__test__/lessons`: принимает `receivedAmount?: number`;
при `isPaid: true` без него пишет `price ?? 0`, при `isPaid: false` — `null`.
`PATCH /api/__test__/lessons/:id`: при `isPaid: true` пишет
`receivedAmount ?? price ?? 0`, при `isPaid: false` — `null`; отдельный
`receivedAmount` у оплаченного урока применяется как есть.
`LessonSeed` (`frontend/e2e/helpers/db.ts`) получает `receivedAmount?: number`.

## 8. WebSocket

Новых событий нет (research R19).
