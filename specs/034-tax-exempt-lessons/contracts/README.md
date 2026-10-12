# API Contracts: 034-tax-exempt-lessons

Новых эндпоинтов нет. Меняются тела запросов и ответов трёх существующих
групп роутов. Все роуты ниже — только для репетитора (`authenticateToken`).
Эндпоинты кабинета ученика (`/api/student-cabinet/*`) и WS-канал ученика
(`/ws/student`) не меняются ни в одном поле (FR-022, research R11).

---

## 1. Уроки — `/api/lessons`

### `POST /api/lessons` — создание

Тело расширяется одним необязательным полем:

```ts
isTaxExempt?: boolean; // по умолчанию false
```

| Вход | Результат |
| --- | --- |
| поле отсутствует | урок(и) создаются с `isTaxExempt: false` |
| `true` / `false` | сохраняется как есть; при `isRecurring: true` у **каждого** урока серии (FR-006) |
| `null`, `"true"`, `1` и любое не-булево | `400 { error: "Некорректное значение признака «Не облагается налогом»" }` |

Ответ (`201`): `{ lesson }` (у регулярных также `message`), `lesson.isTaxExempt: boolean`.

### `PUT /api/lessons/:id` — обновление (попап и форма)

```ts
isTaxExempt?: boolean;
```

Попап отправляет только это поле:

```http
PUT /api/lessons/clx123
Content-Type: application/json

{ "isTaxExempt": true }
```

```json
200 { "message": "Урок успешно обновлен", "lesson": { "id": "clx123", "isTaxExempt": true, "status": "CANCELLED", "...": "..." } }
```

| Ситуация | Ответ |
| --- | --- |
| булево значение, свой урок | `200`, меняется только этот урок (FR-008) |
| не-булево значение | `400 { error: "Некорректное значение признака «Не облагается налогом»" }` |
| чужой или несуществующий урок | `404 { error: "Урок не найден" }` |
| урок в статусе `CANCELLED` (в т. ч. прошедший), тело без `status` | `200`, `status` остаётся `CANCELLED` (research R5) |
| урок серии, в том же теле новая `price` | цена распространяется на будущие уроки серии как раньше, признак нет |

Форма редактирования всегда шлёт `isTaxExempt` булевым значением
вместе с остальными полями; `undefined` не используется, иначе снятие
признака не сохранилось бы.

### `GET /api/lessons`, `/api/lessons/upcoming`, `/api/lessons/:id` и другие выборки

Каждый урок содержит `isTaxExempt: boolean` (сырые строки Prisma,
поле появляется само). Фильтров по признаку нет.

---

## 2. Статистика — `GET /api/statistics`

К ответу добавляется одно поле:

```ts
taxExemptIncome: number | null;
```

| Учёт налога | Необлагаемые оплаты в периоде | `taxAmount` | `taxBreakdown` | `taxExemptIncome` |
| --- | --- | --- | --- | --- |
| выключен | любые | `null` | `null` | `null` |
| включён | нет | как до фичи | как до фичи | `0` |
| включён | есть | налог только по облагаемым | строки только по облагаемым | сумма необлагаемых оплат, ₽ |

- Оплаты относятся к периоду по `paymentDate ?? startTime`, та же
  выборка, что у `taxAmount` и `paymentsInRangeSum`.
- Необлагаемые оплаты не попадают ни в одну строку `taxBreakdown`,
  в том числе в `isOutsidePeriods: true`.
- Остальные поля ответа от признака не зависят (FR-013).

Пример (ставка 6%, оплаты 1000 ₽ и 2000 ₽, вторая необлагаемая):

```json
{
  "earnings": 3000,
  "paymentsInRangeSum": 3000,
  "taxAmount": 60,
  "taxBreakdown": [{ "rate": 6, "earnings": 1000, "tax": 60 }],
  "taxExemptIncome": 2000
}
```

### Отображение на фронте

- Подпись карточки — прежнее правило `getTaxLabel(taxBreakdown)`.
- Info-иконка: `taxBreakdown.length > 1 || есть isOutsidePeriods || taxExemptIncome > 0`.
- Тултип: строки ставок как раньше и последней строкой
  `Не облагается налогом: 2 000 ₽`, только при `taxExemptIncome > 0`.

---

## 3. Test support — `POST /api/__test__/lessons` (только `NODE_ENV=test` + `E2E=1`)

Тело принимает `isTaxExempt?: boolean` (по умолчанию `false`) для
сидирования e2e. Продовых эндпоинтов это не касается.

---

## 4. WebSocket

Новых событий нет (Clarifications спеки, research R12).

- `/ws` (репетитор): `lesson_status_updated { lessonId, status }`
  не меняется. Клиент по нему вызывает `lessonModel.updateLesson`
  с телом только `{ status }`, поэтому `isTaxExempt` не затирается,
  а ответ сервера приносит актуальный признак.
- `/ws/student`: payload событий об уроках (`LessonForBroadcast`)
  не содержит `isTaxExempt`.
