# API Contract: GET /api/lessons — расширение фильтрации

## Новые query-параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `paymentDateFrom` | ISO 8601 string | нет | Начальная дата диапазона оплаты (включительно, от начала дня) |
| `paymentDateTo` | ISO 8601 string | нет | Конечная дата диапазона оплаты (включительно, до конца дня) |

## Поведение

### Фильтрация по paymentDate

Если хотя бы один из параметров `paymentDateFrom`/`paymentDateTo` задан:

1. Добавляется условие `paymentDate IS NOT NULL` (исключаются неоплаченные уроки)
2. Если задан `paymentDateFrom`: `paymentDate >= paymentDateFrom (00:00:00.000)`
3. Если задан `paymentDateTo`: `paymentDate <= paymentDateTo (23:59:59.999)`

### Приоритет фильтров

- `onlyUnpaid=true` имеет приоритет: если включён, `paymentDateFrom`/`paymentDateTo` **игнорируются**
- `paymentDateFrom`/`paymentDateTo` комбинируются с остальными фильтрами (`studentId`, `status`, `onlyWithoutHomework`) через AND

### Валидация

- Если оба заданы и `paymentDateFrom > paymentDateTo`: ответ `400 Bad Request` с `{ error: "Дата начала оплаты не может быть позже даты окончания" }`
- Невалидные даты (не ISO формат): игнорируются

## Примеры запросов

```
# Уроки оплаченные в марте 2026
GET /api/lessons?paymentDateFrom=2026-03-01&paymentDateTo=2026-03-31&page=1&limit=10

# Уроки оплаченные с 15 марта (без конечной даты)
GET /api/lessons?paymentDateFrom=2026-03-15&page=1&limit=10

# Комбинация: оплаченные в марте + конкретный ученик
GET /api/lessons?paymentDateFrom=2026-03-01&paymentDateTo=2026-03-31&studentId=abc123

# onlyUnpaid игнорирует paymentDate фильтр
GET /api/lessons?onlyUnpaid=true&paymentDateFrom=2026-03-01  → paymentDateFrom игнорируется
```

## Формат ответа

Без изменений — та же структура `{ lessons: Lesson[], pagination?: {...} }`.
