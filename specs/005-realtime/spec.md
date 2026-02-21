# Feature Specification: Real-Time Updates & Background Jobs

**Feature Branch**: `005-realtime`
**Created**: 2026-02-20
**Status**: Implemented
**Input**: Retroactive spec for WebSocket and cron job systems

## User Scenarios & Testing

### User Story 1 - Real-Time Lesson Status (Priority: P1)

Дашборд репетитора автоматически обновляется при изменении статуса урока
без ручного обновления страницы.

**Why this priority**: Актуальность данных в реальном времени — ключевое
UX-преимущество.

**Independent Test**: Подключиться к ws://host/ws с JWT, дождаться
автоматического перехода урока SCHEDULED → IN_PROGRESS, проверить
получение WebSocket-сообщения.

**Acceptance Scenarios**:

1. **Given** открытый дашборд, **When** урок переходит в IN_PROGRESS,
   **Then** UI обновляется автоматически без перезагрузки
2. **Given** WebSocket подключение, **When** создаётся/обновляется урок,
   **Then** клиент получает сообщение lesson_status_updated
3. **Given** подключение разрывается, **When** восстанавливается,
   **Then** клиент переподключается и получает актуальное состояние

---

### User Story 2 - Automatic Lesson Status Transitions (Priority: P1)

Система каждую минуту автоматически обновляет статусы уроков по времени:
SCHEDULED → IN_PROGRESS при наступлении startTime,
IN_PROGRESS → COMPLETED при наступлении endTime.

**Why this priority**: Без автоматических переходов репетитору пришлось бы
вручную менять статус каждого урока.

**Independent Test**: Создать урок с startTime в прошлом, подождать
cron cycle, проверить что статус изменился.

**Acceptance Scenarios**:

1. **Given** урок SCHEDULED, **When** наступает startTime (cron каждую
   минуту), **Then** статус → IN_PROGRESS, WebSocket уведомление
2. **Given** урок IN_PROGRESS, **When** наступает endTime,
   **Then** статус → COMPLETED, WebSocket уведомление
3. **Given** несколько уроков одновременно требуют перехода,
   **Then** все обновляются за один cron cycle

---

### User Story 3 - Recurring Lesson Generation (Priority: P2)

Система ежедневно в 2:00 автоматически генерирует новые уроки для
повторяющихся серий на 3 месяца вперёд.

**Why this priority**: Автоматизация рутинного планирования расписания.

**Independent Test**: Запустить processRecurringLessons(), проверить что
создались уроки на неделю вперёд без конфликтов.

**Acceptance Scenarios**:

1. **Given** повторяющийся урок (isRecurring=true), **When** запускается
   cron в 2:00, **Then** создаются еженедельные уроки на 3 месяца,
   конфликтные слоты пропускаются
2. **Given** уже существующие уроки в слоте, **When** cron пытается
   создать, **Then** конфликтный слот пропускается без ошибки
3. **Given** разные группы (tutor+student+time), **When** cron
   запускается, **Then** каждая группа обрабатывается независимо

---

### Edge Cases

- WebSocket подключение с невалидным/просроченным JWT
- Одновременные подключения одного пользователя (несколько вкладок)
- Cron overlap — предыдущий cycle не завершился до следующего
- Повторяющийся урок удалён — cron не создаёт новые
- Множество уроков требуют перехода одновременно (batch update)

## Requirements

### Functional Requirements

- **FR-001**: WebSocket MUST аутентифицировать подключения через JWT
  Bearer token (query params или headers)
- **FR-002**: WebSocket MUST отправлять сообщения типа
  `lesson_status_updated` с lessonId и status
- **FR-003**: WebSocket MUST поддерживать адресную отправку конкретному
  пользователю (sendToUser) и broadcast
- **FR-004**: Cron MUST каждую минуту обновлять статусы уроков по времени
- **FR-005**: Cron MUST ежедневно в 2:00 генерировать повторяющиеся уроки
- **FR-006**: Генерация MUST группировать уроки по (tutor, student, time)
  и проверять конфликты
- **FR-007**: Каждое обновление статуса MUST сопровождаться WebSocket
  уведомлением

### Key Entities

- **WebSocket Manager**: подключение клиентов, отправка сообщений,
  tracking подключённых пользователей
- **Cron Jobs**: updateLessonStatuses (*/1 * * * *),
  processRecurringLessons (0 2 * * *)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Автоматический переход статуса срабатывает в пределах 1 минуты
  от наступления времени
- **SC-002**: WebSocket уведомление доставляется в течение секунды после
  изменения статуса
- **SC-003**: Генерация повторяющихся уроков завершается без ошибок и
  конфликтов

## Implementation Reference

### Frontend
- `app/` — WebSocket подключение на уровне приложения
- Effector models подписываются на WS-сообщения для обновления stores

### Backend
- `lib/wsManager.ts` — WebSocketManager class (broadcastLessonStatusUpdate,
  sendToUser, client tracking)
- `src/index.ts` — cron jobs: node-cron schedule для updateLessonStatuses
  и processRecurringLessons
- WebSocket path: `/ws`
