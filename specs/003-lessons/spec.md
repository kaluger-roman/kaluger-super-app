# Feature Specification: Lesson Management

**Feature Branch**: `003-lessons`
**Created**: 2026-02-20
**Status**: Implemented
**Input**: Retroactive spec for existing lesson management system

## User Scenarios & Testing

### User Story 1 - Create & Edit Lessons (Priority: P1)

Репетитор создаёт уроки, указывая ученика, предмет, тип, время, цену.
Может создать одиночный урок или серию еженедельных повторяющихся уроков.

**Why this priority**: Основная функция системы — управление расписанием.

**Independent Test**: POST /api/lessons с данными урока, проверить создание.
POST с isRecurring=true — проверить создание серии на 3 месяца.

**Acceptance Scenarios**:

1. **Given** авторизованный репетитор, **When** создаёт одиночный урок
   (ученик, предмет, тип, время начала/окончания, цена), **Then** урок
   сохраняется, статус автоматически определяется по времени
2. **Given** создание урока, **When** включает флаг "Повторяющийся",
   **Then** создаётся серия еженедельных уроков на 3 месяца вперёд,
   конфликтные слоты пропускаются
3. **Given** существующий урок, **When** редактирует время/цену,
   **Then** изменения применяются; для повторяющихся — сдвигаются все
   будущие уроки серии
4. **Given** время конфликтует с другим уроком, **When** пытается создать,
   **Then** ошибка "Конфликт расписания"

---

### User Story 2 - Lesson Views (Priority: P1)

Репетитор просматривает уроки в трёх режимах: расписание (календарь),
неделя, вкладки (предстоящие/завершённые/отменённые).

**Why this priority**: Навигация по урокам — ключевой рабочий процесс.

**Independent Test**: GET /api/lessons с различными фильтрами, проверить
корректность группировки и пагинации.

**Acceptance Scenarios**:

1. **Given** страница /lessons, **When** выбирает режим "Расписание",
   **Then** видит уроки сгруппированные по месяцам/дням в календарном виде
2. **Given** режим "Неделя", **When** просматривает, **Then** видит 7 дней
   с уроками по дням
3. **Given** режим "Вкладки", **When** переключается между
   Предстоящие/Завершённые/Отменённые, **Then** видит пагинированные списки
4. **Given** фильтры, **When** выбирает диапазон дат / ученика / только
   неоплаченные / без домашки, **Then** список фильтруется

---

### User Story 3 - Lesson Status & Payment (Priority: P1)

Статус урока автоматически меняется по времени. Репетитор отмечает
оплату и выставляет оценку.

**Why this priority**: Финансовый учёт и отслеживание статуса — core logic.

**Independent Test**: Создать урок в прошлом — статус COMPLETED. Отменить
оплаченный урок — оплата переносится на следующий неоплаченный.

**Acceptance Scenarios**:

1. **Given** урок со временем в будущем, **When** наступает startTime,
   **Then** статус автоматически меняется SCHEDULED → IN_PROGRESS
2. **Given** урок IN_PROGRESS, **When** наступает endTime,
   **Then** статус автоматически меняется → COMPLETED
3. **Given** завершённый урок, **When** репетитор отмечает как оплаченный,
   **Then** isPaid=true, фиксируется paymentDate
4. **Given** оплаченный урок, **When** отменяет его,
   **Then** оплата переносится на следующий неоплаченный урок серии
5. **Given** урок, **When** ставит оценку (1-5), **Then** grade сохраняется

---

### User Story 4 - Delete Lessons (Priority: P2)

Репетитор удаляет одиночный урок или все будущие уроки серии.

**Why this priority**: Необходимо для управления расписанием, но реже
используется чем создание/редактирование.

**Independent Test**: DELETE /api/lessons/:id, DELETE с deleteAllFuture=true.

**Acceptance Scenarios**:

1. **Given** одиночный урок, **When** удаляет, **Then** урок удалён
2. **Given** повторяющийся урок, **When** удаляет с флагом "Удалить все
   будущие", **Then** все будущие уроки серии удалены
3. **Given** диалог удаления, **When** подтверждает, **Then** урок удалён,
   список обновляется

---

### Edge Cases

- Создание урока в прошлом (статус сразу COMPLETED)
- Создание урока прямо сейчас (статус IN_PROGRESS)
- Конфликт при создании повторяющегося урока — конфликтные слоты пропускаются
- Отмена оплаченного урока без следующего неоплаченного в серии
- Изменение времени повторяющегося урока — сдвиг всех будущих
- Урок с отправленной домашкой (isHomeworkSentByTeacher)

## Requirements

### Functional Requirements

- **FR-001**: Система MUST поддерживать создание одиночных и повторяющихся
  (еженедельных на 3 месяца) уроков
- **FR-002**: Система MUST проверять конфликты по времени при создании/изменении
- **FR-003**: Статус MUST автоматически переходить:
  SCHEDULED → IN_PROGRESS (при startTime) → COMPLETED (при endTime)
- **FR-004**: Система MUST поддерживать статусы: SCHEDULED, IN_PROGRESS,
  COMPLETED, CANCELLED, RESCHEDULED
- **FR-005**: При отмене оплаченного урока оплата MUST переноситься на
  следующий неоплаченный
- **FR-006**: Список уроков MUST поддерживать фильтрацию по: дате, статусу,
  ученику, оплате, домашке
- **FR-007**: Время уроков MUST округляться до минут (truncateToMinute)
- **FR-008**: Предметы: MATHEMATICS, PHYSICS
- **FR-009**: Типы уроков: EGE, OGE, OLYMPICS, SCHOOL
- **FR-010**: Оценка урока: 1-5

### Key Entities

- **Lesson**: startTime, endTime, status, subject, lessonType, description,
  homework, notes, grade (1-5), price, isPaid, paymentDate,
  isHomeworkSentByTeacher, isRecurring, tutorId, studentId

## Success Criteria

### Measurable Outcomes

- **SC-001**: Создание одиночного урока < 30 сек
- **SC-002**: Автоматический переход статусов срабатывает в пределах 1 минуты
- **SC-003**: Конфликты расписания обнаруживаются до сохранения
- **SC-004**: Перенос оплаты при отмене работает атомарно (транзакция)

## Implementation Reference

### Frontend
- `features/lessons/` — models (api, form, tabs, viewMode, filters,
  deleteDialog, actions), UI (LessonForm, LessonsTabs, ViewModeToggle,
  LessonsFilters, LessonsContent, LessonsDialogs)
- `entities/lesson/` — models (api.model, loading.model)
- `pages/lessons/` — LessonsPage, LessonCell, WeeklyView, ScheduleView
- Views: Schedule (calendar) / Weekly / Tabs (upcoming/completed/cancelled)

### Backend
- `routes/lessons.ts` — GET/POST/PUT/DELETE /api/lessons
- `controllers/lessons/` — getLessons, getLesson, createLesson, updateLesson,
  deleteLesson, getLessonCancellationInfo
- Complex query filtering (date range, status, weekly, pagination)
- WebSocket broadcast on status changes
