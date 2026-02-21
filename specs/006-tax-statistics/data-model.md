# Data Model: 006-tax-statistics

## Entity Changes

### User (existing, modified)

| Field    | Type  | Default | Constraints          | Notes                          |
|----------|-------|---------|----------------------|--------------------------------|
| taxRate  | Float | 6.0     | >= 0, <= 100         | Персональная ставка налога (%) |

**Миграция**: `ALTER TABLE users ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 6.0;`
Prisma автоматически проставит 6.0 для всех существующих записей.

**Валидация**:
- Тип: число с плавающей точкой
- Диапазон: 0.0 — 100.0 включительно
- Точность: до 1 десятичного знака (округление при сохранении)
- Не может быть null (дефолт 6.0)

### Statistics (computed, not persisted)

| Field     | Type    | Computation                            | Notes                        |
|-----------|---------|----------------------------------------|------------------------------|
| taxAmount | Integer | Math.round(earnings × taxRate / 100)   | Сумма налога за период (₽)   |

**Зависимости**:
- `earnings` — существующее поле (сумма завершённых оплаченных уроков)
- `taxRate` — из модели User текущего пользователя

## Relationships

```
User (1) ──── taxRate ────→ Statistics.taxAmount (computed per request)
          └── lessons ────→ Statistics.earnings (aggregated per request)
```

Нет новых таблиц, индексов или связей. Единственное изменение — одно поле
в существующей таблице `users`.
