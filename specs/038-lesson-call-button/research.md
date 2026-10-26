# Research: Звонок как атрибут урока

Все пункты Technical Context определены; открытых NEEDS CLARIFICATION нет.
Решения опираются на текущий код: `backend/src/services/callSignaling/`,
`backend/src/services/callRecord/`, `frontend/src/features/videoCall/`,
`frontend/src/entities/callRecord/` и утверждённые макеты (28 маркеров
`TODO(auto-feature)`).

## R1. Связь записи звонка с уроком

- **Decision**: nullable FK `call_records."lessonId"` → `lessons.id`,
  `onDelete: SetNull`, индекс `@@index([lessonId, startedAt])`; обратная связь
  `Lesson.callRecords CallRecord[]`. Одна миграция
  `<timestamp>_038_call_record_lesson`, без бэкфилла (старые звонки остаются
  без урока, FR-011 / US4-4).
- **Rationale**: `SetNull` даёт ровно FR-011 «при удалении урока записи
  сохраняются без ссылки»; индекс обслуживает выборку «звонки урока» (R7)
  в том же порядке сортировки, что история.
- **Alternatives**: снимок урока (subject/startTime) в записи звонка — дубль
  данных и расхождение после переноса урока; `Cascade` — теряет историю.

## R2. Как урок попадает на сервер в сигналинге

- **Decision**: `call_invite` получает необязательное поле `lessonId`.
  Репетитор шлёт `targetStudentId` (+ `lessonId` у звонка по уроку), ученик —
  только `lessonId` (обязательно). Парсер `lib/websocket/signaling.helpers.ts`
  принимает `lessonId` как непустую строку не длиннее `LESSON_ID_MAX_LENGTH`
  (64, новая константа в `signaling.constants.ts`), иначе сообщение
  отбрасывается (как с битым `targetStudentId`).
- **Rationale**: минимальное изменение протокола; пара по-прежнему
  определяется существующими `resolvePairForTutor` / `resolvePairForStudent`,
  урок проверяется отдельно против уже найденной пары.
- **Alternatives**: у репетитора выводить ученика из урока (без
  `targetStudentId`) — ломает звонок из карточки ученика и требует второй
  ветки разрешения пары.

## R3. Проверка урока и отказы (FR-007, FR-008, SC-005)

- **Decision**: в `callFlow.handleInvite` после `resolvePair`:
  - ученик без `lessonId` → `CallAuthorizationError(STUDENT_INVITE_WITHOUT_LESSON_MESSAGE)`
    = «Звонок возможен только по уроку» (проверка до обращения к БД);
  - `lessonId` задан → новый `resolveCallLesson(pair, lessonId)` в
    `callSignaling.helpers.ts`: `prisma.lesson.findFirst({ where: { id,
    tutorId: pair.tutorUserId, studentId: pair.studentId }, select: { id,
    subject, startTime, endTime } })`; не найден →
    `CallAuthorizationError(CALL_LESSON_NOT_FOUND_MESSAGE)` = «Урок не найден».
  Отказ приходит звонящему существующим `call_error` (→ тост), до
  `ringCallee`, поэтому запись звонка не создаётся (edge case «подделка»).
  Статус урока и время не проверяются (уточнение: звонить можно всегда).
- **Rationale**: тот же путь ошибок, что у остальных отказов звонка
  (`processCallSignal` уже мапит `CallAuthorizationError` в `call_error`);
  новых классов ошибок не нужно.
- **Alternatives**: отдельный тип сигнала отказа — лишний протокол.

## R4. Снятие ограничения по архиву (FR-010)

- **Decision**: удалить проверки `archived` из `resolvePairForTutor` и
  `resolvePairForStudent` и константу `ARCHIVED_STUDENT_CALL_MESSAGE`;
  `archived` больше не выбирается. На фронте кнопка «Видеозвонок» в карточке
  ученика зависит только от `student.studentUser`. Тесты, проверявшие отказ
  для архива, переписываются на «звонок проходит» (регрессия FR-010).
- **Alternatives**: нет — прямое требование.

## R5. Урок в живом звонке, во входящем и в записи

