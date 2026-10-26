# Implementation Plan: Звонок как атрибут урока

**Branch**: `038-lesson-call-button` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-lesson-call-button/spec.md`

## Summary

Звонок переезжает в урок. У репетитора в окне просмотра урока появляется
«Позвонить» (ученик урока с кабинетом; статус, время и архивность не важны),
у ученика карточка урока в расписании открывает окно урока с «Позвонить»,
а общая кнопка в шапке кабинета исчезает. Любой исходящий звонок, включая
«Видеозвонок» в карточке ученика, начинается только после подтверждения
«Начать видеозвонок?». Звонок по уроку несёт урок на сервер; сервер
проверяет, что урок принадлежит паре, отклоняет звонки ученика без урока,
перестаёт запрещать звонки с учеником в архиве и сохраняет ссылку на урок
в записи звонка. Урок виден во входящем звонке, в истории звонков и в блоке
«Звонки по уроку» окна урока репетитора.

**Технический подход.**

- **БД**: nullable FK `call_records."lessonId"` → `lessons`, `ON DELETE SET
  NULL`, индекс `(lessonId, startedAt)` (R1).
- **Сигналинг**: `call_invite.lessonId?` (у ученика обязателен),
  `resolveCallLesson` против уже найденной пары, отказы через существующий
  `call_error` («Урок не найден», «Звонок возможен только по уроку»), без
  записи звонка; снятие проверок `archived` (R2–R4). `LiveCall.lesson` →
  `call_incoming.lesson` и `lessonId` в каждой записи звонка, повтор без
  урока при `P2003` (R5).
- **REST**: `lesson` в элементах обеих историй (R6); новый
  `GET /api/calls/lessons/:lessonId` для репетитора (R7);
  `student.studentUser` во всех ответах уроков репетитору через общую
  Prisma-константу (R8).
- **Фронт**: UI собран и утверждён на этапе макетов; работа — заменить моки
  моделями: `callConfirmModel` (единственный вход для кнопок звонка,
  `callRequestModel` уходит из публичного API), `lessonCallModel` (окно урока
  репетитора), `studentLessonDialogModel` (окно урока ученика),
  `lessonCallsModel` (звонки урока), урок во входящем звонке; заголовок
  подтверждения по правке макета; снести всю мок-обвязку (28 маркеров
  `TODO(auto-feature)`, `?mock=…`, in-memory сторы, мок-экспорты, deep import,
  мёртвый `StudentCabinetLayout.model.ts`) (R9–R13).

Новых зависимостей нет; новых WS-типов нет (меняются поля `call_invite`
и `call_incoming`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, effector-react, patronum, Material UI (styled API), axios — frontend; Express, Prisma, ws — backend. Новых зависимостей нет
**Storage**: PostgreSQL через Prisma. Одна новая nullable-колонка `call_records."lessonId"` (FK на `lessons`, `ON DELETE SET NULL`) + индекс `(lessonId, startedAt)`; без бэкфилла
**Testing**: Vitest + RTL + MSW (frontend, `fork` для моделей); Jest + Supertest + реальная тестовая БД (backend); Playwright (e2e)
**Target Platform**: Веб (десктоп и мобильная ширина 375 px), Linux-сервер для API
**Project Type**: web (frontend + backend монорепо)
**Performance Goals**: проверка урока при инвайте — один индексный `findFirst`; звонки урока — одна индексная выборка ≤ 100 записей
**Constraints**: FSD-импорты только вниз, без циклов (`madge`); модели < 200 строк, компоненты < 150; ошибки на русском; без `<form>` и `useEffect` для загрузки данных
**Scale/Scope**: ~10 backend-файлов (сигналинг, записи звонков, уроки, миграция), ~35 frontend-файлов (videoCall, callRecord, lessons, students, studentSchedule, studentCabinet), e2e звонков

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус | Как соблюдается |
|---|---|---|
| I. FSD | PASS | `lessons`, `students`, `studentSchedule` → `videoCall` (feature → feature через относительный импорт index, как уже делают `students` и `lessons`); `videoCall` → `@entities` (`CallLessonSummary`, `lessonCallsModel`); deep import в `StudentLessonCard` убирается; `find-cycle` в проверках |
| II. Layered MVC | PASS | новый контроллер `getLessonCalls` только парсит параметр и отвечает; выборка в сервисе `callRecord`; проверка урока в сервисе `callSignaling` |
| III. Effector | PASS | `sample` only, модели namespace'ами, гейты для загрузки (`LessonCallsGate`), никаких `useSyncExternalStore`-сторов; новые модели отдельными файлами (`lessonsViewDialog.model.ts` уже ~200 строк) |
| IV. Type safety | PASS | `type`, без `any`; `StartCallParams` делает звонок ученика без урока невыразимым; Prisma-типы через `GetPayload` |
| V. Consistency | PASS | ошибки в `callSignaling.constants.ts` на русском, через существующий `CallAuthorizationError` (новых классов нет) |
| VI. Testing | PASS | полный набор тестов на каждое изменение (см. tasks), регрессии: архив, удаление урока во время звонка, двойное подтверждение |
| VII. Simplicity | PASS | без флагов и шимов; общий путь ошибок; одна общая Prisma-константа вместо маппера на пяти путях |

Post-design re-check: PASS, нарушений нет, Complexity Tracking пуст.

## Project Structure

### Documentation (this feature)

```text
specs/038-lesson-call-button/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── signaling-ws.md
│   └── call-records-api.md
├── checklists/
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                   # CallRecord.lessonId, Lesson.callRecords
│   └── migrations/<ts>_038_call_record_lesson/         # NEW
└── src/
    ├── types/call.ts                                   # call_invite.lessonId, call_incoming.lesson, CallHistoryItem.lesson, CallLessonSummary
    ├── lib/websocket/
    │   ├── signaling.constants.ts                      # LESSON_ID_MAX_LENGTH
    │   └── signaling.helpers.ts                        # parse lessonId
    ├── services/callSignaling/
    │   ├── callSignaling.constants.ts                  # − ARCHIVED_…, + STUDENT_INVITE_WITHOUT_LESSON_MESSAGE, CALL_LESSON_NOT_FOUND_MESSAGE
    │   ├── callSignaling.helpers.ts                    # − archived checks, + resolveCallLesson, toCallLessonPayload
    │   ├── callSignaling.types.ts                      # CallLesson, LiveCall.lesson
    │   ├── callSignaling.ts                            # startCall(pair, lesson, …)
    │   └── callFlow.ts                                 # lesson in invite/ring/finish/offline record
    ├── services/callRecord/
    │   ├── callRecord.constants.ts                     # include lesson
    │   ├── callRecord.helpers.ts                       # toCallHistoryItem.lesson, isLessonForeignKeyError
    │   ├── callRecord.types.ts                         # lessonId in CreateCallRecordArgs
    │   ├── createCallRecord.ts                         # lessonId + P2003 fallback
    │   └── getCallHistory.ts                           # + getLessonCallsForTutor
    ├── services/lessonsQuery/lessonsQuery.constants.ts # NEW LESSON_STUDENT_INCLUDE
    ├── services/lessonsQuery/lessonsQuery.ts           # use it
    ├── services/lessonCreation/lessonCreation.ts       # use it
    ├── services/lessonUpdate/lessonUpdate.{ts,types.ts}# studentUser in select
    ├── controllers/lessons/getLessons.ts               # getLesson uses it
    ├── controllers/callRecords/getLessonCalls.ts       # NEW
    ├── routes/callRecords.ts                           # GET /lessons/:lessonId
    └── routes/testSupport.ts                           # call-records accepts lessonId

