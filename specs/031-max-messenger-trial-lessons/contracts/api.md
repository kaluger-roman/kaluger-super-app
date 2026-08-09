# API Contracts: Мессенджер MAX и пробные уроки без ученика

**Date**: 2026-08-08 | **Plan**: [../plan.md](../plan.md)

Новых эндпоинтов нет — расширяются контракты существующих. Все ответы
с ошибками — существующий формат `{ error: string }`, тексты на русском.

## 1. Students API — ContactMethod

### POST `/api/students`, PUT `/api/students/:id`

Изменение: поля `contactMethod` и `parentContactMethod` принимают
`"WHATSAPP" | "TELEGRAM" | "MAX"`.

```jsonc
// request (фрагмент)
{
  "contactMethod": "MAX",          // было: WHATSAPP | TELEGRAM
  "parentContactMethod": "MAX"     // опционально, тот же union
}
```

Валидация:

- отсутствие `contactMethod` при создании → 400, текст ошибки обновлён
  и перечисляет три мессенджера;
- значение вне union → 400.

Ответ: объект студента как раньше, с новым возможным значением enum.

## 2. Lessons API — пробный урок без ученика

### POST `/api/lessons`

Изменение: `studentId` становится опциональным; добавлены prospect-поля.
Ровно один из `studentId` / `prospectName` обязателен.

```jsonc
// Вариант А — обычный урок (без изменений)
{
  "subject": "MATHEMATICS",
  "lessonType": "EGE",
  "startTime": "2026-08-10T10:00:00.000Z",
  "endTime": "2026-08-10T11:00:00.000Z",
  "studentId": "cku...",
  "price": 1500,              // опционально; fallback student.hourlyRate
  "isRecurring": true         // допустимо только при studentId
}

// Вариант Б — пробный урок без ученика (новое)
{
  "subject": "PHYSICS",
  "lessonType": "OGE",
  "startTime": "2026-08-10T12:00:00.000Z",
  "endTime": "2026-08-10T13:00:00.000Z",
  "prospectName": "Иван (пробный)",       // обязателен в этом варианте
  "prospectPhone": "+79991234567",        // опционально
  "prospectContactMethod": "MAX",         // опционально: WHATSAPP|TELEGRAM|MAX
  "price": 0                              // опционально; fallback 0 (не hourlyRate)
}
```

Ошибки (400, русские тексты):

- нет ни `studentId`, ни `prospectName` → «ID студента или имя ученика для
  пробного урока обязательны» (точная формулировка — на реализации);
- заданы оба `studentId` и `prospectName` → 400;
- `prospectName` пустой/пробельный при уроке без ученика → 400;
- `isRecurring: true` без `studentId` → 400 («Пробный урок без ученика
  не может быть повторяющимся»);
- prospect-поля вместе с `studentId` → 400.

Ответ 201: объект урока; для урока без ученика `student: null`,
`studentId: null`, prospect-поля заполнены.

### GET `/api/lessons`, GET `/api/lessons/:id`

Изменение формата ответа: `studentId` и `student` могут быть `null`;
добавлены `prospectName`, `prospectPhone`, `prospectContactMethod`
(`null` для обычных уроков).

```jsonc
// элемент списка (фрагмент, урок без ученика)
{
  "id": "...",
  "studentId": null,
  "student": null,
  "prospectName": "Иван (пробный)",
  "prospectPhone": "+79991234567",
  "prospectContactMethod": "MAX",
  "price": "0",
  "isRecurring": false
  // ... остальные поля без изменений
}
```

Фильтр `?studentId=` работает как раньше (уроки без ученика под него
не попадают).

### PUT `/api/lessons/:id`

Два новых сценария:

1. **Правка prospect-полей** урока без ученика:

```jsonc
{ "prospectName": "Иван Петров", "prospectPhone": "+79990000000", "prospectContactMethod": "TELEGRAM" }
```

2. **Привязка к ученику** (урок с `studentId = null`):

```jsonc
{ "studentId": "cku..." }
```

Поведение привязки: сервер проверяет, что студент принадлежит репетитору
(404 иначе), устанавливает `studentId` и атомарно очищает
`prospectName/prospectPhone/prospectContactMethod`. Ответ — обычный урок
с `student`. Отвязка (`studentId: null` для урока со студентом)
не поддерживается → 400.

Ошибки: prospect-поля в запросе для урока, у которого уже есть студент →
400; невалидный `prospectContactMethod` → 400.

### DELETE `/api/lessons/:id`, отмена (PUT со статусом CANCELLED)

- `deleteAllFuture` применим только к урокам со студентом (уроки без
  ученика не бывают recurring) — guard по `studentId`.
- Отмена урока без ученика: перенос оплаты не выполняется,
  `GET /api/lessons/:id/cancellation-info` возвращает ответ без
  `nextLesson*`-полей (как при отсутствии следующего урока).

## 3. Statistics API

### GET `/api/statistics`

Без изменений контракта: `trialLessonsCount` продолжает считать уроки
с ценой 0/null — теперь включая уроки без ученика.

### GET `/api/statistics/students` (getStudentStats)

Без изменений контракта; уроки с `studentId = null` исключаются из
группировки (не образуют безымянной строки).

## 4. Student Cabinet API

Без изменений: выборки идут по `studentId` конкретного ученика,
prospect-поля не входят в `select` и не попадают в ответы кабинета.

## 5. WebSocket

События по урокам для репетитора — без изменений формата (payload урока
получает те же новые поля). Broadcast в кабинет ученика для уроков
с `studentId = null` не отправляется.