- **Decision**: `LiveCall` получает `lesson: CallLesson | null`
  (`{ id, subject, startTime: Date, endTime: Date }`), `callRegistry.startCall`
  принимает его. `call_incoming` получает `lesson: CallLessonPayload | null`
  (даты ISO). `finishCall` и запись «Пропущен» при офлайн-собеседнике передают
  `lessonId` в `createCallRecord`. Повторный инвайт, заменяющий звонящий
  вызов, несёт свой урок.
- **Lesson deleted mid-call**: `createCallRecord` при ошибке внешнего ключа
  Prisma `P2003` по `lessonId` повторяет запись один раз с `lessonId: null`
  — запись звонка сохраняется без урока (FR-011, регрессионный тест).
- **Rationale**: урок проверен один раз при инвайте; хранить его в живом
  звонке дешевле, чем перечитывать при завершении.

## R6. Урок в истории звонков (FR-013)

- **Decision**: `CALL_RECORD_WITH_PEER` дополняется
  `lesson: { select: { id, subject, startTime, endTime } }`;
  `CallHistoryItem.lesson: CallLessonSummary | null` (даты ISO) в
  `toCallHistoryItem`. Обе истории (репетитора и ученика) получают поле.
  На фронте `CallHistoryRecord.lesson` становится обязательным
  (`CallLessonSummary | null`), строка «Урок: …» уже свёрстана в
  `CallHistoryRow`.

## R7. Звонки урока в окне урока репетитора (FR-014)

- **Decision**: `GET /api/calls/lessons/:lessonId` (только репетитор,
  `authenticateToken`), сервис `getLessonCallsForTutor(tutorUserId, lessonId)`:
  `where: { tutorId, lessonId }`, сортировка как в истории, `take:
  MAX_HISTORY_LIMIT`. Чужой или несуществующий урок → `200 { items: [] }`
  (фильтр по `tutorId` исключает утечку, блок просто не показывается).
  Фронт: `entities/callRecord` — `getLessonCalls(lessonId)` и
  `lessonCalls.model.ts`: `LessonCallsGate` (`createGate<string>`, монтирует
  `LessonCallList` с `lessonId`), `$lessonCalls`, `refreshRequested`;
  загрузка по открытию — `loadLessonCallsFx` (в `$isBlocking`), фоновое
  обновление по `call_history_updated` — `refreshLessonCallsFx` (не блокирует,
  как `refreshCallHistoryFx`). Ответ применяется, только если его `lessonId`
  совпадает с открытым (`LessonCallsGate.state`); ошибка → пустой список
  (блок скрыт, уточнение); закрытие гейта сбрасывает список.
- **Alternatives**: фильтровать общую историю на клиенте — история ограничена
  50 записями и грузится только на своей странице.

## R8. «Есть кабинет» в уроке репетитора (FR-002)

- **Decision**: во всех ответах уроков репетитору `student` дополняется
  `studentUser: { id } | null` — то же поле и то же условие, что в
  `GET /api/students` (`getStudents.ts`) и в карточке ученика. Общая
  Prisma-константа `LESSON_STUDENT_INCLUDE = { student: { include: {
  studentUser: { select: { id: true } } } } }` в
  `services/lessonsQuery/lessonsQuery.constants.ts`; используют
  `fetchLessonsPage`, `getLesson` (контроллер), `lessonCreation` (обе выборки),
  а `lessonUpdate` добавляет `studentUser: { select: { id: true } }` в свой
  `select`. Фронт: `Lesson.student` — `Pick<Student, … | "studentUser">`;
  кнопка — `Boolean(lesson.student?.studentUser)`.
- **Alternatives**: вычисляемый `hasCabinet: boolean` — нужен маппер на
  каждом из пяти путей ответа; поле `studentUser` уже публично в API учеников.

## R9. Модель подтверждения звонка (FR-005, FR-006, FR-015, US3)

