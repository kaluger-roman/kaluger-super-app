# Phase 1 — Data Model

## Prisma schema (диффы)

### Изменения в `model User`

```prisma
model User {
  // ... существующие поля ...
  // taxRate Float @default(6.0)                     // ➖ УДАЛЯЕТСЯ в этой же миграции после переноса
  taxEnabled    Boolean   @default(false)            // ➕ NEW
  taxRatePeriods TaxRatePeriod[]                     // ➕ NEW

  // ... остальные поля ...
}
```

### Новая модель `TaxRatePeriod`

```prisma
model TaxRatePeriod {
  id        String   @id @default(cuid())
  userId    String
  startDate DateTime  // дата начала действия периода (date+00:00 в UTC)
  rate      Float     // 0..100, до одного знака после запятой
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, startDate])
  @@index([userId, startDate])
  @@map("tax_rate_periods")
}
```

### Обоснование индексов

- `@@unique([userId, startDate])` — закрывает FR-013 на уровне БД.
- `@@index([userId, startDate])` — для запросов «все периоды пользователя
  отсортированные по дате» и резолвера «период, действующий на дату X»
  (`startDate <= X order by startDate desc limit 1`).

## Validation rules

### TaxRatePeriod (controller-level + Prisma-level)

| Поле | Правило | Источник |
|---|---|---|
| `startDate` | валидная дата; не отсутствует; уникальна в рамках `userId` | FR-013, контроллер + DB constraint |
| `rate` | `0 <= rate <= 100`; до 1 знака после запятой; число | FR-012, контроллер |
| `userId` | берётся из JWT (req.user.userId), не передаётся клиентом | архитектура auth |

### User.taxEnabled (controller-level)

- `taxEnabled = true` → у пользователя должно быть ≥1 периода в БД (FR-005).
  Контроллер `updateProfile` валидирует это перед сохранением; PUT-запрос
  с `taxEnabled=true` и пустым `taxRatePeriods` отклоняется 400 с
  «Чтобы включить учёт налога, добавьте хотя бы один период».

### Удаление периода

- При `taxEnabled = true`: `DELETE /api/tax-periods/:id` отклоняется 400,
  если это последний период пользователя (FR-006, FR-010).
- При `taxEnabled = false`: разрешено удалить любой/все периоды
  (тумблер уже выключен, ограничение не действует).

## State transitions

### Тумблер `taxEnabled`

```
[OFF] ──updateProfile(taxEnabled=true && periods.length>=1)──> [ON]
[OFF] ──updateProfile(taxEnabled=true && periods.length===0)──> ❌ 400
[ON]  ──updateProfile(taxEnabled=false)──> [OFF]   (периоды сохраняются)
```

### Список периодов (внутри модалки)

Локальное состояние на фронте в `$draftPeriods` живёт между событиями
`modalOpened` (snapshot из `$periods`) и `modalClosed` (сброс) или
`saveSucceeded` (синк в `$periods`). Серверное состояние меняется только
по `saveRequested → savePeriodsFx` атомарно.

## Сущности фронта (типы)

```ts
// frontend/src/shared/types/index.ts
export type TaxRatePeriod = {
  id: string;
  startDate: string; // ISO date string (UTC, day-precision)
  rate: number;
};

export type TaxBreakdownEntry = {
  rate: number;       // ставка в процентах (0..100)
  earnings: number;   // сумма заработков, попавших на эту ставку (₽)
  tax: number;        // налог по этой ставке (₽, целое)
  isOutsidePeriods?: boolean;
};

export type TaxStatistics = {
  taxAmount: number | null;        // null когда taxEnabled=false
  taxBreakdown: TaxBreakdownEntry[] | null;
};
```

```ts
// backend/src/types/index.ts (дополнения)
export type TaxRatePeriodDto = {
  id: string;
  startDate: string; // ISO
  rate: number;
};

export type TaxBreakdownEntry = { /* как на фронте */ };
```

## Миграция данных (пошагово)

См. quickstart.md, секция «Миграция БД». Логика:

1. Создать таблицу `tax_rate_periods` и колонку `users.tax_enabled`.
2. Для каждого `users.id`, у которого `tax_rate <> 6.0`:
   - вычислить `seed_start_date = COALESCE(MIN(lessons.start_time), users.created_at)`;
   - вставить `tax_rate_periods(user_id, start_date=seed_start_date, rate=users.tax_rate)`;
   - проставить `users.tax_enabled = true`.
3. Не трогать пользователей с `tax_rate = 6.0` (остаются на дефолте `tax_enabled=false`,
   без периодов).
4. `ALTER TABLE "users" DROP COLUMN "tax_rate";` — в той же миграции, после
   успешного переноса данных.

## Связь с существующим Lesson

Поле `Lesson.paymentDate DateTime?` (уже существует) — единственный
источник «даты для определения ставки». Уроки без `paymentDate` (не оплаченные)
не попадают в расчёт налога вообще. Это совпадает с текущим набором
`paymentsInRange`: `where { tutorId, isPaid: true, paymentDate ∈ range, price > 0 }`.

## Инварианты после раскатки

1. У пользователя с `taxEnabled = true` всегда есть ≥1 строки в `tax_rate_periods`.
2. У пользователя с `taxEnabled = false` могут быть 0 или больше периодов;
   они не используются для расчёта.
3. Пары `(userId, startDate)` уникальны.
4. `rate ∈ [0, 100]`.
