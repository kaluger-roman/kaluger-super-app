# Contract — расширение `/api/statistics`

Endpoint остаётся тот же: `GET /api/statistics?startDate=...&endDate=...`,
с заголовком `x-timezone`. Меняются только поля ответа, относящиеся к налогу.

## До (текущий контракт)

```jsonc
{
  // ... остальные поля без изменений ...
  "taxAmount": 3000   // целое число, ₽
}
```

`taxAmount` рассчитывался как `round(earnings * user.taxRate / 100)` —
один множитель для всего периода.

## После

```jsonc
{
  // ... остальные поля без изменений ...
  "taxAmount": 4200,   // целое число ₽; null если у пользователя taxEnabled=false
  "taxBreakdown": [    // массив или null если taxEnabled=false
    { "rate": 0,    "earnings":   5000, "tax":    0, "isOutsidePeriods": true },
    { "rate": 4,    "earnings":  30000, "tax": 1200 },
    { "rate": 6,    "earnings":  50000, "tax": 3000 }
  ]
}
```

### Семантика

- Выборка уроков для налога: `tutorId = user.id AND isPaid = true AND price > 0
  AND paymentDate ∈ [startDate, endDate]` — та же, что текущий `paymentsInRange`.
- Для каждого урока ставка определяется по `paymentDate` через резолвер
  периодов; если `paymentDate < earliestPeriod.startDate` → ставка `0`,
  запись попадает в строку `isOutsidePeriods: true` суммированного breakdown.
- `taxAmount = sum(round(price * rate / 100))` по каждому уроку, затем
  итоговая сумма (округление по уроку, не по итогу).
- `taxBreakdown` сортируется по `rate ASC`; одна строка на каждую
  применённую ставку. Строка с `rate: 0` и `isOutsidePeriods: true`
  присутствует только если в выборке есть оплаты до самого раннего периода.
- Если в выборке нет ни одного оплаченного урока (но `taxEnabled=true`):
  `taxAmount = 0`, `taxBreakdown = []`.
- Если `taxEnabled=false`: `taxAmount = null`, `taxBreakdown = null` —
  фронт скрывает карточку.

### Гарантия монотонности

`taxAmount === sum(entry.tax for entry in taxBreakdown)` — клиенту не нужно
пересуммировать; это инвариант контракта.

### TypeScript-тип ответа

```ts
type StatisticsResponse = {
  // ... существующие поля ...
  taxAmount: number | null;
  taxBreakdown: TaxBreakdownEntry[] | null;
};

type TaxBreakdownEntry = {
  rate: number;
  earnings: number;
  tax: number;
  isOutsidePeriods?: boolean;
};
```

### Совместимость

- Существующие клиенты, не знающие про `taxBreakdown`, продолжат работать —
  поле `taxAmount` остаётся числом-в-рублях для пользователей с
  `taxEnabled=true`. Для пользователей с `taxEnabled=false` оно становится
  `null` — карточка налога скрывается полностью (FR-003).
- Поле `User.taxRate` удаляется в Prisma-миграции этой же фичи и пропадает
  из всех JSON-ответов; фронт после деплоя не должен его читать.

### Пример полного ответа (taxEnabled=true, mixed)

Запрос: `GET /api/statistics?startDate=2025-05-01&endDate=2025-08-01`

Пользователь имеет периоды:
- 2024-01-01 → 6%
- 2025-06-01 → 4%

Уроки в выборке:
- price=10000, paymentDate=2025-05-15 (rate 6%, tax 600)
- price=15000, paymentDate=2025-07-20 (rate 4%, tax 600)

```json
{
  "earnings": 25000,
  "taxAmount": 1200,
  "taxBreakdown": [
    { "rate": 4, "earnings": 15000, "tax": 600 },
    { "rate": 6, "earnings": 10000, "tax": 600 }
  ]
}
```

### Пример с зоной 0% (оплата до первого периода)

Тот же пользователь, диапазон `2023-09-01..2025-06-30`:

```json
{
  "earnings": 30000,
  "taxAmount": 600,
  "taxBreakdown": [
    { "rate": 0, "earnings": 5000,  "tax":   0, "isOutsidePeriods": true },
    { "rate": 6, "earnings": 25000, "tax": 600 }
  ]
}
```

### Пример при taxEnabled=false

```json
{
  "earnings": 50000,
  "taxAmount": null,
  "taxBreakdown": null
}
```
