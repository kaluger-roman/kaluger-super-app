# Feature Specification: Student Management

**Feature Branch**: `002-students`
**Created**: 2026-02-20
**Status**: Implemented
**Input**: Retroactive spec for existing student management

## User Scenarios & Testing

### User Story 1 - CRUD Operations (Priority: P1)

Репетитор добавляет, просматривает, редактирует и удаляет учеников.
Каждый ученик привязан к конкретному репетитору.

**Why this priority**: Основа для всей системы — без учеников нет уроков.

**Independent Test**: Создать ученика через POST /api/students, получить
список через GET, обновить через PUT, удалить через DELETE.

**Acceptance Scenarios**:

1. **Given** авторизованный репетитор, **When** создаёт ученика (имя, телефон,
   способ связи), **Then** ученик сохраняется с tutorId текущего пользователя
2. **Given** список учеников, **When** открывает страницу /students,
   **Then** видит карточки активных учеников (имя, класс, способ связи,
   следующий урок), отсортированные по имени
3. **Given** карточка ученика, **When** нажимает на неё, **Then** видит
   детальную информацию и последние уроки
4. **Given** режим редактирования, **When** меняет данные и сохраняет,
   **Then** данные обновляются на сервере
5. **Given** дубликат телефона у того же репетитора, **When** создаёт
   ученика, **Then** ошибка валидации (unique constraint phone+tutorId)

---

### User Story 2 - Archiving (Priority: P2)

Репетитор архивирует ученика с указанием причины вместо удаления.
Архивированные ученики не показываются в основном списке, но доступны
на отдельной вкладке.

**Why this priority**: Сохраняет историю и статистику по завершённым ученикам.

**Independent Test**: Архивировать ученика через PUT /api/students/:id/archive,
проверить что он пропал из активных и появился в архиве.

**Acceptance Scenarios**:

1. **Given** активный ученик, **When** репетитор нажимает "Архивировать",
   **Then** появляется диалог с выбором причины и комментарием
2. **Given** диалог архивации, **When** выбирает причину и подтверждает,
   **Then** ученик переходит в архив, все будущие уроки удаляются
3. **Given** архивированный ученик, **When** нажимает "Разархивировать",
   **Then** ученик возвращается в активные
4. **Given** вкладка "Архив", **When** переключается на неё,
   **Then** видит список архивированных учеников с причинами

---

### User Story 3 - Contact Information (Priority: P2)

Репетитор хранит контактные данные ученика и его родителей: телефон,
Telegram, WhatsApp, данные родителя.

**Why this priority**: Необходимо для связи с учениками/родителями.

**Independent Test**: Создать ученика со всеми контактными полями,
проверить что данные сохраняются и отображаются.

**Acceptance Scenarios**:

1. **Given** форма создания, **When** заполняет контакты ученика
   (телефон, способ связи, telegram nick), **Then** данные сохраняются
2. **Given** форма создания, **When** заполняет данные родителя
   (телефон, имя, telegram, способ связи), **Then** данные сохраняются
3. **Given** карточка ученика, **When** просматривает детали,
   **Then** видит все контактные данные

---

### Edge Cases

- Удаление ученика с привязанными уроками
- Архивация ученика с будущими уроками (транзакционное удаление уроков)
- Попытка создать ученика без обязательных полей (name, contactMethod, phone)
- Уникальность телефона только в рамках одного репетитора (разные репетиторы
  могут иметь ученика с одним телефоном)

## Requirements

### Functional Requirements

- **FR-001**: Система MUST позволять CRUD операции над учениками
- **FR-002**: Ученик MUST быть привязан к конкретному репетитору (tutorId)
- **FR-003**: Обязательные поля: name, contactMethod (WHATSAPP/TELEGRAM), phone
- **FR-004**: Телефон MUST быть уникальным в рамках одного репетитора
- **FR-005**: Архивация MUST удалять все будущие уроки ученика (транзакция)
- **FR-006**: Архивация MUST фиксировать причину (COMPLETED_STUDIES,
  FOUND_ANOTHER_TUTOR, CHANGED_MIND, POOR_EFFORT, MISSED_LESSONS) и комментарий
- **FR-007**: Список учеников MUST быть отсортирован по имени
- **FR-008**: Список MUST поддерживать фильтр archived=true/false
- **FR-009**: Детальный просмотр MUST включать последние 5 уроков

### Key Entities

- **Student**: name, grade (1-11), phone, contactMethod, telegramNick,
  parentPhone, parentName, parentTelegramNick, parentContactMethod,
  hourlyRate, notes, archived, archivedAt, archiveReason, archiveComment
- **Archive Reasons**: COMPLETED_STUDIES, FOUND_ANOTHER_TUTOR, CHANGED_MIND,
  POOR_EFFORT, MISSED_LESSONS

## Success Criteria

### Measurable Outcomes

- **SC-001**: Создание ученика занимает менее 1 минуты
- **SC-002**: Архивация корректно удаляет все будущие уроки за одну транзакцию
- **SC-003**: Список учеников загружается с пагинацией без задержек

## Implementation Reference

### Frontend
- `features/students/` — models (students.model, page.model, archive.model,
  dialogs), UI (StudentForm, StudentCard, StudentsList)
- `entities/student/` — student.model
- `pages/students/` — StudentsPage, StudentViewDialog, ArchiveDialog
- Tabs: Active / Archived

### Backend
- `routes/students.ts` — GET/POST/PUT/DELETE /api/students
- `controllers/students/` — getStudents, getStudent, createStudent,
  updateStudent, deleteStudent, archiveStudent, unarchiveStudent
- Validation: name, contactMethod, phone required; phone+tutorId unique
