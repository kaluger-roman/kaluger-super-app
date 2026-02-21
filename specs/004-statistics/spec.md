# Feature Specification: Statistics & Reporting

**Feature Branch**: `004-statistics`
**Created**: 2026-02-20
**Status**: Implemented
**Input**: Retroactive spec for existing statistics dashboard

## User Scenarios & Testing

### User Story 1 - Main Statistics Dashboard (Priority: P1)

Репетитор видит сводную статистику по урокам и финансам за выбранный
период: количество уроков, заработок, долги, предстоящий доход.

**Why this priority**: Ключевая бизнес-информация для репетитора.

**Independent Test**: GET /api/statistics с датами, проверить все метрики.

**Acceptance Scenarios**:

1. **Given** страница /reports, **When** открывает, **Then** видит
   статистику за текущий месяц по умолчанию
2. **Given** дашборд, **When** меняет диапазон дат, **Then** все метрики
   пересчитываются за новый период
3. **Given** есть уроки, **When** просматривает, **Then** видит:
   - Завершённые / отменённые / всего / предстоящие уроки
   - Заработок (оплаченные), заработок за прошлый месяц, упущенный доход
   - Предоплаченный доход, предстоящий доход
   - Неоплаченные долги (кол-во, сумма, просроченные >24ч)
   - Пробные уроки

---

### User Story 2 - Breakdown by Subject & Type (Priority: P2)

Репетитор видит распределение уроков по предметам (Математика/Физика)
и типам (ЕГЭ/ОГЭ/Олимпиады/Школа).

**Why this priority**: Помогает анализировать структуру занятий.

**Independent Test**: GET /api/statistics/by-subject и GET /api/statistics/by-type.

**Acceptance Scenarios**:

1. **Given** дашборд, **When** смотрит разбивку по предметам,
   **Then** видит количество уроков MATHEMATICS vs PHYSICS
2. **Given** дашборд, **When** смотрит разбивку по типам,
   **Then** видит количество EGE / OGE / OLYMPICS / SCHOOL

---

### User Story 3 - Per-Student Statistics (Priority: P3)

Репетитор видит статистику по каждому ученику отдельно.

**Why this priority**: Детализация для оценки работы с конкретным учеником.

**Independent Test**: GET /api/statistics/by-student.

**Acceptance Scenarios**:

1. **Given** дашборд, **When** смотрит статистику по ученикам,
   **Then** видит метрики по каждому ученику

---

### Edge Cases

- Период без уроков — все метрики = 0
- Ученик без уроков в выбранном периоде
- Отменённый оплаченный урок — учитывается в "упущенном доходе"
- Долги просроченные >24ч выделяются отдельно

## Requirements

### Functional Requirements

- **FR-001**: Система MUST агрегировать статистику за произвольный
  диапазон дат
- **FR-002**: Основные метрики MUST включать: completedLessons,
  cancelledLessons, totalLessons, upcomingLessons, trialLessonsCount
- **FR-003**: Финансовые метрики MUST включать: earnings, lastMonthEarnings,
  lostEarnings, prepaidIncome, upcomingIncome
- **FR-004**: Долговые метрики MUST включать: unpaidDebtCount, unpaidDebtSum,
  unpaidDebtOver24hCount, unpaidDebtOver24hSum
- **FR-005**: Система MUST поддерживать разбивку по предмету и типу урока
- **FR-006**: Система MUST поддерживать статистику по ученикам
- **FR-007**: Даты MUST обрабатываться в UTC day bounds

### Key Entities

- Агрегация по **Lesson** (status, subject, lessonType, isPaid, price,
  studentId) за выбранный период

## Success Criteria

### Measurable Outcomes

- **SC-001**: Дашборд загружается менее чем за 2 секунды
- **SC-002**: Все метрики корректно пересчитываются при смене дат
- **SC-003**: Финансовые данные точно отражают оплаченные/неоплаченные суммы

## Implementation Reference

### Frontend
- `pages/ReportsPage/` — DateRangeFilter, MainStatistics,
  FinancialStatistics, PerformanceMetrics
- Effector model: statisticsModel ($statistics, $startDate, $endDate)

### Backend
- `routes/statistics.ts` — GET /api/statistics, /by-subject, /by-type,
  /by-student
- `controllers/statistics/` — getStatistics, getLessonsBySubject,
  getLessonsByType, getStudentStatistics
- Complex Prisma aggregation queries with date filtering
