# Quickstart: Фильтрация уроков по дате оплаты

## Обзор изменений

Добавление фильтрации уроков по дате оплаты. Затрагивает фронтенд и бэкенд. Миграция БД не требуется — поле `paymentDate` уже существует.

## Порядок реализации

### 1. Backend — расширение endpoint (независимо)

**Файл:** `backend/src/controllers/lessons/getLessons.ts`

Добавить обработку query-параметров `paymentDateFrom` и `paymentDateTo`:
- Деструктурировать из `req.query`
- Если `onlyUnpaid !== "true"` и хотя бы один из параметров задан:
  - Добавить `where.paymentDate = { not: null }` + `gte`/`lte` фильтры
  - `paymentDateFrom` → начало дня (setHours(0,0,0,0))
  - `paymentDateTo` → конец дня (setHours(23,59,59,999))
- Валидация: если оба заданы и from > to → 400

### 2. Frontend — Effector модель фильтров

**Файл:** `frontend/src/features/lessons/models/lessons-filters.model.ts`

Добавить:
- `setPaymentDateFrom` event
- `setPaymentDateTo` event
- `setPaymentDatePreset` event
- `resetPaymentDateFilter` event
- `$paymentDateFrom` store (Date | null, default: null)
- `$paymentDateTo` store (Date | null, default: null)
- `$paymentDatePreset` store (string | null, default: null)
- sample: при `setOnlyUnpaid(true)` → сбросить даты оплаты
- sample: при ручном изменении даты → сбросить preset

### 3. Frontend — обновление helpers и loader

**Файлы:**
- `frontend/src/features/lessons/models/lessons-page-loader.helpers.ts` — добавить `paymentDateFrom`/`paymentDateTo` в `LoadParams` и в функции формирования параметров
- `frontend/src/features/lessons/models/lessons-page-loader.model.ts` — добавить новые сторы в `clock` и `source` всех sample
- `frontend/src/features/lessons/models/lessons-reload.model.ts` — аналогично

### 4. Frontend — API-клиент

**Файл:** `frontend/src/shared/api/lessons.ts`

Добавить `paymentDateFrom`/`paymentDateTo` в тип `LessonsFilters` и во все методы, которые передают фильтры (`getUpcoming`, `getByWeek`, `getAll`).

### 5. Frontend — UI фильтра

**Файл:** `frontend/src/pages/lessons/components/LessonsFilters/LessonsFilters.tsx`

Добавить:
- Два `DatePicker` компонента (дата начала, дата окончания оплаты)
- Чипы предустановленных периодов (Текущий месяц, Прошлый месяц, Текущая неделя)
- Кнопка сброса фильтра по дате оплаты
- Disabled-состояние при `onlyUnpaid=true`

### 6. Тесты

- **Backend:** Тест `getLessons` с `paymentDateFrom`/`paymentDateTo` параметрами
- **Frontend:** Тест Effector-модели фильтров (sample-логика сброса, preset)
- **Frontend:** Тест UI компонента фильтра (рендер, взаимодействие с пресетами, disabled-состояние)

## Зависимости между шагами

```
[1. Backend endpoint] ─────────────────────┐
                                            ├──→ [6. Тесты]
[2. Effector модель] → [3. Helpers/Loader] ─┤
                     → [4. API-клиент]     ─┤
                     → [5. UI фильтра]     ─┘
```

Шаги 1 и 2 можно выполнять параллельно. Шаги 3-5 зависят от шага 2. Тесты — в конце.