- **Decision**: `features/videoCall/model/callConfirm.model.ts`
  (`callConfirmModel`):
  - `$isOpen: boolean`, `$call: StartCallParams | null` — `$call` не
    очищается при закрытии (заменяется следующим запросом), чтобы во время
    анимации закрытия не мигало пустое имя;
  - `callRequested(StartCallParams)` → открыть; `confirmDismissed` (Отмена,
    клик вне окна, Esc) → закрыть; `callModel.incomingCallReceived` → закрыть
    (edge case);
  - `callConfirmed` (кнопка) → только при `$isOpen` → закрыть и выдать
    `confirmed: Event<StartCallParams>` → `callRequestModel.callRequested`
    (существующая защита: звонок стартует только в фазе `idle`). Двойное
    нажатие: второй клик приходит при `$isOpen = false` и отбрасывается.
  - `StartCallParams` = `{ studentId, peerName, lesson: CallLessonSummary |
    null }` (репетитор) | `{ peerName, lesson: CallLessonSummary }` (ученик) —
    тип ученика без урока невыразим (FR-001 на уровне типов).
  - `callRequestModel` убирается из публичного API `features/videoCall`:
    единственный вход для кнопок — `callConfirmModel.callRequested`
    (SC-003).
- Диалоги-источники закрываются по `callConfirmModel.confirmed`:
  окно урока репетитора — если `lesson?.id` совпадает с `$viewingLesson`;
  окно урока ученика — если совпадает с открытым; карточка ученика — если
  `lesson === null` и звонок репетитора (`"studentId" in call`).
- **Alternatives**: подтверждение внутри каждой кнопки (локальный
  `useState`) — логика в компонентах и три копии защиты от двойного клика.

## R10. Окно урока ученика (FR-004)

- **Decision**: `features/studentSchedule/models/studentLessonDialog.model.ts`:
  `$openedLessonId`, `$openedLesson = combine($lessons, $openedLessonId)`
  (урок исчез из недели или удалён по WS → окно закрывается само),
  `lessonOpened(id)` (карточка), `dialogClosed`, `callRequested` → источник
  `{ $openedLesson, studentUserModel.$studentSession }` →
  `callConfirmModel.callRequested({ peerName: tutor.name, lesson })`; сброс
  `$openedLessonId` по `dialogClosed`, `lessonDeleted` с тем же id,
  `StudentSchedulePageGate.close` и подтверждённому звонку по этому уроку.
  `StudentLessonCard` вызывает `studentLessonDialogModel.lessonOpened` через
  `../../models` — deep import и цикл исчезают.
- Кнопка «Позвонить» показывается, если в сессии есть репетитор
  (`session.tutor`); неделя расписания не меняется (US2-5).

## R11. Входящий звонок с уроком (FR-012)

- **Decision**: фронтовый `parseCallSignal` читает необязательный `lesson`
  у `call_incoming`; некорректный объект урока превращается в `null`
  (звонок не теряется). `signalRouting` передаёт `lesson` в
  `IncomingCall.lesson: CallLessonSummary | null`. `IncomingCallModal` уже
  свёрстан.

## R12. Удаление мок-обвязки

Удаляются: `CallConfirmDialog.hooks.ts`, `CallConfirmDialog.types.ts`,
`StudentLessonDialog.hooks.ts`, `LessonDialogActions.constants.ts`,
`IncomingCallModal.constants.ts`, `LessonCallList.constants.ts`,
`MOCK_CALL_HISTORY` из `CallHistoryList.constants.ts`, `getCallMockParam`
(`?mock=calls` / `?mock=incoming-call`), `getMockIncomingCall` и его экспорт,
`mockCallConfirmRequested` и его экспорт, мок-ветка в `CallOverlay`,
`pages/studentCabinet/StudentCabinetLayout.model.ts` и его тест. Финальная
проверка: `grep -rn "TODO(auto-feature)\|mock" frontend/src` по затронутым
файлам пуст.

## R13. Тексты подтверждения (правка макета)

Заголовок «Начать видеозвонок?», под аватаром отдельной строкой имя
собеседника (`Styled.PeerName`), блок «Звонок по уроку» только при `lesson`,
кнопки «Отмена» / «Позвонить» (мобильная ширина: колонка, «Позвонить»
сверху, высота 48 px — как в макете).
