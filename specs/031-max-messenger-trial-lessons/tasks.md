# Tasks: Мессенджер MAX и пробные уроки без ученика

**Input**: Design documents from `/specs/031-max-messenger-trial-lessons/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: включены — CLAUDE.md требует полного тестового покрытия нового кода
(unit для сервисов/моделей/утилит, integration для контроллеров, e2e для
user-facing сценариев).

**Organization**: задачи сгруппированы по user stories; каждая story —
независимо тестируемый инкремент.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 (пробный урок без ученика), US2 (MAX), US3 (привязка к ученику)

## Path Conventions

Web app: `backend/src/`, `backend/prisma/`, `frontend/src/`, `frontend/e2e/`.
Перед кодом читать конвенции: `docs/conventions/backend.md`,
`docs/conventions/frontend.md`, `docs/conventions/*-testing.md`,
`docs/conventions/e2e-testing.md`.

---

## Phase 1: Setup

**Purpose**: подготовка к работе; новых зависимостей нет

- [X] T001 Прочитать `docs/conventions/backend.md` и `docs/conventions/frontend.md`; убедиться, что тест-БД доступна (`cd backend && npm run db:migrate:test`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: схема БД и общие типы, от которых зависят все три stories

**⚠️ CRITICAL**: без этой фазы ни одна story не собирается

- [X] T002 Обновить Prisma-схему в `backend/prisma/schema.prisma`: enum `ContactMethod` + значение `MAX`; `Lesson.studentId String?` + `student Student?` (optional relation, onDelete: Cascade сохранить); новые поля `prospectName String?`, `prospectPhone String?`, `prospectContactMethod ContactMethod?`
- [X] T003 Создать миграцию `max_and_prospect_lessons` (`cd backend && npm run db:migrate`), проверить SQL (ALTER TYPE ADD VALUE 'MAX'; DROP NOT NULL; ADD COLUMN ×3), выполнить `npm run db:generate` и `npm run db:migrate:test`
- [X] T004 [P] Расширить backend-типы: `backend/src/types/student.ts` — union `"WHATSAPP" | "TELEGRAM" | "MAX"` (вынести/переиспользовать общий `ContactMethod`); `backend/src/types/lesson.ts` — `CreateLessonDto.studentId?: string`, `prospectName?/prospectPhone?/prospectContactMethod?`, те же поля в `UpdateLessonDto`
- [X] T005 [P] Расширить frontend-типы: `frontend/src/shared/types/student.ts` — именованный тип `ContactMethod = "WHATSAPP" | "TELEGRAM" | "MAX"`; `frontend/src/shared/types/lesson.ts` — `studentId: string | null`, prospect-поля (`prospectName?/prospectPhone?/prospectContactMethod?`); экспорт через `index.ts`
- [X] T006 [P] Создать маппер лейблов `CONTACT_METHOD_LABELS: Record<ContactMethod, string>` (`WhatsApp`/`Telegram`/`MAX`) в `frontend/src/shared/constants/` с экспортом через `index.ts` + unit-тест на полноту маппера

**Checkpoint**: `cd backend && npm run build` и `cd frontend && npx tsc --noEmit` проходят (компоненты ещё используют старые поля совместимо)

---

## Phase 3: User Story 1 — Пробный урок без создания ученика (Priority: P1) 🎯 MVP

**Goal**: создать урок без карточки ученика — имя + опциональные контакты,
цена 0 по умолчанию, пометка «пробный» в списке/календаре, учёт в статистике
пробных, без падений в напоминаниях/отмене/broadcast.

**Independent Test**: сценарий из quickstart.md «Пробный урок без ученика» —
форма урока → режим без ученика → сохранение → отображение с пометкой →
счётчик пробных в статистике; список учеников не растёт.

### Backend

- [X] T007 [US1] Валидация в `backend/src/controllers/lessons/validators.ts`: инвариант «ровно один из studentId / prospectName» (I1), непустой `prospectName` после trim (I2), prospect-поля только без studentId (I3), запрет `isRecurring` без studentId (I4), `prospectContactMethod` ∈ enum (I7); русские тексты ошибок
- [X] T008 [US1] Ветка создания без ученика в `backend/src/controllers/lessons/createLesson.ts`: пропуск поиска студента при отсутствии `studentId`, `price ?? 0` вместо `student.hourlyRate`, сохранение prospect-полей, ответ со `student: null`
- [X] T009 [P] [US1] Fallback имени в `backend/src/services/reminderProcessor.ts` (строка ~162): `lesson.student?.name ?? lesson.prospectName ?? ""`
- [X] T010 [P] [US1] Ранний выход при `studentId = null` в `backend/src/services/studentLessonBroadcast/studentLessonBroadcast.ts`
- [X] T011 [P] [US1] Guard переноса оплаты: `findNextUnpaidLesson` в `backend/src/controllers/lessons/getCancellationInfo.ts` и логика в `backend/src/controllers/lessons/updateLesson.ts` (строки ~118-130) выполняются только при `studentId != null`
- [X] T012 [P] [US1] Guard `deleteAllFuture` по `studentId` в `backend/src/controllers/lessons/deleteLesson.ts` (строки ~28-44)
- [X] T013 [P] [US1] Фильтр `studentId: { not: null }` в groupBy в `backend/src/controllers/statistics/getStudentStats.ts`
- [X] T014 [US1] Integration-тесты создания в `backend/src/controllers/lessons/__tests__/createLesson.test.ts`: создание с prospectName (201, student null, price 0 без hourlyRate-fallback); 400 без обоих studentId/prospectName; 400 с обоими; 400 пустой prospectName; 400 isRecurring без ученика; 400 невалидный prospectContactMethod
- [X] T015 [P] [US1] Тесты сервисов: reminderProcessor не падает и подставляет prospectName (`backend/src/services/__tests__/`); broadcast не отправляется для урока без ученика; отмена урока без ученика без переноса оплаты и `getCancellationInfo` без nextLesson-полей; getStudentStats без null-группы (`backend/src/controllers/statistics/__tests__/`)

### Frontend

- [X] T016 [US1] Расширить `LessonFormData` в `frontend/src/features/lessons/ui/LessonForm/types.ts`: `withoutStudent: boolean`, `prospectName: string`, `prospectPhone: string`, `prospectContactMethod: ContactMethod | ""`
- [X] T017 [US1] Обновить Effector-модель формы урока в `frontend/src/features/lessons/models/` (lesson-form model/helpers): переключение режима (сброс studentId ↔ prospect-полей, цена → "0" при включении), валидация обязательного имени, маппинг в CreateLessonDto (prospect-поля только в режиме без ученика), запрет isRecurring; только `sample`/`useUnit`, patronum для таймеров при необходимости
- [X] T018 [US1] UI формы: toggle «Пробный урок без ученика» + поля имени/телефона/мессенджера (select из `CONTACT_METHOD_LABELS`) в `frontend/src/features/lessons/ui/LessonForm/components/` (новый компонент ProspectFields + правка LessonFormContent: скрытие StudentSelector и переключателя повторения в режиме без ученика); хелперы — в отдельные файлы, компоненты < 150 строк, без inline-стилей
- [X] T019 [P] [US1] Хелпер отображения `getLessonDisplayName(lesson)` (student?.name ?? prospectName) в `frontend/src/entities/lesson/` или существующем месте хелперов урока + chip «Пробный» при `studentId === null` в `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx` и в календаре/детальном просмотре (все места вывода имени студента урока)
- [X] T020 [US1] Unit-тесты: Effector-модель формы (fork; переключение режима, валидация имени, маппинг DTO) в `frontend/src/features/lessons/models/__tests__/`; `getLessonDisplayName` + рендер LessonCard с prospect-уроком в соответствующих `__tests__/`
- [X] T021 [US1] E2E-тест в `frontend/e2e/lessons/trial-lesson-without-student.spec.ts`: создание пробного урока без ученика → отображение с пометкой → список учеников не изменился (по паттернам `frontend/e2e/helpers/`)

**Checkpoint**: US1 полностью работает; `npm test` (обе стороны), lint, tsc, find-cycle зелёные

---

## Phase 4: User Story 2 — Мессенджер MAX в списке способов связи (Priority: P2)

**Goal**: MAX доступен при создании/редактировании ученика (контакт ученика
и родителя) и корректно отображается во всех местах.

**Independent Test**: сценарий quickstart.md «MAX в мессенджерах» — создать
ученика с MAX (оба контакта), проверить карточку и окно просмотра; ник
запрашивается только для Telegram.

- [X] T022 [P] [US2] Backend: принять MAX в валидаторах `backend/src/controllers/students/validators.ts`, обновить тексты ошибок (строки ~12, 33) с перечислением трёх мессенджеров
- [X] T023 [P] [US2] Frontend: MenuItem «MAX» в оба select'а (ученик + родитель) в `frontend/src/features/students/ui/StudentForm/StudentFormFields/StudentFormFields.tsx` (значения из `CONTACT_METHOD_LABELS`); проверить, что поле «ник» остаётся только для TELEGRAM
- [X] T024 [P] [US2] Frontend: заменить тернарники лейблов на `CONTACT_METHOD_LABELS` в `frontend/src/features/students/ui/StudentViewDialog/StudentContacts.tsx` (строки ~26, 34) и `frontend/src/pages/students/components/StudentCard/StudentCard.tsx` (строки ~56-63)
- [X] T025 [US2] Тесты: integration на создание/обновление студента с MAX (+ 400 на невалидное значение) в `backend/src/controllers/students/__tests__/`; unit на отображение «MAX» в StudentContacts/StudentCard и наличие опции в форме в соответствующих `frontend/src/**/__tests__/`
- [X] T026 [US2] E2E-тест: создание ученика со способом связи MAX (у ученика и родителя) и проверка отображения в `frontend/e2e/students/create-student.spec.ts` (расширить существующий) или отдельным spec

**Checkpoint**: US1 и US2 работают независимо

---

## Phase 5: User Story 3 — Привязка пробного урока к созданному ученику (Priority: P3)

**Goal**: урок без ученика можно привязать к существующему ученику через
редактирование; prospect-данные очищаются, урок попадает в историю ученика.

**Independent Test**: сценарий quickstart.md «Привязка к ученику» — создать
prospect-урок, создать ученика, привязать через форму редактирования,
проверить историю ученика и отсутствие prospect-данных.

- [X] T027 [US3] Backend: привязка в `backend/src/controllers/lessons/updateLesson.ts` — при `studentId` в запросе для урока с `studentId = null`: проверка принадлежности студента репетитору (404), атомарная установка `studentId` + очистка prospect-полей (I5, I6); 400 на отвязку (`studentId: null` для урока со студентом) и на prospect-поля для урока со студентом; правка prospect-полей prospect-урока разрешена
- [X] T028 [US3] Backend integration-тесты привязки в `backend/src/controllers/lessons/__tests__/updateLesson.test.ts`: успешная привязка (prospect-поля = null, student в ответе); 404 чужой студент; 400 отвязка; 400 prospect-поля при студенте; правка prospect-полей prospect-урока
- [X] T029 [US3] Frontend: режим привязки в форме редактирования урока — выключение toggle «без ученика» показывает StudentSelector; сабмит шлёт `studentId` (модель в `frontend/src/features/lessons/models/`, UI в `frontend/src/features/lessons/ui/LessonForm/`); после привязки карточка урока показывает имя ученика без пометки «Пробный»
- [X] T030 [US3] Frontend unit-тесты привязки (Effector fork: toggle off → studentId в DTO, prospect-поля не отправляются) в `frontend/src/features/lessons/models/__tests__/`

**Checkpoint**: все три stories работают независимо

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 Полная проверка качества: `cd backend && npm run build && npm test`; `cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run find-cycle`; при флейке integration-тестов (faker-коллизии) — повторный изолированный прогон
- [X] T032 Пройти `specs/031-max-messenger-trial-lessons/quickstart.md` вручную (или через `/manual-qa`), сверить с acceptance-сценариями спеки
- [ ] T033 Перед PR: `/changelog`, затем `/news`; проверить e2e-покрытие через `/e2e-check`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 → Phase 2**: T002 → T003 → (T004, T005 параллельно); T006 после T005
- **Phase 2 блокирует все stories** (типы и миграция нужны всем)
- **US1 (Phase 3), US2 (Phase 4), US3 (Phase 5)** — независимы друг от друга после Phase 2, НО: US3 переиспользует форму урока из US1 (T029 зависит от T016–T018), поэтому US3 после US1. US2 полностью независима — можно делать параллельно с US1.
- **Phase 6** — после всех выбранных stories

### Внутри US1

- T007 → T008 (валидатор до контроллера); T009–T013 параллельно после T003
- T014–T015 после T007–T013; T016 → T017 → T018; T019 параллельно с T016–T18; T020 после T017–T019; T021 последним

### Parallel Opportunities

- T004 ∥ T005 (+ T006 следом)
- T009, T010, T011, T012, T013 — пять независимых backend-правок параллельно
- Вся US2 (T022–T026) ∥ US1
- T019 ∥ T016–T018

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1**: пробный урок без ученика — основная
ценность. Проверить чекпойнт, при готовности — демо/деплой.

**Инкременты**: затем US2 (маленькая, независимая), затем US3 (замыкает
цикл «пробный → постоянный»), затем Polish. Каждая story не ломает
предыдущие — регрессионные тесты в T014/T015 фиксируют совместимость
существующих уроков со студентом.