frontend/src/
├── shared/types/lesson.ts                              # Lesson.student + studentUser
├── entities/callRecord/
│   ├── callRecord.types.ts                             # lesson required, LessonCallsRequest
│   ├── api/callHistoryApi.ts                           # + getLessonCalls
│   └── model/lessonCalls.model.ts                      # NEW lessonCallsModel
├── app/model/blocking.model.ts                         # + loadLessonCallsFx.pending
├── features/videoCall/
│   ├── model/callConfirm.model.ts                      # NEW callConfirmModel
│   ├── model/call.types.ts, signaling.types.ts         # StartCallParams.lesson, IncomingCall.lesson, invite lessonId
│   ├── model/signaling.helpers.ts                      # parse call_incoming.lesson
│   ├── model/signalRouting.model.ts                    # lesson → IncomingCall; history → lesson calls refresh
│   ├── model/callSignals.model.ts                      # invite lessonId
│   ├── model/index.ts                                  # + callConfirmModel, − callRequestModel export
│   ├── ui/CallConfirmDialog/                           # real model, «Начать видеозвонок?», − hooks/types mocks
│   ├── ui/IncomingCallModal/, ui/CallOverlay/          # − mocks
│   ├── ui/CallHistoryList/                             # − MOCK_CALL_HISTORY
│   ├── ui/LessonCallList/                              # LessonCallsGate, − mock constants
│   └── videoCall.helpers.ts                            # − getCallMockParam
├── features/lessons/
│   ├── models/lessonCall.{model,helpers}.ts            # NEW
│   └── ui/LessonViewDialog/…                           # real visibility, − mock constants
├── features/students/ui/StudentViewDialog/             # confirmation, archived visible
├── features/studentSchedule/
│   ├── models/studentLessonDialog.{model,helpers}.ts   # NEW
│   └── ui/StudentLessonCard/, StudentLessonDialog/     # real model, − hooks mock, − deep import
└── pages/studentCabinet/StudentCabinetLayout.model.ts  # DELETE (+ test)

frontend/e2e/
├── helpers/db.ts                                       # seedCallRecord lessonId
├── students/video-call.spec.ts                         # confirmation; student calls via lesson
├── students/call-history.spec.ts                       # lesson line
└── lessons/lesson-call.spec.ts                         # NEW
```

**Structure Decision**: существующий веб-монорепо (`frontend/` FSD,
`backend/` layered MVC); новые файлы только внутри уже существующих срезов.

## Complexity Tracking

Нарушений нет.
