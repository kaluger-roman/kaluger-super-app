# Tasks: Звонок как атрибут урока

**Input**: Design documents from `/specs/038-lesson-call-button/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/signaling-ws.md](./contracts/signaling-ws.md), [contracts/call-records-api.md](./contracts/call-records-api.md), [quickstart.md](./quickstart.md)

**Tests**: ВКЛЮЧЕНЫ и обязательны. `CLAUDE.md`: «All new code must have full
test coverage… Do NOT skip tests or defer them to a later PR»; конституция,
принцип VI. Код, добавленный на этапе макетов (`CallConfirmDialog`,
`StudentLessonDialog`, `LessonCallList`, блок урока в `IncomingCallModal` и
`CallHistoryRow`, кликабельная `StudentLessonCard`), тестов пока не имеет —
они пишутся в этих задачах.

**Organization**: по пользовательским историям спеки: US1 — репетитор звонит
из окна урока, US2 — ученик звонит только из окна урока, US3 — подтверждение
перед любым звонком (карточка ученика), US4 — звонок привязан к уроку в данных
и истории.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимостей от незавершённых задач)
- **[Story]**: US1–US4, только в фазах историй

## Состояние кодовой базы на старте (важно)

UI собран на этапе макетов и утверждён (`docs/mockups/038-lesson-call-button/index.md`),
с одной правкой пользователя: заголовок подтверждения «Начать видеозвонок?»,
имя собеседника отдельной строкой под аватаром (вместо «Позвонить <имя>?»).
В коде **28** маркеров `TODO(auto-feature)` (`grep -rn "TODO(auto-feature)" frontend/src`
на home). Моки: in-memory сторы на `useSyncExternalStore`
(`CallConfirmDialog.hooks.ts`, `StudentLessonDialog.hooks.ts`), переключатели
`?mock=calls` / `?mock=incoming-call` (`getCallMockParam` в
`features/videoCall/videoCall.helpers.ts`), мок-экспорты
`mockCallConfirmRequested` (`videoCall/ui/index.ts`,
`CallConfirmDialog/index.ts`) и `getMockIncomingCall`
(`IncomingCallModal/index.ts`), мок «есть кабинет» по имени
(`LessonDialogActions.constants.ts`), deep import в `StudentLessonCard.tsx`,
мёртвый `pages/studentCabinet/StudentCabinetLayout.model.ts`
(`tutorCallRequested`) и его тест. Кнопка в шапке кабинета ученика уже убрана
из `StudentCabinetLayout.tsx`. Серверная часть не тронута.

Окружение: Claude на сервере, код и команды на home. Файлы — через
`/root/super-app/.claude/worktrees/lesson-call-button/…`, команды —
`ssh home 'source ~/.nvm/nvm.sh; cd ~/kaluger-super-app/.claude/worktrees/lesson-call-button && …'`.
Никаких `git`/`grep`/`find` по sshfs. Все пути ниже — от корня worktree.

---

## Phase 1: Setup

**Purpose**: окружение ветки со сменой Prisma-схемы.

- [X] T001 Подготовить backend worktree: если `backend/node_modules` — симлинк на основной чекаут, заменить его своим `npm ci` в `backend/` (иначе `prisma generate` перепишет клиент main checkout); скопировать `backend/.env` и `backend/.env.test` из основного чекаута, если их нет; `frontend/node_modules` можно оставить симлинком
- [X] T002 Прочитать `docs/conventions/frontend.md`, `docs/conventions/backend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/backend-testing.md`, `docs/conventions/e2e-testing.md` перед первой правкой кода

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: урок в протоколе звонка и единая модель подтверждения — без них
не работает ни одна история.

**⚠️ CRITICAL**: US1–US3 начинаются только после этой фазы.

### Backend: урок в `call_invite`

- [X] T003 Добавить в `backend/src/types/call.ts` тип `CallLessonSummary = { id: string; subject: Subject; startTime: string; endTime: string }` (Subject из `@prisma/client`) и поле `lessonId?: string` в `call_invite` у `CallSignalingInbound`; реэкспорт через `backend/src/types/index.ts`
- [X] T004 [P] В `backend/src/lib/websocket/signaling.constants.ts` добавить `LESSON_ID_MAX_LENGTH = 64`; в `backend/src/lib/websocket/signaling.helpers.ts` (`parseCallSignal`, ветка `call_invite`) разбирать `lessonId`: отсутствует → без поля; непустая строка ≤ 64 → в сообщение; иначе (не строка, пустая, длиннее) → `null`. Сочетается с `targetStudentId` и без него
- [X] T005 [P] Тесты парсера в `backend/src/lib/websocket/__tests__/signaling.helpers.test.ts`: invite с `lessonId` (с `targetStudentId` и без), без `lessonId`, `lessonId` пустой / число / 65 символов → сообщение отброшено
- [X] T006 В `backend/src/services/callSignaling/callSignaling.constants.ts` добавить `CALL_LESSON_NOT_FOUND_MESSAGE = "Урок не найден"`; в `callSignaling.types.ts` — `CallLesson = { id: string; subject: Subject; startTime: Date; endTime: Date }` и поле `lesson: CallLesson | null` в `LiveCall`
- [X] T007 В `backend/src/services/callSignaling/callSignaling.helpers.ts` добавить `resolveCallLesson(pair: ResolvedPair, lessonId: string): Promise<CallLesson>` — `prisma.lesson.findFirst({ where: { id: lessonId, tutorId: pair.tutorUserId, studentId: pair.studentId }, select: { id, subject, startTime, endTime } })`, не найден → `throw new CallAuthorizationError(CALL_LESSON_NOT_FOUND_MESSAGE)`; статус и время урока не проверять
- [X] T008 В `backend/src/services/callSignaling/callSignaling.ts` `startCall(pair, callerKind, lesson, onRingTimeout)` кладёт `lesson` в `LiveCall`; в `backend/src/services/callSignaling/callFlow.ts` `handleInvite` после `resolvePair` при `data.lessonId` вызывает `resolveCallLesson` (иначе `lesson = null`) до проверки занятости/офлайна и передаёт урок в `ringCallee` → `startCall`. Отказ уходит существующим `call_error { message, inviteId }`, запись звонка не создаётся. Повторный инвайт, заменяющий звонящий вызов, несёт свой урок
- [X] T009 Тесты в `backend/src/services/callSignaling/__tests__/callSignaling.helpers.test.ts`: `resolveCallLesson` возвращает урок пары; урок другого ученика того же репетитора, урок другого репетитора, несуществующий id → «Урок не найден»; отменённый и прошедший урок пары принимаются
- [X] T010 Тесты в `backend/src/services/callSignaling/__tests__/callFlow.test.ts`: репетитор с `lessonId` своего урока ученика → `call_ringing`; с уроком другого ученика / удалённым уроком → `call_error` «Урок не найден», `call_records` для пары не появилось, собеседник ничего не получил

### Frontend: урок в параметрах звонка

- [X] T011 В `frontend/src/entities/callRecord/callRecord.types.ts` оставить `CallLessonSummary` (уже есть) экспортируемым через `frontend/src/entities/callRecord/index.ts`; в `frontend/src/features/videoCall/model/call.types.ts` заменить `StartCallParams` на `{ studentId: string; peerName: string; lesson: CallLessonSummary | null } | { peerName: string; lesson: CallLessonSummary }`; в `frontend/src/features/videoCall/model/signaling.types.ts` добавить `lessonId?: string` в `call_invite`
- [X] T012 Вынести сборку инвайта из `sendInviteFx` (`frontend/src/features/videoCall/model/callSignals.model.ts`) в чистый `toInviteMessage(call: StartCallParams, inviteId: string): CallSignalingInbound` в `frontend/src/features/videoCall/model/call.helpers.ts`: `targetStudentId` у звонка репетитора, `lessonId` при `call.lesson`
- [X] T013 [P] Тесты `toInviteMessage` в `frontend/src/features/videoCall/model/__tests__/call.helpers.test.ts` (репетитор без урока, репетитор с уроком, ученик с уроком); обновить фикстуры `StartCallParams` (поле `lesson`) в `frontend/src/features/videoCall/model/__tests__/callScreen.model.test.ts`, `callLifecycle.model.test.ts`, `signalRouting.model.test.ts`, `call.model.test.ts` и других тестах `videoCall/model/__tests__`, где строится `StartCallParams`

### Frontend: модель подтверждения (FR-005, FR-015)

- [X] T014 Создать `frontend/src/features/videoCall/model/callConfirm.model.ts` (research R9): `$isOpen` (`false`), `$call: StartCallParams | null` (при закрытии не очищается), события `callRequested: Event<StartCallParams>` (открыть, записать `$call`), `confirmDismissed` (закрыть), `callConfirmed` (кнопка «Позвонить»), производное `confirmed: Event<StartCallParams>` = `sample({ clock: callConfirmed, source: $call, filter: $isOpen && call !== null })`; `confirmed` → `$isOpen = false` и → `callRequestModel.callRequested`; `callModel.incomingCallReceived` → `$isOpen = false`. Только `sample`, порядок gates → stores → events → effects → samples
- [X] T015 В `frontend/src/features/videoCall/model/index.ts` добавить `export * as callConfirmModel from "./callConfirm.model"` и убрать `export * as callRequestModel` из публичного API (кнопки звонят только через подтверждение, SC-003); внутренние тесты импортируют `callRequest.model` напрямую
- [X] T016 [P] Тесты `frontend/src/features/videoCall/model/__tests__/callConfirm.model.test.ts` (`fork`, `createWatch`): запрос открывает и не стартует звонок (`callModel.callStarted` не вызван); `confirmDismissed` закрывает без звонка; `callConfirmed` закрывает и стартует ровно один звонок с теми же параметрами; два `callConfirmed` подряд → один `callStarted`; `callConfirmed` без открытого окна — ничего; входящий звонок при открытом подтверждении закрывает его без звонка; подтверждение при уже идущем звонке (фаза не `idle`) звонок не начинает; `$call` сохраняется после закрытия
- [X] T017 Переписать `frontend/src/features/videoCall/ui/CallConfirmDialog/CallConfirmDialog.tsx` на `callConfirmModel` (`useUnit($isOpen)`, `useUnit($call)`, actions `{ dismiss: confirmDismissed, confirm: callConfirmed }`); заголовок `Начать видеозвонок?` (`id="call-confirm-title"`), под `CallAvatar` новая строка с именем (`Styled.PeerName` в `CallConfirmDialog.styled.ts`, `overflowWrap: "anywhere"`), блок «Звонок по уроку» только при `call.lesson`; удалить `CallConfirmDialog.hooks.ts` и `CallConfirmDialog.types.ts`, экспорт `mockCallConfirmRequested` из `frontend/src/features/videoCall/ui/CallConfirmDialog/index.ts` и `frontend/src/features/videoCall/ui/index.ts`
- [X] T018 [P] Компонентный тест `frontend/src/features/videoCall/ui/CallConfirmDialog/__tests__/CallConfirmDialog.test.tsx` (`fork` + `Provider`, тема): закрыт по умолчанию; после `callRequested` — диалог с заголовком «Начать видеозвонок?», именем собеседника, кнопками «Отмена» / «Позвонить»; блок «Звонок по уроку» с предметом и временем у звонка с уроком и без блока у звонка без урока; «Отмена» и Esc закрывают без звонка; «Позвонить» вызывает `callConfirmed`; двойной клик → один звонок

**Checkpoint**: протокол принимает урок, подтверждение работает на модели — можно начинать истории.

---

## Phase 3: User Story 1 — Репетитор звонит ученику из попапа урока (Priority: P1) 🎯 MVP

**Goal**: в окне урока репетитора «Позвонить» для ученика с кабинетом (в любом статусе, в архиве тоже); подтверждение; после подтверждения окно урока закрывается и уходит звонок по уроку.

**Independent Test**: открыть урок ученика с кабинетом → «Позвонить» → подтверждение с именем и уроком → подтвердить → окно урока закрыто, исходящий звонок ученику; у ученика без кабинета и у пробного урока кнопки нет; у ученика в архиве есть и звонок проходит.

### Backend

- [X] T019 [P] [US1] Создать `backend/src/services/lessonsQuery/lessonsQuery.constants.ts` с `LESSON_STUDENT_INCLUDE = { student: { include: { studentUser: { select: { id: true } } } } } as const` (экспорт через `backend/src/services/lessonsQuery/index.ts`) и использовать его вместо `include: { student: true }` в `backend/src/services/lessonsQuery/lessonsQuery.ts` (`fetchLessonsPage`), `backend/src/controllers/lessons/getLessons.ts` (`getLesson`), `backend/src/services/lessonCreation/lessonCreation.ts` (обе выборки, строки ~50 и ~98); в `backend/src/services/lessonUpdate/lessonUpdate.ts` и `lessonUpdate.types.ts` добавить `studentUser: { select: { id: true } }` в `select` ученика. Типы проверить `npm run build`
- [X] T020 [P] [US1] Тесты API уроков: ученик с привязанной учётной записью → `lesson.student.studentUser.id`, без неё → `studentUser: null`, пробный урок → `student: null` в `backend/src/controllers/lessons/__tests__/getLessons.test.ts` (список и `GET /api/lessons/:id`), `createLesson.test.ts` (`POST`), `updateLesson.test.ts` (`PUT`)
- [X] T021 [US1] Снять ограничение по архиву (FR-010): удалить проверки `archived` и выбор поля `archived` в `resolvePairForTutor` / `resolvePairForStudent` (`backend/src/services/callSignaling/callSignaling.helpers.ts`), константу `ARCHIVED_STUDENT_CALL_MESSAGE` из `callSignaling.constants.ts` и её импорт
- [X] T022 [US1] Регрессия FR-010: в `backend/src/services/callSignaling/__tests__/callSignaling.helpers.test.ts` тест «should reject a student whose Student record is archived» заменить на разрешение пары для архивного ученика (и для репетитора, и для ученика); в `backend/src/services/callSignaling/__tests__/callFlow.test.ts` тест «should answer call_error when the tutor calls an archived student» заменить на «звонок архивному ученику звонит (`call_incoming` у ученика)», включая звонок по уроку архивного ученика

### Frontend

- [X] T023 [P] [US1] В `frontend/src/shared/types/lesson.ts` добавить `"studentUser"` в `Pick<Student, …>` у `Lesson.student`; поправить фикстуры уроков в тестах, если `tsc` потребует
- [X] T024 [US1] Создать `frontend/src/features/lessons/models/lessonCall.helpers.ts`: `toCallLesson(lesson: Lesson): CallLessonSummary` (перенести из `LessonDialogActions.helpers.ts`), `hasCallableStudent(lesson: Lesson): boolean` = `Boolean(lesson.student?.studentUser)`, `toLessonCall(lesson: Lesson): StartCallParams | null` (`{ studentId, peerName: student.name, lesson: toCallLesson(lesson) }` или `null`)
- [X] T025 [US1] Создать `frontend/src/features/lessons/models/lessonCall.model.ts`: `lessonCallRequested` → `source: lessonsViewDialogModel.$viewingLesson` → `toLessonCall` → `filter` не `null` → `callConfirmModel.callRequested`; `callConfirmModel.confirmed` с `call.lesson?.id === $viewingLesson?.id` → `lessonsViewDialogModel.viewDialogClosed` (FR-006); экспорт `lessonCallModel` в `frontend/src/features/lessons/models/index.ts`. Импорт `callConfirmModel` — из `../../videoCall` (как уже делает `students`)
- [X] T026 [P] [US1] Тесты `frontend/src/features/lessons/models/__tests__/lessonCall.helpers.test.ts` (кабинет есть / нет / пробный урок; summary урока) и `frontend/src/features/lessons/models/__tests__/lessonCall.model.test.ts` (`fork`): запрос открывает подтверждение с `studentId`, именем и уроком; без кабинета — не открывает; подтверждение закрывает окно урока; отмена — окно открыто; подтверждение звонка по другому уроку / из карточки ученика окно не закрывает
- [X] T027 [US1] `frontend/src/features/lessons/ui/LessonViewDialog/LessonDialogActions/LessonDialogActions.tsx`: кнопка при `hasCallableStudent(lesson)`, `onClick` → `lessonCallModel.lessonCallRequested`; убрать `mockCallConfirmRequested`, `getCallableStudentName`, `toCallLesson` из компонента; удалить `LessonDialogActions.constants.ts` и `LessonDialogActions.helpers.ts`
- [X] T028 [P] [US1] Тесты `frontend/src/features/lessons/ui/LessonViewDialog/LessonDialogActions/__tests__/LessonDialogActions.test.tsx` и `frontend/src/features/lessons/ui/LessonViewDialog/__tests__/LessonViewDialog.test.tsx`: «Позвонить» есть у ученика с кабинетом (запланированный, проведённый, отменённый урок; ученик в архиве), нет без кабинета и у пробного урока; клик открывает подтверждение (диалог «Начать видеозвонок?»), окно урока остаётся; прежние действия на месте

**Checkpoint**: US1 работает от начала до конца (звонок уходит с `lessonId`, сервер его проверяет).

---

## Phase 4: User Story 2 — Ученик звонит только из попапа урока (Priority: P1)

**Goal**: в шапке кабинета нет звонка; карточка урока открывает окно урока с «Позвонить»; звонок ученика без урока отклоняется сервером.

**Independent Test**: кабинет ученика без «Позвонить» в шапке; клик по карточке урока → окно урока с данными и «Позвонить» → подтверждение с именем репетитора → звонок репетитору; закрытие окна оставляет ту же неделю.

### Backend

- [X] T029 [US2] FR-008: в `backend/src/services/callSignaling/callSignaling.constants.ts` добавить `STUDENT_INVITE_WITHOUT_LESSON_MESSAGE = "Звонок возможен только по уроку"`; в `backend/src/services/callSignaling/callFlow.ts` (`resolvePair` или `handleInvite`) инвайт ученика без `lessonId` → `CallAuthorizationError(STUDENT_INVITE_WITHOUT_LESSON_MESSAGE)` до обращения к БД; с `lessonId` → `resolveCallLesson`
- [X] T030 [US2] Тесты в `backend/src/services/callSignaling/__tests__/callFlow.test.ts`: ученик без `lessonId` → `call_error` «Звонок возможен только по уроку», репетитор ничего не получил, записи нет; ученик с уроком своей пары → звонит репетитору; ученик с уроком чужого ученика / другого репетитора / удалённым → «Урок не найден», записи нет (SC-005)
- [X] T031 [US2] Обновить существующие backend-тесты, где ученик шлёт `call_invite` без урока: создать урок пары в фикстуре и передавать `lessonId` в `backend/src/services/callSignaling/__tests__/callFlow.test.ts`, `callLifecycle.test.ts`, `backend/src/lib/websocket/__tests__/webSocketManager.calls.test.ts`, `webSocketManager.waiting.test.ts`, `signaling.test.ts` (проверить все 17 мест `call_invite`); прогнать `npm test -- --testPathPatterns="callSignaling|websocket"`

### Frontend

- [X] T032 [US2] Создать `frontend/src/features/studentSchedule/models/studentLessonDialog.helpers.ts`: `findOpenedLesson(lessons, id): StudentVisibleLesson | null`, `toStudentLessonCall(lesson: StudentVisibleLesson, tutorName: string): StartCallParams` (`{ peerName: tutorName, lesson: { id, subject, startTime, endTime } }`)
- [X] T033 [US2] Создать `frontend/src/features/studentSchedule/models/studentLessonDialog.model.ts` (research R10): `$openedLessonId`, `$openedLesson = combine(studentScheduleModel.$lessons, $openedLessonId, findOpenedLesson)`, `$tutorName` (из `studentUserModel.$studentSession`, `session?.tutor?.name ?? null`), события `lessonOpened(id)`, `dialogClosed`, `callRequested`; `callRequested` → `source: { lesson: $openedLesson, tutorName: $tutorName }` → `filter` оба есть → `toStudentLessonCall` → `callConfirmModel.callRequested`; сброс `$openedLessonId` по `dialogClosed`, `studentScheduleModel.lessonDeleted` с тем же id, `StudentSchedulePageGate.close`, `callConfirmModel.confirmed` с `lesson.id` открытого урока (FR-006); экспорт `studentLessonDialogModel` в `frontend/src/features/studentSchedule/models/index.ts`
- [X] T034 [P] [US2] Тесты `frontend/src/features/studentSchedule/models/__tests__/studentLessonDialog.helpers.test.ts` и `studentLessonDialog.model.test.ts` (`fork`): открытие по id; урок удалён по WS / ушёл из недели → `$openedLesson` `null`; `callRequested` открывает подтверждение с именем репетитора и уроком; без репетитора в сессии — не открывает; подтверждение закрывает окно; отмена — окно открыто; закрытие окна не меняет `$weekStart`; закрытие гейта сбрасывает
- [X] T035 [US2] `frontend/src/features/studentSchedule/ui/StudentLessonCard/StudentLessonCard.tsx`: `onClick` → `studentLessonDialogModel.lessonOpened(lesson.id)` через `useUnit` и `../../models`; убрать deep import и комментарий-маркер. `frontend/src/features/studentSchedule/ui/StudentLessonDialog/StudentLessonDialog.tsx`: `useUnit(studentLessonDialogModel.$openedLesson)`, `$tutorName`, actions `{ close: dialogClosed, call: callRequested }`; убрать `mockCallConfirmRequested` и мок-хуки; удалить `StudentLessonDialog.hooks.ts`
- [X] T036 [P] [US2] Компонентные тесты `frontend/src/features/studentSchedule/ui/StudentLessonCard/__tests__/StudentLessonCard.test.tsx` (клик и Enter открывают окно урока, `aria-haspopup="dialog"`) и `frontend/src/features/studentSchedule/ui/StudentLessonDialog/__tests__/StudentLessonDialog.test.tsx` (предмет, статус, день, время, длительность, имя репетитора; «Закрыть»; «Позвонить» открывает подтверждение с именем репетитора и блоком урока; нет урока — ничего не рендерится)
- [X] T037 [US2] FR-001: удалить `frontend/src/pages/studentCabinet/StudentCabinetLayout.model.ts` и `frontend/src/pages/studentCabinet/__tests__/StudentCabinetLayout.model.test.ts`; убедиться, что `frontend/src/pages/studentCabinet/StudentCabinetLayout.tsx` и `index.ts` на него не ссылаются
- [X] T038 [P] [US2] Регрессионный тест `frontend/src/pages/studentCabinet/__tests__/StudentCabinetLayout.test.tsx`: в шапке кабинета ученика (с репетитором в сессии) нет кнопки «Позвонить»
- [X] T039 [P] [US2] Тест `frontend/src/pages/studentSchedule` (существующий тест страницы или новый `frontend/src/pages/studentSchedule/__tests__/StudentSchedulePage.test.tsx`): клик по карточке урока открывает окно урока, закрытие возвращает к той же неделе

**Checkpoint**: US1 + US2 = MVP: звонок только из урока у обеих сторон.

---

## Phase 5: User Story 3 — Подтверждение перед любым звонком (Priority: P1)

**Goal**: «Видеозвонок» в карточке ученика тоже через подтверждение; кнопка есть и у ученика в архиве.

**Independent Test**: «Видеозвонок» в карточке ученика → подтверждение без блока урока; отмена — карточка открыта, звонка нет; подтверждение — карточка закрыта, звонок начат; у архивного ученика с кабинетом кнопка есть.

- [X] T040 [US3] `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.model.ts`: `callRequested(student)` → `callConfirmModel.callRequested({ studentId, peerName, lesson: null })` вместо `callRequestModel`; карточка закрывается (`studentsModel.viewDialogClosed`) по `callConfirmModel.confirmed` с `lesson === null` и `"studentId" in call`, а не сразу по нажатию (FR-006)
- [X] T041 [US3] `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.tsx`: кнопка при `student.studentUser` (без проверки архива, FR-010), `onClick` → `actions.callRequested(student)`; убрать `mockCallConfirmRequested` и маркер
- [X] T042 [P] [US3] Тесты `frontend/src/features/students/ui/StudentViewDialog/__tests__/StudentViewDialog.model.test.ts` (запрос открывает подтверждение без урока и не закрывает карточку; подтверждение закрывает карточку и стартует звонок; отмена — карточка открыта; подтверждение звонка по уроку карточку не трогает) и `StudentViewDialog.test.tsx` (кнопка видна у архивного ученика с кабинетом, не видна без кабинета; клик показывает «Начать видеозвонок?» без блока урока)

**Checkpoint**: любой исходящий звонок проходит через подтверждение (SC-003).

---

## Phase 6: User Story 4 — Звонок привязан к уроку в данных и истории (Priority: P2)

**Goal**: запись звонка хранит урок при любом исходе; урок виден во входящем, в истории, в блоке «Звонки по уроку».

**Independent Test**: позвонить из окна урока, завершить → в истории строка урока, в окне урока звонок с длительностью; звонок из карточки ученика без урока; удаление урока оставляет записи без урока.

### Backend: схема и запись

- [X] T043 [US4] `backend/prisma/schema.prisma`: в `CallRecord` — `lessonId String?`, `lesson Lesson? @relation(fields: [lessonId], references: [id], onDelete: SetNull)`, `@@index([lessonId, startedAt])`; в `Lesson` — `callRecords CallRecord[]`. Миграция `npx prisma migrate dev --name 038_call_record_lesson` (SQL как в `data-model.md`), затем `npm run db:generate` и `npm run db:migrate:test`
- [X] T044 [US4] `backend/src/services/callRecord/callRecord.types.ts`: `lessonId: string | null` в `CreateCallRecordArgs`; `backend/src/services/callRecord/callRecord.helpers.ts`: `isLessonForeignKeyError(error: unknown): boolean` (`Prisma.PrismaClientKnownRequestError` с `code === "P2003"`); `backend/src/services/callRecord/createCallRecord.ts`: пишет `lessonId`, при `isLessonForeignKeyError` и `lessonId !== null` повторяет запись один раз с `lessonId: null`
- [X] T045 [US4] `backend/src/services/callSignaling/callFlow.ts`: `finishCall` передаёт `lessonId: call.lesson?.id ?? null`; запись `MISSED` при офлайн-собеседнике в `ringCallee` — `lessonId` урока инвайта; `call_incoming` получает `lesson: toCallLessonPayload(lesson)` (новый хелпер в `callSignaling.helpers.ts`: даты в ISO, `null` без урока); тип `call_incoming` в `backend/src/types/call.ts` — `lesson: CallLessonSummary | null`
- [X] T046 [P] [US4] Тесты `backend/src/services/callRecord/__tests__/createCallRecord.test.ts`: запись с `lessonId`; без урока — `null`; урок удалён до записи → запись создана с `lessonId: null` (регрессия «урок удалён во время звонка»); удаление урока после записи → `lessonId` становится `null`, запись осталась (FR-011); `callRecord.helpers.test.ts` — `isLessonForeignKeyError`
- [X] T047 [P] [US4] Тесты в `backend/src/services/callSignaling/__tests__/callFlow.test.ts` / `callOutcome.test.ts` / `callLifecycle.test.ts`: `call_incoming.lesson` = summary урока у звонка по уроку и `null` без урока (обе стороны звонящие); запись связана с уроком при `COMPLETED`, `REJECTED`, `CANCELED`, `MISSED` по таймауту, `MISSED` при офлайн-собеседнике, `FAILED`, обрыве; звонок из карточки ученика — запись без урока; урок удалён во время звонка → запись без урока; урок переведён в «Проведён» во время звонка — запись связана

### Backend: история и звонки урока

- [X] T048 [US4] `backend/src/services/callRecord/callRecord.constants.ts`: `CALL_RECORD_WITH_PEER.include.lesson = { select: { id: true, subject: true, startTime: true, endTime: true } }`; `toCallHistoryItem` в `callRecord.helpers.ts` → `lesson: { id, subject, startTime.toISOString(), endTime.toISOString() } | null`; `CallHistoryItem.lesson` в `backend/src/types/call.ts`
- [X] T049 [US4] `backend/src/services/callRecord/getCallHistory.ts`: `getLessonCallsForTutor(tutorUserId: string, lessonId: string): Promise<CallHistoryItem[]>` через `queryRecords({ tutorId, lessonId }, { limit: MAX_HISTORY_LIMIT })`; экспорт в `backend/src/services/callRecord/index.ts` и `backend/src/services/index.ts`
- [X] T050 [US4] Контроллер `backend/src/controllers/callRecords/getLessonCalls.ts` (`getTutorLessonCalls`: 401 без `req.user`, `res.json({ items })`, try/catch → 500 «Внутренняя ошибка сервера»), экспорт в `backend/src/controllers/callRecords/index.ts` и `backend/src/controllers/index.ts`; маршрут `callRecordsRouter.get("/lessons/:lessonId", authenticateToken, getTutorLessonCalls)` в `backend/src/routes/callRecords.ts`
- [X] T051 [US4] `backend/src/routes/testSupport.ts` (`POST /call-records`): принимать необязательный `lessonId`
- [X] T052 [P] [US4] Тесты `backend/src/services/callRecord/__tests__/callRecord.helpers.test.ts` (`toCallHistoryItem` с уроком и без) и `backend/src/controllers/callRecords/__tests__/getCallHistory.test.ts` (поле `lesson` в истории репетитора и ученика; `null` у звонка без урока и после удаления урока)
- [X] T053 [P] [US4] Тесты `backend/src/controllers/callRecords/__tests__/getLessonCalls.test.ts`: звонки урока обеих сторон, новые сверху, без звонков других уроков; урок другого репетитора и несуществующий → `200 []`; 401 без токена; 401 со студенческим токеном (cross-role)

### Frontend: урок во входящем звонке

- [X] T054 [US4] `frontend/src/features/videoCall/model/signaling.types.ts`: `call_incoming.lesson: CallLessonSummary | null`; `frontend/src/features/videoCall/model/signaling.helpers.ts`: чистый `toCallLesson(value: unknown): CallLessonSummary | null` (id/subject/startTime/endTime строки, subject из `MATHEMATICS`/`PHYSICS`), в `parseCallSignal` для `call_incoming` `lesson: toCallLesson(data.lesson)` — битый или отсутствующий урок → `null`, звонок не теряется
- [X] T055 [US4] `frontend/src/features/videoCall/model/call.types.ts`: `IncomingCall.lesson: CallLessonSummary | null` (обязательное, убрать маркер); `frontend/src/features/videoCall/model/signalRouting.model.ts`: в `incomingCallReceived` передавать `lesson: message.lesson`
- [X] T056 [US4] `frontend/src/features/videoCall/ui/IncomingCallModal/IncomingCallModal.tsx`: только `useUnit(callModel.$incomingCall)`; удалить `getMockIncomingCall` из `IncomingCallModal.helpers.ts` и `index.ts`, удалить `IncomingCallModal.constants.ts`; `frontend/src/features/videoCall/ui/CallOverlay/CallOverlay.tsx`: убрать мок-ветку (`phase === "incoming"` только)
- [X] T057 [P] [US4] Тесты: `frontend/src/features/videoCall/model/__tests__/signaling.test.ts` (`call_incoming` с уроком, без урока, с битым уроком → `lesson: null`); `signalRouting.model.test.ts` (урок доходит до `$incomingCall`); `frontend/src/features/videoCall/ui/IncomingCallModal/__tests__/IncomingCallModal.test.tsx` (блок «Звонок по уроку» с предметом, днём и временем; без урока блока нет); `CallOverlay.test.tsx` — без мок-ветки

### Frontend: история и звонки урока

- [X] T058 [US4] `frontend/src/entities/callRecord/callRecord.types.ts`: `CallHistoryRecord.lesson: CallLessonSummary | null` обязательное (убрать маркер), `LessonCallsRequest = { lessonId: string }`; `frontend/src/entities/callRecord/api/callHistoryApi.ts`: `getLessonCalls(lessonId)` → `api.get<CallHistoryResponse>(\`/calls/lessons/${encodeURIComponent(lessonId)}\`)`, экспорт в `api/index.ts`
- [X] T059 [US4] Создать `frontend/src/entities/callRecord/model/lessonCalls.model.ts` (research R7): `LessonCallsGate = createGate<string>()`, `$lessonCalls`, `refreshRequested`, `loadLessonCallsFx`, `refreshLessonCallsFx`; открытие гейта → загрузка; `refreshRequested` при открытом гейте → фоновое обновление; ответ применяется, только если `params.lessonId === LessonCallsGate.state`; ошибка загрузки → `[]`; закрытие гейта → `[]`. Экспорт `lessonCallsModel` в `frontend/src/entities/callRecord/model/index.ts` и `frontend/src/entities/callRecord/index.ts`
- [X] T060 [US4] `frontend/src/app/model/blocking.model.ts`: добавить `lessonCallsModel.loadLessonCallsFx.pending` (фоновое обновление не добавлять); `frontend/src/features/videoCall/model/signalRouting.model.ts`: `signals.historyUpdated` → также `lessonCallsModel.refreshRequested`
- [X] T061 [US4] `frontend/src/features/videoCall/ui/LessonCallList/LessonCallList.tsx`: проп `lessonId`, `useGate(lessonCallsModel.LessonCallsGate, lessonId)`, `useUnit(lessonCallsModel.$lessonCalls)`, пусто → `null`; удалить `LessonCallList.constants.ts`; `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.tsx` передаёт `lesson.id`. `frontend/src/features/videoCall/ui/CallHistoryList/CallHistoryList.tsx`: только `callHistoryModel.$callHistory`, удалить `MOCK_CALL_HISTORY` из `CallHistoryList.constants.ts`
- [X] T062 [US4] Удалить `getCallMockParam` из `frontend/src/features/videoCall/videoCall.helpers.ts` (после T056 и T061 вызовов не остаётся)
- [X] T063 [P] [US4] Тесты: `frontend/src/entities/callRecord/api/__tests__/callHistoryApi.test.ts` (`getLessonCalls` бьёт в `/calls/lessons/:id`); `frontend/src/entities/callRecord/model/__tests__/lessonCalls.model.test.ts` (загрузка по гейту, устаревший ответ другого урока не применяется, refresh только при открытом гейте, ошибка → пусто, закрытие → пусто); `signalRouting.model.test.ts` (`call_history_updated` → refresh звонков урока)
- [X] T064 [P] [US4] Компонентные тесты `frontend/src/features/videoCall/ui/LessonCallList/__tests__/LessonCallList.test.tsx` (список «Звонки по уроку»: направление, время, исход, длительность; пусто → блока нет), `frontend/src/features/videoCall/ui/CallHistoryList/__tests__/CallHistoryList.test.tsx` (строка «Урок: Физика · …» у звонка по уроку, нет у звонка без урока); `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.test.tsx` — блок появляется при звонках урока; `frontend/src/features/videoCall/__tests__/videoCall.helpers.test.ts` — `formatCallLesson*`

**Checkpoint**: все истории работают независимо.

---

## Phase 7: E2E

- [X] T065 [P] `frontend/e2e/helpers/db.ts`: `seedCallRecord` принимает `lessonId`
- [X] T066 Обновить `frontend/e2e/students/video-call.spec.ts`: «Видеозвонок» в карточке ученика → подтверждение «Начать видеозвонок?» → «Позвонить»; звонки ученика (строки ~35, ~96, ~182) — через карточку урока в расписании (урок создать `createLesson`) и подтверждение вместо кнопки в шапке; проверка, что в шапке кабинета нет «Позвонить»
- [X] T067 [P] Новый `frontend/e2e/lessons/lesson-call.spec.ts` (`@regression`): репетитор открывает урок ученика с кабинетом → «Позвонить» → отмена (окно урока открыто) → «Позвонить» → подтвердить → окно урока закрыто, у ученика входящий с блоком «Звонок по уроку» → принять → завершить → в окне урока блок «Звонки по уроку»; ученик звонит по уроку из расписания, репетитор видит урок во входящем; у урока ученика без кабинета кнопки нет
- [X] T068 [P] `frontend/e2e/students/call-history.spec.ts`: звонок, засеянный с `lessonId`, показывает строку урока в истории репетитора и ученика

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T069 На home: `grep -rn "TODO(auto-feature)\|getCallMockParam\|mockCallConfirmRequested\|getMockIncomingCall\|useSyncExternalStore\|MOCK_" frontend/src` — пусто (кроме не относящихся к фиче `MOCK_`); `grep -rn "ARCHIVED_STUDENT_CALL_MESSAGE\|callRequestModel" frontend/src backend/src` — только внутри `features/videoCall/model`
- [X] T070 `cd frontend && npm run find-cycle` — циклов нет (особенно `lessons`/`students`/`studentSchedule` → `videoCall` → `@entities`)
- [X] T071 Перечитать `docs/conventions/frontend.md` и `docs/conventions/backend.md` и проверить весь diff: named exports, `type`, без `any`, `sample` only, модели < 200 строк, компоненты < 150, хелперы/константы вне компонентов, без `sx`/`style`, ошибки на русском, минимум комментариев
- [X] T072 `npm run check` из корня во время работы; один раз перед коммитом `npm run check -- --full` (backend-тесты через `scripts/dev-stack.sh test-backend`); исправить всё красное
- [ ] T073 Ручная проверка по `specs/038-lesson-call-button/quickstart.md`, сценарии 1–18, десктоп и 375 px

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → US1, US2, US3, US4
- **US1 (P1)**, **US2 (P1)**, **US3 (P1)**: зависят только от Phase 2, друг от друга независимы
- **US4 (P2)**: зависит от Phase 2 (урок в `LiveCall`, `lessonId` в инвайте); миграция T043 — внутри US4. Блок «Звонки по уроку» встраивается в окно урока, которое уже есть, US1 для него не нужен
- **E2E (Phase 7)**: после US1–US4
- **Polish (Phase 8)**: последним

### Внутри фаз

- T003 → T004, T006 → T007 → T008 → T009, T010
- T011 → T012 → T013; T011 → T014 → T015 → T016, T017 → T018
- US1: T019 → T020; T021 → T022; T023 → T024 → T025 → T026, T027 → T028
- US2: T029 → T030, T031; T032 → T033 → T034, T035 → T036, T039; T037 → T038
- US3: T040 → T041 → T042
- US4: T043 → T044 → T045 → T046, T047; T048 → T049 → T050 → T052, T053; T054 → T055 → T056 → T057; T058 → T059 → T060 → T061 → T062 → T063, T064

### Parallel Opportunities

- Phase 2: backend (T003–T010) и frontend (T011–T018) — параллельно
- После Phase 2: US1, US2, US3, US4 — параллельно разными исполнителями (общих файлов нет, кроме `callFlow.ts` у T029/T045 и `signalRouting.model.ts` у T055/T060 — их делать последовательно)
- Тестовые задачи с [P] внутри истории — параллельно после своей реализации

## Parallel Example: User Story 1

```bash
# backend и frontend части US1 одновременно:
Task: "T019 LESSON_STUDENT_INCLUDE во всех ответах уроков"
Task: "T021 снять ограничение по архиву в callSignaling.helpers.ts"
Task: "T023 Lesson.student + studentUser во frontend/src/shared/types/lesson.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T046 тесты createCallRecord"
Task: "T052 тесты истории с уроком"
Task: "T053 тесты GET /api/calls/lessons/:lessonId"
Task: "T057 тесты урока во входящем"
```

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2
2. US1 (репетитор из урока) → проверить независимо
3. US2 (ученик из урока, без кнопки в шапке) → проверить
4. US3 (подтверждение в карточке ученика) → MVP закрыт: все три P1

### Incremental Delivery

5. US4 (урок в записи, входящем, истории, окне урока)
6. E2E → Polish → `npm run check -- --full`

Коммит и PR — один на всю ветку (draft PR уже открыт оркестратором); в
конце `/changelog`, `/news`, `gh pr edit`, `gh pr ready`.
