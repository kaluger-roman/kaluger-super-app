# Tasks: Учёт комиссий по ученикам

**Input**: Design documents from `/specs/033-commission-tracking/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: ВКЛЮЧЕНЫ и обязательны. `CLAUDE.md` этого репозитория требует:
«All new code must have full test coverage… Do NOT skip tests or defer them
to a later PR. Tests are part of the definition of done». Конституция,
принцип VI — то же самое. У пяти компонентов комиссии, собранных на этапе
макетов, тестов сейчас **нет вовсе**.

**Organization**: задачи сгруппированы по пользовательским историям спеки,
чтобы каждую можно было довести и проверить независимо.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 / US2 / US3 / US4 — только в фазах историй

## Состояние кодовой базы на старте (важно)

UI фичи **уже собран** на этапе макетов и утверждён пользователем.
В финальных местах кода лежат `CommissionBadge`, `CommissionProgress`,
`CommissionField`, `CommissionCards`, `PeriodIndependentStats`; фронтовые
типы контракта объявлены. Поэтому фронтовые задачи ниже — это **не
«написать UI»**, а подключить реальные данные, довязать Effector,
снять 18 маркеров `TODO(auto-feature)`, удалить строительные леса
и закрыть тестами. Серверной части фичи, наоборот, нет ни строки —
колонка, аллокатор, сервис и обогащение трёх ответов пишутся с нуля.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: схема БД и миграция — без них не собирается ни один слой

- [X] T001 Добавить поле `commissionAmount Decimal @default(0) @db.Decimal(10, 2)` в модель `Student` в `backend/prisma/schema.prisma` (рядом с `hourlyRate`, тот же тип и точность)
- [X] T002 Создать и применить миграцию `npm run db:migrate` из `backend/` (имя — `add_student_commission`); убедиться, что сгенерированный `backend/prisma/migrations/*_add_student_commission/migration.sql` содержит `ADD COLUMN "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0` — бэкфилл существующих строк нулём делается этим же DDL, отдельный `UPDATE` не нужен (FR-003, SC-002)
- [X] T003 Прогнать `npm run db:generate` и `npm run db:migrate:test` из `backend/`, проверить в `npm run db:studio`, что у всех ранее заведённых учеников `commissionAmount = 0` (не `NULL`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: чистый аллокатор, сервис комиссий и типы контракта — на них
опирается КАЖДАЯ история

**⚠️ CRITICAL**: ни одна история не начинается, пока эта фаза не закрыта

- [X] T004 Создать чистую утилиту `backend/src/utils/commission.ts`: `allocateCommission({ commissionAmount, lessons })` — два прохода (факт → прогноз) в целых копейках, сортировка по `startTime` + tie-break по `id`, возврат `{ repaid, remaining, creditByLessonId }`; алгоритм пошагово описан в `specs/033-commission-tracking/data-model.md` §3. Без импортов Prisma и без побочных эффектов (конституция, принцип II)
- [X] T005 Экспортировать `allocateCommission` и его типы из `backend/src/utils/index.ts` (если barrel есть) либо импортировать по прямому пути согласно текущей конвенции `backend/src/utils/`
- [X] T006 [P] Написать юнит-тесты аллокатора в `backend/src/utils/__tests__/commission.test.ts`: каждый edge case из таблицы `data-model.md` §3 плюс инварианты INV-1, INV-2, INV-3, INV-4, INV-6, INV-8 — комиссия 0, комиссия больше суммы уроков, бесплатный урок, `CANCELLED`, урок `COMPLETED && !isPaid`, точное совпадение остатка и цены, копейки (остаток меньше рубля), два урока с одинаковым `startTime`, уменьшение комиссии ниже уже зачтённой, два прохода не влияют друг на друга. БД не нужна
- [X] T007 Создать `backend/src/services/commission/commission.types.ts`: входные/выходные формы сервиса (`CommissionLessonInput`, `CommissionCredit`, `StudentCommissionSummary`, `CommissionContext`)
- [X] T008 Создать `backend/src/services/commission/commission.helpers.ts`: батч-загрузка — один `prisma.lesson.findMany({ where: { studentId: { in: ids } }, select: { id, studentId, startTime, price, status, isPaid, paymentDate } })` и группировка по `studentId`; **guard**: при пустом списке учеников с `commissionAmount > 0` возвращать пустой контекст БЕЗ запроса к урокам (research R7, FR-003)
- [X] T009 Создать `backend/src/services/commission/commission.ts`: `buildCommissionContext(tutorId, studentIds?)`, `attachCommissionToLessons(lessons)`, `attachCommissionToStudents(students)`, `collectCommissionStatistics(tutorId, paymentDateRange)` — поверх `allocateCommission` из T004
- [X] T010 Создать `backend/src/services/commission/index.ts` и добавить ре-экспорт сервиса в `backend/src/services/index.ts`
- [X] T011 [P] Добавить `commissionAmount?: number | null` в `CreateStudentDto` в `backend/src/types/student.ts` (`UpdateStudentDto` наследует через `Partial`)
- [X] T012 [P] Добавить зеркальные типы `CommissionCreditState` / `CommissionCredit` в `backend/src/types/lesson.ts` и ре-экспорт из `backend/src/types/index.ts` — форма один в один с `frontend/src/shared/types/lesson.ts`
- [X] T013 [P] Расширить `formatCurrency` в `frontend/src/shared/lib/lib.helpers.ts` необязательным параметром опций с показом копеек; поведение по умолчанию (округление до целых рублей) **не менять** — у функции 29 call-site'ов в 12 файлах, и FR-003 требует, чтобы существующие цифры не изменились (research R9). Добавить юнит-тесты в `frontend/src/shared/lib/__tests__/lib.helpers.test.ts`: целые рубли по умолчанию, копейки по флагу, остаток меньше рубля
- [X] T014 [P] Снять маркеры `TODO(auto-feature)` в `frontend/src/shared/types/lesson.ts`, `frontend/src/shared/types/student.ts`, `frontend/src/shared/types/statistics.ts` — типы контракта финальные (research R8), комментарии-леса больше не нужны

**Checkpoint**: аллокатор покрыт тестами и зелёный, сервис комиссий
подключаем из любого контроллера, типы контракта на обеих сторонах

---

## Phase 3: User Story 1 — Указать сумму комиссии у ученика (Priority: P1) 🎯 MVP

**Goal**: у ученика появляется поле «Комиссия», оно сохраняется,
редактируется, валидируется и видно в карточке; у всех старых учеников
оно равно 0 и ничего не меняется.

**Independent Test**: создать ученика с комиссией 3000 ₽, переоткрыть форму —
значение на месте; открыть старого ученика — комиссия 0 и карточка как
раньше; попытаться сохранить отрицательную комиссию — не сохраняется.

### Tests for User Story 1

- [X] T015 [P] [US1] Интеграционные тесты `POST /api/students` и `PUT /api/students/:id` в `backend/src/controllers/students/__tests__/` : сохранение `commissionAmount: 3000` и чтение обратно; отсутствие поля → `0`; `null` → `0`; отрицательное → `400` с русским сообщением; нечисловое → `400`; **`commissionAmount: 0` сохраняется и НЕ принимается за «поле не прислано»** (защита от truthiness-паттерна, research R13)
- [X] T016 [P] [US1] Интеграционный тест в `backend/src/controllers/students/__tests__/`: у ученика, созданного без комиссии, `GET /api/students` возвращает `commissionAmount: 0` и ни одного `null` (FR-003, SC-002)
- [X] T017 [P] [US1] Интеграционный тест изоляции кабинета ученика в `backend/src/controllers/__tests__/studentCabinet.test.ts`: у ученика с ненулевой комиссией ответы `GET /api/student-cabinet/lessons` и настроек **не содержат ни одного ключа, начинающегося с `commission`**, и вообще ни одной денежной величины (FR-015, INV-7)
- [X] T018 [P] [US1] Юнит-тесты helper'ов формы в `frontend/src/features/students/models/studentForm.helpers.test.ts`: `prepareEmptyFormData` отдаёт `commissionAmount: ""`; `prepareFormDataForEdit` конвертирует число в строку; `prepareCreateData` пустую строку → `undefined`, значение → `parseFloat`; `prepareUpdateData` пустую строку → `0` (колонка `NOT NULL`)
- [X] T019 [P] [US1] Юнит-тесты модели формы в `frontend/src/features/students/models/studentForm.model.test.ts` с `fork`: `fieldChanged({ field: "commissionAmount" })` кладёт значение в `$formData`; `formSubmitted` с отрицательной комиссией **не** вызывает `studentModel.addStudent`/`updateStudent` и показывает ошибку; с пустой комиссией — сохраняет успешно
- [X] T020 [P] [US1] Компонентные тесты `frontend/src/features/students/ui/StudentForm/CommissionField/__tests__/CommissionField.test.tsx`: рендер подсказки, показ `COMMISSION_ERROR_TEXT` при отрицательном значении, отсутствие ошибки при пустом значении и при `0`, вызов `onChange`

### Implementation for User Story 1

- [X] T021 [US1] В `backend/src/controllers/students/validators.ts`: добавить проверку `commissionAmount` в `validateCreateStudentDto` и `validateUpdateStudentDto` явными условиями (`typeof !== "number" || Number.isNaN(...) || < 0`), сообщения на русском — «Комиссия должна быть числом», «Комиссия не может быть отрицательной»; **не повторять** truthiness-паттерн соседнего `hourlyRate` (research R13)
- [X] T022 [US1] В `backend/src/controllers/students/validators.ts` → `prepareUpdateData`: ветка `commissionAmount` с нормализацией `null`/`undefined`/пусто → `0` (колонка `NOT NULL DEFAULT 0`, FR-004)
- [X] T023 [US1] В `backend/src/controllers/students/createStudent.ts` и `updateStudent.ts`: писать `commissionAmount` в Prisma (создание — с дефолтом `0`, если поле не прислано)
- [X] T024 [US1] В `frontend/src/features/students/ui/StudentForm/StudentForm.types.ts`: сделать `commissionAmount: string` обязательным полем `StudentFormData` и снять маркер `TODO(auto-feature)`
- [X] T025 [US1] В `frontend/src/features/students/models/studentForm.helpers.ts`: добавить `commissionAmount` во все четыре helper'а — `prepareEmptyFormData` (`""`), `prepareFormDataForEdit` (`student.commissionAmount?.toString() || ""`), `prepareCreateData` (пусто → `undefined`, иначе `parseFloat`), `prepareUpdateData` (пусто → `0`, иначе `parseFloat`)
- [X] T026 [US1] В `frontend/src/features/students/models/studentForm.model.ts`: добавить `commissionAmount: ""` в начальное значение `$formData` и guard по образцу проверки имени — `sample({ clock: formSubmitted, source: $formData, filter: отрицательная/нечисловая комиссия, fn: () => "Комиссия не может быть отрицательной", target: notificationsModel.showErrorEvent })`, а в `filter` для `validatedSubmit` добавить то же условие, чтобы сохранение **не происходило** (FR-004). Переиспользовать `isCommissionInvalid` из `CommissionField/CommissionField.helpers.ts` вместо дублирования логики
- [X] T027 [US1] Снять маркер `TODO(auto-feature)` в `frontend/src/features/students/ui/StudentForm/StudentFormFields/StudentFormFields.tsx` (поле теперь читается из реального `$formData`) и обновить `StudentFormFields/__tests__/StudentFormFields.test.tsx` под обязательное `commissionAmount` в `StudentFormData`

**Checkpoint**: комиссия задаётся, сохраняется, валидируется на трёх
уровнях, видна в карточке; старые ученики не изменились; кабинет ученика
чист

---

## Phase 4: User Story 2 — Пометка «в счёт комиссии» на уроках (Priority: P2)

**Goal**: у уроков появляется фактическая пометка зачёта и прогнозная
пометка, визуально различимые не только цветом; расчёт идёт по всем
урокам ученика и пересчитывается сам.

**Independent Test**: комиссия 2500 ₽ и три оплаченных урока по 1000 ₽ →
пометки 1000 / 1000 / 500, дальше ничего. Другому ученику комиссия
2500 ₽ без проведённых уроков → у трёх ближайших запланированных
прогнозные пометки ~1000 / ~1000 / ~500, а показатель списаний = 0 ₽.

### Tests for User Story 2

- [X] T028 [P] [US2] Интеграционные тесты `GET /api/lessons` в `backend/src/controllers/lessons/__tests__/`: три оплаченных урока гасят комиссию 1000/1000/500, у четвёртого поля нет; прогноз у `SCHEDULED`/`RESCHEDULED`/`IN_PROGRESS` и у `COMPLETED && !isPaid`; `CANCELLED` и бесплатный урок без пометки; урок без `studentId` (пробный) без пометки; у ученика с комиссией 0 поле отсутствует у всех уроков
- [X] T029 [P] [US2] Интеграционный тест стабильности пагинации в `backend/src/controllers/lessons/__tests__/`: пометки на второй странице выдачи совпадают с пометками при `noPagination=true` — расчёт идёт по всем урокам ученика, а не по странице
- [X] T030 [P] [US2] Компонентные тесты `frontend/src/shared/ui/CommissionBadge/__tests__/CommissionBadge.test.tsx`: `null`/`amount <= 0` → ничего не рендерится (FR-008); `FACT` → `(1 000 ₽)`, заполненный значок, свой `aria-label`; `FORECAST` → `(~1 000 ₽)`, контурный значок, отличие читается без цвета; `variant="full"` → развёрнутый текст
- [X] T031 [P] [US2] Обновить `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/__tests__/LessonCard.test.tsx`: урок с `FACT`-пометкой, с `FORECAST`-пометкой, без пометки (в DOM нет ни значка, ни пустого блока)
- [X] T032 [P] [US2] Обновить `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.test.tsx` (тест лежит рядом с компонентом, не в `__tests__/`): та же пометка в окне просмотра урока, `variant="full"` (FR-009)

### Implementation for User Story 2

- [X] T033 [US2] В `backend/src/services/lessonsQuery/lessonsQuery.ts` (`fetchLessonsPage`): прогнать выбранные уроки через `attachCommissionToLessons` и навешивать `commissionCredit` — это первый маппер поверх сырых строк Prisma в этом сервисе; при отсутствии учеников с комиссией маппер не выполняется и поле не добавляется (research R6, R7)
- [X] T034 [US2] Убедиться, что `commissionCredit` отсутствует/`null` там, где зачёта нет, и что в ответе НЕТ объекта с `amount: 0` (contracts/README.md §2) — иначе UI нарисует пустой блок
- [X] T035 [P] [US2] Снять маркер `TODO(auto-feature)` в `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx`
- [X] T036 [P] [US2] Снять маркер `TODO(auto-feature)` в `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.tsx`
- [X] T037 [US2] Перевести `CommissionBadge` на `formatCurrency` с копейками (T013), чтобы остаток меньше рубля отображался корректно (edge case спеки); файл `frontend/src/shared/ui/CommissionBadge/CommissionBadge.helpers.ts`
- [X] T038 [US2] Обеспечить актуальность пометок без перезагрузки (FR-013, FR-021, SC-006): сегодня `frontend/src/entities/lesson/models/stores.model.ts` на `updateLessonFx.doneData` патчит **только изменённый** урок, а отметка оплаты сдвигает прогноз у соседних уроков того же ученика. Добавить в `frontend/src/features/lessons/models/lessonsReload.model.ts` перезагрузку активного списка после `addLessonFx`/`updateLessonFx`/`removeLessonFx`, **только когда у репетитора есть ученики с ненулевой комиссией** — иначе поведение приложения не меняется ни на один запрос (research R10, FR-003). Покрыть тестом модели с `fork`

**Checkpoint**: пометки факта и прогноза корректны во всех представлениях
урока, пересчитываются сами, на мобильной ширине не ломают вёрстку

---

## Phase 5: User Story 3 — Списания в счёт комиссий в статистике (Priority: P3)

**Goal**: на странице статистики появляется показатель списаний за период
(по дате оплаты), «Заработок» и налог не меняются, а снимки выносятся
в отдельную период-независимую группу вместе с «Предоплатой».

**Independent Test**: отметить оплаченными первые уроки двух учеников
с комиссиями → новый показатель равен сумме зачтённых долей, «Заработок»
и налог совпадают со значениями до фичи; смена периода пересчитывает
показатель.

### Tests for User Story 3

- [X] T039 [P] [US3] Интеграционные тесты `GET /api/statistics` в `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`: `commissionWrittenOffSum` за период; `hasCommissionStudents` `true`/`false`; при отсутствии комиссий оба числовых поля `0`; смена периода пересчитывает показатель (FR-012)
- [X] T040 [P] [US3] Интеграционный тест «март/апрель» в `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`: урок проведён в марте, оплата отмечена в апреле → `earnings` учитывает его в марте, а `commissionWrittenOffSum` — в апреле (FR-010, US3 сценарий 7). Прогнать под разными `TZ`, чтобы не повторить известный баг с полуночью `paymentDate`
- [X] T041 [P] [US3] Интеграционный тест неизменности в `backend/src/controllers/statistics/__tests__/getStatistics.test.ts` (INV-5, SC-004): при одинаковых данных `earnings`, `taxAmount`, `taxBreakdown`, `prepaidIncome`, `paymentsInRangeSum` совпадают до и после задания комиссий — отклонение 0 ₽
- [X] T042 [P] [US3] Интеграционный тест «прогноз не влияет на деньги» (INV-4, SC-009): у ученика только предстоящие уроки с прогнозными пометками → `commissionWrittenOffSum === 0`
- [X] T043 [P] [US3] Компонентные тесты `frontend/src/pages/ReportsPage/components/FinancialStatistics/CommissionCards/__tests__/CommissionCards.test.tsx`: `hasCommissionStudents: false` → ничего не рендерится (FR-017); `true` → карточка со значением и подписью «За период, по дате оплаты»; `commissionWrittenOffSum: 0` → карточка со значением 0 ₽ (US3 сценарий 6)
- [X] T044 [P] [US3] Компонентные тесты `frontend/src/pages/ReportsPage/components/FinancialStatistics/PeriodIndependentStats/__tests__/PeriodIndependentStats.test.tsx`: группа с подписью «Не зависит от выбранного периода» присутствует **всегда**, даже без комиссий; «Предоплата» внутри неё и её значение равно `statistics.prepaidIncome` (FR-027)

### Implementation for User Story 3

- [X] T045 [US3] Расширить `LessonStatistics` в `backend/src/services/statistics/statistics.types.ts` полями `hasCommissionStudents: boolean` и `commissionWrittenOffSum: number`
- [X] T046 [US3] В `backend/src/services/statistics/statistics.helpers.ts` + `statistics.ts`: считать списания за период через `collectCommissionStatistics`, относя фактический зачёт к периоду по `paymentDate ?? startTime` — **той же базе дат**, что у `paidInRangeWhere` и `computeTaxSummary`, чтобы показатель никогда не расходился с «Поступлениями за период» (FR-010, research R5). `earnings`, `lastMonthEarnings`, налог и остальные агрегаты **не трогать** (FR-011)
- [X] T047 [US3] Проверить и подчистить `frontend/src/pages/ReportsPage/components/FinancialStatistics/IncomeCards/IncomeCards.tsx` и `IncomeCards.styled.ts` после переноса «Предоплаты» в `PeriodIndependentStats`: удалить осиротевшие импорты (`AttachMoney`) и неиспользуемые styled-компоненты (`BlueCard`), обновить `IncomeCards/__tests__/IncomeCards.test.tsx`. Числовое значение и оформление «Предоплаты» измениться не должны — меняется только её место на странице (FR-027)

**Checkpoint**: показатель списаний считается по дате оплаты и
пересчитывается по фильтру; «Заработок» и налог доказуемо не изменились;
группа снимков на странице есть всегда

---

## Phase 6: User Story 4 — Прогресс погашения комиссии (Priority: P4)

**Goal**: в карточке ученика виден прогресс (комиссия / погашено /
осталось), а в период-независимой группе статистики — общий остаток
к погашению по всем активным ученикам.

**Independent Test**: комиссия 3000 ₽ и оплаченные уроки на 1200 ₽ →
в карточке 3000 / 1200 / 1800; в статистике общий остаток включает эти
1800 ₽ и не меняется при смене периода.

### Tests for User Story 4

- [X] T048 [P] [US4] Интеграционные тесты `GET /api/students` и `GET /api/students/:id` в `backend/src/controllers/students/__tests__/`: `commissionRepaid` / `commissionRemaining` считаются только по фактическим зачётам; `repaid + remaining === commissionAmount` точно (INV-1, SC-010); `remaining` не отрицателен даже после уменьшения комиссии ниже уже зачтённой; у ученика с комиссией 0 обе величины `0`
- [X] T049 [P] [US4] Интеграционный тест «ответы мутаций тоже обогащены»: `POST /api/students` и `PUT /api/students/:id` возвращают `commissionRepaid`/`commissionRemaining` — иначе фронт запатчит стор ответом без них и потеряет прогресс сразу после сохранения (contracts/README.md §1)
- [X] T050 [P] [US4] Интеграционные тесты `commissionRemainingTotal` в `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`: сумма остатков по **неархивированным** ученикам; архивный ученик с непогашенным остатком в показатель не входит (FR-025), но его прошлые списания в `commissionWrittenOffSum` остаются; показатель **не меняется** при смене периода в фильтре (FR-024, US4 сценарий 6); при всех погашенных комиссиях — `0`
- [X] T051 [P] [US4] Компонентные тесты `frontend/src/shared/ui/CommissionProgress/__tests__/CommissionProgress.test.tsx`: `amount` пустой/0 → ничего; частичное погашение → три строки с корректными суммами; полное погашение → тихая строка «Комиссия N ₽ — выплачена» без акцентного блока; `variant="compact"` и `variant="full"`; юнит-тесты `getCommissionRemaining`, `getCommissionPercent`, `isCommissionClosed` (включая `repaid > amount` → остаток 0, не отрицательный)
- [X] T052 [P] [US4] Дополнить `PeriodIndependentStats/__tests__/PeriodIndependentStats.test.tsx`: карточка «Осталось погасить комиссий» появляется только при `hasCommissionStudents: true`, значение из `commissionRemainingTotal`, подпись говорит про текущий момент, а не про период
- [X] T053 [P] [US4] Компонентные тесты карточки и окна ученика в `frontend/src/pages/students/components/StudentCard/StudentCard.test.tsx` и `frontend/src/features/students/ui/StudentViewDialog/StudentInfo.test.tsx` (оба теста лежат рядом с компонентами, не в `__tests__/`) — акцентный блок только при ненулевом остатке, тихая строка «Комиссия N ₽ — выплачена» при полном погашении, у комиссии 0 карточка выглядит как раньше (FR-018, FR-022)

### Implementation for User Story 4

- [X] T054 [US4] В `backend/src/controllers/students/getStudents.ts` (обе функции — `getStudents` и `getStudent`), `createStudent.ts`, `updateStudent.ts`: обогащать ответ через `attachCommissionToStudents` полями `commissionRepaid` / `commissionRemaining`. Логика остаётся в сервисе, контроллер только вызывает (конституция, принцип II)
- [X] T055 [US4] Добавить `commissionRemainingTotal: number` в `LessonStatistics` (`backend/src/services/statistics/statistics.types.ts`) и считать его в `backend/src/services/statistics/statistics.ts` как сумму остатков по неархивированным ученикам с ненулевой комиссией — **вне** зависимости от `paymentDateRange` (FR-024, FR-025)
- [X] T056 [P] [US4] Снять маркер `TODO(auto-feature)` в `frontend/src/features/students/ui/StudentViewDialog/StudentInfo.tsx` (данные пришли с бэкенда)
- [X] T057 [P] [US4] Снять маркер `TODO(auto-feature)` в `frontend/src/pages/students/components/StudentCard/StudentCard.tsx`
- [X] T058 [US4] Перевести `CommissionProgress` на `formatCurrency` с копейками (T013) в `frontend/src/shared/ui/CommissionProgress/CommissionProgress.helpers.ts` — остаток меньше рубля должен отображаться дробным
- [X] T059 [US4] Обеспечить обновление прогресса и общего остатка в рамках сеанса после отметки урока оплаченным (FR-013, US4 сценарий 7): после мутации урока перезагружать список учеников при наличии учеников с комиссией — та же схема и тот же guard, что в T038; страница статистики уже перезагружается по `ReportsPageGate.open` / `statisticsLoadRequested` и правки не требует

**Checkpoint**: все четыре истории работают независимо; «погашено +
осталось» точно равно комиссии; общий остаток не реагирует на фильтр дат

---

## Phase 7: Cleanup, E2E & Polish

**Purpose**: снос строительных лесов этапа макетов, сквозные проверки
и финальные гейты качества

### Обязательный снос макетного кода

- [X] T060 Удалить целиком папку `frontend/src/pages/CommissionMockupPage/` (13 файлов: `CommissionMockupPage.tsx`, `.constants.ts`, `.styled.ts`, `index.ts`, `components/index.ts` и четыре подпапки `MockLessonCards` / `MockStatistics` / `MockStudentCards` / `MockStudentForm`)
- [X] T061 Убрать экспорт `CommissionMockupPage` и маркер `TODO(auto-feature)` из `frontend/src/pages/index.ts`
- [X] T062 Убрать lazy-импорт макетной страницы и маркер `TODO(auto-feature)` из `frontend/src/app/components/AppRoutes/AppRoutes.constants.ts`
- [X] T063 Убрать `<Route path="/mockups/commission/:section" …>`, соответствующий импорт и маркер `TODO(auto-feature)` из `frontend/src/app/components/AppRoutes/AppRoutes.tsx`
- [X] T064 Убрать временный ре-экспорт `export { LessonCard } from "./LessonsList";` и маркер `TODO(auto-feature)` из `frontend/src/features/lessons/ui/index.ts` — он существовал только ради страницы макетов и расширял публичный API слоя вопреки FSD (research R12); проверить, не осиротел ли ре-экспорт `LessonCard` в `LessonsList/index.ts`
- [X] T065 Проверить, что `grep -rn "TODO(auto-feature)" frontend/src backend/src` не находит **ничего** и что `grep -rn "CommissionMockupPage\|mockups/commission" frontend/src` пуст (все 18 маркеров сняты задачами T014, T024, T027, T035, T036, T056, T057, T061–T064)

### E2E

- [X] T066 [P] E2E `frontend/e2e/students/student-commission.spec.ts`: создать ученика с комиссией, переоткрыть форму и увидеть значение, попытаться сохранить отрицательную комиссию и убедиться, что сохранения не произошло, увидеть блок прогресса в карточке (US1, US4)
- [X] T067 [P] E2E `frontend/e2e/lessons/lesson-commission-credit.spec.ts`: ученик с комиссией, отметка уроков оплаченными, появление фактических пометок и сдвиг прогнозных без перезагрузки страницы (US2, SC-006)
- [X] T068 [P] E2E `frontend/e2e/reports/commission-statistics.spec.ts`: показатель «Списано в счёт комиссий» за период, неизменность «Заработка», группа «Не зависит от выбранного периода» с «Предоплатой» и общим остатком, неизменность остатка при смене периода (US3, US4)

### Финальные гейты

- [ ] T069 Проверить мобильную ширину 375px для пометки на карточке урока, блока прогресса в карточке ученика и группы снимков в статистике — вёрстка не ломается, текст читаем (FR-009, edge case спеки). Сверить с `docs/mockups/033-commission-tracking/screenshots/`
- [X] T070 Прогнать `npm run lint`, `npm run build`, `npm test` в `backend/` (бэкендные bcrypt-тяжёлые сьюты при параллельном vitest — с `--runInBand`)
- [X] T071 Прогнать `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run find-cycle` в `frontend/`
- [X] T072 Перечитать `docs/conventions/backend.md` и `docs/conventions/frontend.md` и вручную сверить весь новый/изменённый код: named exports, function expressions, `type` вместо `interface`, `import type`, без `any`, `index.ts` в каждой папке, без deep-импортов, без inline-стилей, компоненты < 150 строк, модели < 200, контроллеры < 150, тексты на русском
- [ ] T073 Пройти `specs/033-commission-tracking/quickstart.md` §4 целиком вручную — все четыре истории плюс проверка изоляции кабинета ученика

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1, T001–T003)**: стартует сразу; блокирует всё остальное (без колонки не соберётся Prisma-клиент)
- **Foundational (Phase 2, T004–T014)**: зависит от Setup; **БЛОКИРУЕТ все истории**
- **US1 (Phase 3)**: после Foundational. Ни от одной другой истории не зависит
- **US2 (Phase 4)**: после Foundational. Технически независима, но осмысленно проверяется, когда комиссию уже можно задать (US1)
- **US3 (Phase 5)**: после Foundational. Опирается на тот же сервис комиссий, что US2, но на другой потребитель
- **US4 (Phase 6)**: после Foundational. Дополняет ответы учеников и статистики; T055 живёт в том же файле, что T046 (US3) — выполнять последовательно
- **Cleanup & Polish (Phase 7)**: после всех историй, которые планируется сдавать. **T060–T065 обязательны в любом случае** — макетная страница не должна уехать в продакшен

### Файловые пересечения (нельзя параллелить)

- T045 и T055 — оба правят `backend/src/services/statistics/statistics.types.ts`
- T046 и T055 — оба правят `backend/src/services/statistics/statistics.ts`
- T021 и T022 — оба правят `backend/src/controllers/students/validators.ts`
- T043/T044 и T052 — `PeriodIndependentStats` тесты, выполнять последовательно
- T038 и T059 — общая схема перезагрузки после мутаций; T059 переиспользует введённое в T038
- T013 → T037 и T013 → T058 (копейки в форматтере нужны обоим потребителям)

### Внутри истории

- Тесты пишутся до реализации, падают, затем закрываются реализацией
- Бэкенд перед фронтом: пока эндпоинт не отдаёт поле, компонент нечем кормить
- Снятие `TODO(auto-feature)` — последним шагом соответствующей задачи, как маркер её завершённости

### Parallel Opportunities

- Phase 2: T006, T011, T012, T013, T014 — разные файлы, идут параллельно
- Phase 3: все тесты T015–T020 параллельны между собой
- Phase 4: T028–T032 параллельны; T035 и T036 параллельны
- Phase 5: T039–T044 параллельны
- Phase 6: T048–T053 параллельны; T056 и T057 параллельны
- Phase 7: E2E T066–T068 параллельны
- Истории US2, US3, US4 после закрытия Foundational могут вестись параллельно разными исполнителями — пересечения перечислены выше

---

## Implementation Strategy

### MVP (минимальная сдаваемая единица)

Phase 1 + Phase 2 + Phase 3 (US1). Даёт поле «Комиссия» с валидацией
и сохранением — фундамент, без которого у остальных историй нет источника
данных. Проверяется независимо по Independent Test истории 1.

### Инкременты

1. **MVP**: US1 — комиссия задаётся и хранится
2. **+US2**: пометки на уроках — то, ради чего фича затевалась
3. **+US3**: цифра списаний за период в статистике
4. **+US4**: прогресс погашения и общий остаток
5. **Phase 7**: снос макетной страницы, e2e и гейты — **обязательно**,
   какой бы набор историй ни сдавался

### Чего делать НЕ нужно (вне рамок спеки)

- Журнала выплат комиссии и ручной отметки «комиссия выплачена» — нет
- Разбивки статистики по ученикам, отчёта по посредникам, показателя
  «чистого дохода за вычетом комиссий», истории изменений суммы — нет
- Пометки о комиссии в компактной ячейке недельной сетки расписания — нет
- Изменения формулы «Заработка» и налога — категорически нет (FR-011)
