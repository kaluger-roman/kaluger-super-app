# Data Model: Звонок как атрибут урока

## Prisma (backend/prisma/schema.prisma)

### CallRecord (изменение)

| Поле | Тип | Примечание |
|---|---|---|
| `lessonId` | `String?` | Новое. Урок, из окна которого начат звонок; `null` — звонок из карточки ученика или старая запись |
| `lesson` | `Lesson?` | `@relation(fields: [lessonId], references: [id], onDelete: SetNull)` |

Новый индекс: `@@index([lessonId, startedAt])`. Остальные поля без изменений.

### Lesson (изменение)

| Поле | Тип | Примечание |
|---|---|---|
| `callRecords` | `CallRecord[]` | Обратная связь, в БД колонок не добавляет |

### Миграция

`backend/prisma/migrations/<timestamp>_038_call_record_lesson/migration.sql`:

```sql
ALTER TABLE "call_records" ADD COLUMN "lessonId" TEXT;
CREATE INDEX "call_records_lessonId_startedAt_idx" ON "call_records"("lessonId", "startedAt");
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Генерируется `npm run db:migrate` (имя `038_call_record_lesson`); бэкфилла нет.

### Правила

- Запись звонка по уроку создаётся с `lessonId` при любом исходе: `COMPLETED`,
  `MISSED` (таймаут и офлайн-собеседник), `REJECTED`, `CANCELED`, `FAILED`.
- Урок удалён во время звонка → запись создаётся с `lessonId = null`
  (повтор после `P2003`).
- Урок удалён позже → `SET NULL`, запись остаётся (FR-011).
- Ученик удалён → записи удаляются каскадом (как сейчас).

## Backend runtime types

### `CallLesson` (`services/callSignaling/callSignaling.types.ts`)

```ts
type CallLesson = { id: string; subject: Subject; startTime: Date; endTime: Date };
```

`LiveCall.lesson: CallLesson | null` — урок живого звонка, проверен при инвайте.

### `CreateCallRecordArgs` (`services/callRecord/callRecord.types.ts`)

Добавляется `lessonId: string | null`.

### Shared API types (`src/types/call.ts`)

```ts
type CallLessonSummary = { id: string; subject: Subject; startTime: string; endTime: string };

// inbound
| { type: "call_invite"; inviteId: string; targetStudentId?: string; lessonId?: string }

// outbound
| { type: "call_incoming"; callId: string; callerName: string; lesson: CallLessonSummary | null; iceServers: IceServer[] }

type CallHistoryItem = {
  id: string; peerName: string; direction: CallDirection; startedAt: string;
  durationSeconds: number | null; status: CallStatus;
  lesson: CallLessonSummary | null;
};
```

### Урок репетитора в API

`student` в каждом ответе уроков репетитору (`GET /api/lessons`,
`GET /api/lessons/:id`, `POST /api/lessons`, `PUT /api/lessons/:id`)
содержит `studentUser: { id: string } | null`.

## Frontend types

| Файл | Изменение |
|---|---|
| `shared/types/lesson.ts` | `Lesson.student`: `Pick<Student, … \| "studentUser">` |
| `entities/callRecord/callRecord.types.ts` | `CallHistoryRecord.lesson: CallLessonSummary \| null` (обязательное); `LessonCallsRequest = { lessonId: string }` |
| `features/videoCall/model/call.types.ts` | `StartCallParams = { studentId; peerName; lesson: CallLessonSummary \| null } \| { peerName; lesson: CallLessonSummary }`; `IncomingCall.lesson: CallLessonSummary \| null` (обязательное) |
| `features/videoCall/model/signaling.types.ts` | `call_invite.lessonId?`, `call_incoming.lesson: CallLessonSummary \| null` |

## Frontend state (Effector)

### `callConfirmModel` (`features/videoCall/model/callConfirm.model.ts`)

| Unit | Тип | Поведение |
|---|---|---|
| `$isOpen` | `boolean` | открыт ли диалог подтверждения |
| `$call` | `StartCallParams \| null` | звонок, ожидающий подтверждения; при закрытии не очищается |
| `callRequested` | `Event<StartCallParams>` | кнопка звонка: открыть подтверждение |
| `confirmDismissed` | `Event<void>` | Отмена / клик вне окна / Esc |
| `callConfirmed` | `Event<void>` | «Позвонить»; работает только при `$isOpen` |
| `confirmed` | `Event<StartCallParams>` | производное: подтверждённый звонок → `callRequestModel.callRequested`; по нему закрываются окна-источники |

Закрывается также по `callModel.incomingCallReceived`.

### `lessonCallsModel` (`entities/callRecord/model/lessonCalls.model.ts`)

| Unit | Тип | Поведение |
|---|---|---|
| `LessonCallsGate` | `Gate<string>` | `lessonId` открытого окна урока |
| `$lessonCalls` | `CallHistoryRecord[]` | звонки урока; `[]` при ошибке и после закрытия гейта |
| `refreshRequested` | `Event<void>` | по `call_history_updated`; работает при открытом гейте |
| `loadLessonCallsFx` | `Effect<LessonCallsRequest, CallHistoryRecord[]>` | загрузка по открытию, в `$isBlocking` |
| `refreshLessonCallsFx` | то же | фоновое обновление, не блокирует |

Ответ применяется, только если `params.lessonId === LessonCallsGate.state`.

### `lessonCallModel` (`features/lessons/models/lessonCall.model.ts`)

| Unit | Поведение |
|---|---|
| `lessonCallRequested` | источник `lessonsViewDialogModel.$viewingLesson` → `toLessonCall(lesson)` (`null` без кабинета, фильтруется) → `callConfirmModel.callRequested` |
| — | `callConfirmModel.confirmed` с `lesson.id === $viewingLesson.id` → `viewDialogClosed` |

### `studentLessonDialogModel` (`features/studentSchedule/models/studentLessonDialog.model.ts`)

| Unit | Поведение |
|---|---|
| `$openedLessonId` | `string \| null` |
| `$openedLesson` | `combine($lessons, $openedLessonId)` → `StudentVisibleLesson \| null` |
| `lessonOpened` | `Event<string>` от карточки урока |
| `dialogClosed` | закрыть |
| `callRequested` | `{ $openedLesson, $studentSession }` → `callConfirmModel.callRequested({ peerName: tutor.name, lesson })` |
| — | сброс по `dialogClosed`, `lessonDeleted(id)`, `StudentSchedulePageGate.close`, `callConfirmModel.confirmed` с этим уроком |

### `studentViewDialogModel` (изменение)

`callRequested(student)` → `callConfirmModel.callRequested({ studentId, peerName,
lesson: null })`; карточка закрывается по `callConfirmModel.confirmed` с
`lesson === null` и `"studentId" in call`, а не сразу по нажатию.
