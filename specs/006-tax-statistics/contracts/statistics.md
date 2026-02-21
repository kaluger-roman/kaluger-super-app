# API Contracts: 006-tax-statistics

## Modified Endpoints

### GET /api/statistics

Существующий эндпоинт. Добавляется поле `taxAmount` в ответ.

**Request** (без изменений):
```
GET /api/statistics?startDate=2026-02-01&endDate=2026-02-21
Authorization: Bearer <jwt>
```

**Response** (добавлено поле `taxAmount`):
```json
{
  "completedLessons": 20,
  "cancelledLessons": 2,
  "upcomingLessons": 5,
  "totalLessons": 27,
  "earnings": 50000,
  "lastMonthEarnings": 45000,
  "lostEarnings": 5000,
  "upcomingIncome": 12500,
  "prepaidIncome": 2500,
  "unpaidDebtSum": 7500,
  "unpaidDebtCount": 3,
  "unpaidDebtOver24hSum": 5000,
  "unpaidDebtOver24hCount": 2,
  "trialLessonsCount": 1,
  "taxAmount": 3000
}
```

**Расчёт `taxAmount`**:
- `taxAmount = Math.round(earnings × user.taxRate / 100)`
- Если `user.taxRate` не задан → используется 6.0
- Если `earnings = 0` → `taxAmount = 0`

---

### PUT /api/auth/profile

Существующий эндпоинт. Добавляется опциональный параметр `taxRate`.

**Request** (расширен):
```json
{
  "name": "Иван Петров",
  "taxRate": 13.0
}
```

Оба поля опциональны. Отправляется хотя бы одно.

**Response** (расширен):
```json
{
  "message": "Профиль успешно обновлен",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "Иван Петров",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "isEmailVerified": true,
    "taxRate": 13.0
  }
}
```

**Валидация `taxRate`**:
- Тип: number
- Диапазон: 0 ≤ taxRate ≤ 100
- Ошибки:
  - 400: `"Ставка налога должна быть от 0 до 100"` — значение вне диапазона
  - 400: `"Имя не может быть пустым"` — если передан пустой name (существующая)

---

### GET /api/auth/profile

Существующий эндпоинт. Ответ расширяется полем `taxRate`.

**Response** (расширен):
```json
{
  "id": "clxxx",
  "email": "user@example.com",
  "name": "Иван Петров",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "isEmailVerified": true,
  "taxRate": 6.0
}
```
