# Tasks: Уроки без налога

**Input**: Design documents from `/specs/034-tax-exempt-lessons/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: ВКЛЮЧЕНЫ и обязательны. `CLAUDE.md`: «All new code must have
full test coverage… Bug fixes: always add a regression test… Do NOT skip
tests or defer them to a later PR». Конституция, принцип VI, — то же.
Тестов требует и код, добавленный на этапе макетов (`TaxExemptBadge`,
`TaxExemptStatus`, `useTooltipTrigger`, `useIsTaxEnabled`, строка
тултипа): сейчас у него тестов нет.

**Organization**: задачи сгруппированы по пользовательским историям спеки.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 / US2 / US3, только в фазах историй

## Состояние кодовой базы на старте (важно)

UI фичи собран на этапе макетов и утверждён. В финальных местах лежат
`shared/ui/TaxExemptBadge`, `features/lessons/ui/TaxExemptStatus`,
`features/lessons/ui/LessonForm/components/TaxExemptCheckbox`, строка
в `TaxRateInfoTooltip`, `useIsTaxEnabled`, `useTooltipTrigger`.
Признак замокан хелпером `isLessonTaxExempt` (ищет «благотвор»
в заметках), сумма в статистике захардкожена `MOCK_TAX_EXEMPT_INCOME`.
В коде 10 маркеров `TODO(auto-feature)` в 8 файлах. Серверной части нет
ни строки, фронтовых типов `isTaxExempt` / `taxExemptIncome` тоже нет.

**Правка пользователя после макетов**: в форме урока чекбокс
«Не облагается налогом» заменяется на переключатель (Switch), оформленный
как «Оплачено» / «ДЗ» в той же форме (research R14).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: колонка в БД. Без неё не собирается Prisma-клиент и ни один слой

- [X] T001 Добавить `isTaxExempt Boolean @default(false)` в модель `Lesson` в `backend/prisma/schema.prisma` рядом с `isPaid` / `paymentDate` (комментарий `// Не облагается налогом`), см. `specs/034-tax-exempt-lessons/data-model.md` §1
- [X] T002 Из `backend/` выполнить `npm run db:migrate` с именем `add_lesson_tax_exempt`; убедиться, что `backend/prisma/migrations/*_add_lesson_tax_exempt/migration.sql` содержит ровно `ALTER TABLE "lessons" ADD COLUMN "isTaxExempt" BOOLEAN NOT NULL DEFAULT false;` (бэкфилл этим же DDL, отдельный `UPDATE` не нужен; FR-001, SC-001)
- [X] T003 Из `backend/` выполнить `npm run db:generate` и `npm run db:migrate:test`; проверить, что `SELECT COUNT(*) FROM lessons WHERE "isTaxExempt" IS DISTINCT FROM false` возвращает `0`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: типы контракта на обеих сторонах, сидирование e2e и тесты
на хуки из макетов, на которые опираются все три истории

**⚠️ CRITICAL**: ни одна история не начинается, пока эта фаза не закрыта

- [X] T004 [P] Добавить `isTaxExempt?: boolean` в `CreateLessonDto` в `backend/src/types/lesson.ts` (`UpdateLessonDto` получает поле через `Partial<CreateLessonDto>`)
- [X] T005 [P] Добавить `isTaxExempt?: boolean` в `Lesson` и в `CreateLessonDto` в `frontend/src/shared/types/lesson.ts` (`UpdateLessonDto` наследует)
- [X] T006 [P] Добавить `taxExemptIncome: number | null` в `Statistics` в `frontend/src/shared/types/statistics.ts` рядом с `taxAmount`; дописать поле во все тестовые фикстуры `Statistics`, которые после этого перестанут компилироваться (найти через `npx tsc --noEmit` в `frontend/`; в первую очередь `frontend/src/pages/ReportsPage/components/FinancialStatistics/__tests__/FinancialStatistics.test.tsx`)
- [X] T007 [P] В `backend/src/routes/testSupport.ts` в `POST /lessons` принимать `isTaxExempt: Boolean(data.isTaxExempt)`; в `frontend/e2e/helpers/db.ts` добавить `isTaxExempt?: boolean` в `LessonSeed` (contracts/README.md §3)
- [X] T008 [P] Тесты хука `useIsTaxEnabled` в `frontend/src/entities/user/__tests__/user.hooks.test.ts` (с `fork` и Provider): `$user = null` → `false`; `taxEnabled: false` → `false`; `taxEnabled: true` → `true`; смена `$user` перерисовывает значение
- [X] T009 [P] Тесты хука `useTooltipTrigger` в `frontend/src/shared/lib/__tests__/tooltipTrigger.hooks.test.ts`: `pointerenter`/`pointerleave` с `pointerType: "mouse"` открывают/закрывают; с `pointerType: "touch"` состояние не меняют; `handleClick` открывает и вызывает `stopPropagation`; `open`/`close`

**Checkpoint**: Prisma-клиент знает `isTaxExempt`, типы контракта
объявлены, `npx tsc --noEmit` в обоих пакетах зелёный

---

## Phase 3: User Story 1 — Отметить отдельный урок как не облагаемый налогом (Priority: P1) 🎯 MVP

**Goal**: признак хранится, переключается в попапе (сразу, без
подтверждения), задаётся в форме создания/редактирования переключателем,
ставится всей создаваемой серии и наследуется ночным продлением,
меняет только свой урок, не меняет статус, скрыт при выключенном учёте
налога и не виден ученику.

**Independent Test**: включить учёт налога; открыть попап старого урока,
переключатель выключен; включить, переоткрыть: включён; создать урок
с включённым переключателем в форме: признак стоит; выключить учёт
налога: переключателя нет ни в попапе, ни в форме; включить: признаки
на месте (quickstart.md §4 US1).

### Tests for User Story 1 — backend

- [X] T010 [P] [US1] Юнит-тесты валидаторов в `backend/src/controllers/lessons/__tests__/validators.test.ts`: `validateLessonData` и `validateUpdateData` пропускают `isTaxExempt: true`, `false` и отсутствие поля; отклоняют `null`, `"true"`, `1`, `{}` с текстом «Некорректное значение признака «Не облагается налогом»»
- [X] T011 [P] [US1] Регрессионный юнит-тест в `backend/src/services/__tests__/lessonUpdate.helpers.test.ts`: `computeUpdatedStatus({}, makeLesson({ status: "CANCELLED" }), past.start, past.end, now)` → `"CANCELLED"` (сейчас возвращает `"COMPLETED"`, research R5); то же для `running`; явный `status: "SCHEDULED"` у прошедшего отменённого урока по-прежнему даёт `"COMPLETED"` (восстановление не сломано); в `makeLesson` добавить `isTaxExempt: false`
- [X] T012 [P] [US1] Интеграционные тесты создания в новом `backend/src/controllers/lessons/__tests__/lessonTaxExempt.test.ts` (`POST /api/lessons`): одиночный урок с `isTaxExempt: true` → в ответе и в БД `true`; без поля → `false`; пробный урок без ученика (`prospectName`) с признаком → `true` (FR-004); регулярное занятие с `isTaxExempt: true` → у **каждого** урока серии `true` (FR-006); с `false` → у всех `false`; невалидное значение → `400` с русским сообщением и ни одного созданного урока
- [X] T013 [P] [US1] Интеграционные тесты обновления в том же `backend/src/controllers/lessons/__tests__/lessonTaxExempt.test.ts` (`PUT /api/lessons/:id`): `{ isTaxExempt: true }` → `200`, признак `true`, `price`/`status`/`isPaid`/`paymentDate` не изменились; обратно `false`; чужой урок → `404 «Урок не найден»`; невалидное значение → `400`; **прошедший отменённый урок** + `{ isTaxExempt: true }` → статус остаётся `CANCELLED` (регрессия R5); урок серии → у остальных уроков серии признак не изменился (FR-008); у урока серии `SCHEDULED` одним телом `{ price: 1500, isTaxExempt: true }` → цена ушла в будущие уроки серии, признак только у этого (FR-008); привязка ученика к пробному уроку с признаком → признак сохранился
- [X] T014 [P] [US1] Интеграционный тест переноса оплаты в `backend/src/controllers/lessons/__tests__/lessonTaxExempt.test.ts`: отмена оплаченного урока с `isTaxExempt: true` при следующем неоплаченном уроке ученика с `isTaxExempt: false` → оплата переехала (`isPaid`, `paymentDate`), признаки обоих уроков не изменились (Clarifications спеки, research R7)
- [X] T015 [P] [US1] Тест наследования cron в `backend/src/services/__tests__/recurringLessons.test.ts`: последний урок паттерна `isTaxExempt: true` → все уроки, созданные `processRecurringLessons`, `true`; последний `false` при более ранних `true` → новые `false` (наследование именно от последнего урока, как цена; FR-007)
- [X] T016 [P] [US1] Тесты изоляции кабинета ученика: в `backend/src/controllers/__tests__/studentCabinet.test.ts` у помеченного урока ответ `GET /api/student-cabinet/lessons` не содержит ключа `isTaxExempt` ни у одного урока; в `backend/src/controllers/lessons/__tests__/lessonTaxExempt.test.ts` при `PUT { isTaxExempt: true }` событие `lesson_updated`, ушедшее в `broadcastStudentLessonEvent` (шпион на `getWebSocketManager`, как в `updateLesson.test.ts`), не содержит `isTaxExempt` (FR-022, SC-007, research R11)

### Tests for User Story 1 — frontend

- [X] T017 [P] [US1] Тест модели в `frontend/src/features/lessons/models/__tests__/lessonActions.model.test.ts` (с `fork`): `lessonTaxExemptChanged({ lessonId, isTaxExempt: true })` вызывает `lessonModel.updateLessonFx` с `{ id: lessonId, data: { isTaxExempt: true } }` и не открывает никакого диалога подтверждения; то же для `false`
- [X] T018 [P] [US1] Тест в `frontend/src/features/lessons/models/__tests__/lessonsViewDialog.model.test.ts`: после `updateLessonFx.doneData` с `isTaxExempt: true` у открытого урока `$viewingLesson.isTaxExempt === true`; при `updateLessonFx.fail` `$viewingLesson` не меняется (переключатель остаётся в прежнем положении, US1 сценарий 4)
- [X] T019 [P] [US1] Тест в `frontend/src/app/model/__tests__/webSocket.model.test.ts`: `handleLessonStatusUpdate` отправляет в `lessonModel.updateLesson` данные только с полем `status` (без `isTaxExempt`), то есть WS-событие не затирает признак (research R12)
- [X] T020 [P] [US1] Тесты хелперов в `frontend/src/features/lessons/models/__tests__/lessonForm.helpers.test.ts`: `prepareFormData(lesson с isTaxExempt: true)` → `true`; урок без поля → `false`; пустая форма → `false`; `prepareSubmitData` всегда отдаёт булево `isTaxExempt`, в том числе `false` (не `undefined`; иначе снятый признак не сохранится)
- [X] T021 [P] [US1] Тесты модели формы в `frontend/src/features/lessons/models/__tests__/lessonForm.model.test.ts` (с `fork`): `fieldChanged({ field: "isTaxExempt", value: true })` кладёт значение в `$formData`; отправка новой формы передаёт `isTaxExempt` в `lessonModel.addLesson`; отправка формы редактирования передаёт его в `lessonModel.updateLesson`; закрытие формы без сохранения ничего не отправляет (FR-003)
- [X] T022 [P] [US1] Компонентные тесты нового `TaxExemptSwitch` в `frontend/src/features/lessons/ui/TaxExemptSwitch/__tests__/TaxExemptSwitch.test.tsx`: подпись «Не облагается налогом»; это переключатель, а не чекбокс (`getByRole("switch", { name: "Не облагается налогом" })` в MUI 7); `checked` отражается; клик вызывает `onChange(!checked)`; `disabled` блокирует; `hint` рендерится и связан с input через `aria-describedby`; без `hint` подсказки нет; клик по подписи не всплывает к родителю
- [X] T023 [P] [US1] Компонентные тесты `TaxExemptStatus` в `frontend/src/features/lessons/ui/TaxExemptStatus/__tests__/TaxExemptStatus.test.tsx` (с `fork`): учёт налога выключен → ничего не рендерится; включён → переключатель с `checked = lesson.isTaxExempt`; клик вызывает `lessonTaxExemptChanged({ lessonId, isTaxExempt: !current })`; во время `updateLessonFx.pending` переключатель `disabled`; у урока `CANCELLED` переключатель показывается (FR-004)
- [X] T024 [P] [US1] Обновить `frontend/src/features/lessons/ui/LessonForm/components/__tests__/LessonFormContent.test.tsx`: при включённом учёте налога в форме создания и в форме редактирования есть **переключатель** «Не облагается налогом» (чекбокса с таким именем нет); его значение берётся из `formData.isTaxExempt`; клик вызывает `setFormData` с `isTaxExempt: !prev`; при выключенном учёте налога переключателя нет (FR-005)
- [X] T025 [P] [US1] Обновить `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.test.tsx`: попап показывает переключатель «Не облагается налогом» в состоянии из `lesson.isTaxExempt` при включённом учёте налога и не показывает при выключенном

### Implementation for User Story 1 — backend

- [X] T026 [US1] В `backend/src/controllers/lessons/validators.ts` экспортировать константу сообщения `TAX_EXEMPT_INVALID_ERROR = "Некорректное значение признака «Не облагается налогом»"` и в `validateLessonData` добавить явную проверку `data.isTaxExempt !== undefined && typeof data.isTaxExempt !== "boolean"` → `{ isValid: false, error: TAX_EXEMPT_INVALID_ERROR }` (research R4)
- [X] T027 [US1] В `backend/src/controllers/lessons/updateLesson.validators.ts` та же проверка для `updateData.isTaxExempt` с импортом `TAX_EXEMPT_INVALID_ERROR` из `./validators` (по образцу `CONTACT_METHODS`)
- [X] T028 [US1] В `backend/src/services/lessonCreation/lessonCreation.ts`: в `createSingleLesson` писать `isTaxExempt: data.isTaxExempt ?? false`, в `createRecurringLessons` — то же в каждый элемент `slotsToCreate` (FR-006)
- [X] T029 [US1] В `backend/src/services/lessonUpdate/lessonUpdate.helpers.ts` в `computeUpdatedStatus` перенести проверку `!updateData.status && existingLesson.status === "CANCELLED" → "CANCELLED"` сразу после проверки явного `CANCELLED`, до проверок по времени (research R5). Поведение для неотменённых уроков и для явного статуса не меняется
- [X] T030 [US1] В `backend/src/services/recurringLessons.ts` в `lessonsToCreate` добавить `isTaxExempt: lastLesson.isTaxExempt` рядом с `price: lastLesson.price` (FR-007)
- [X] T031 [US1] Убедиться, что `buildLessonUpdateData` (`backend/src/services/lessonUpdate/lessonUpdate.helpers.ts`) пробрасывает `isTaxExempt` через `...updateData` без отдельной ветки, а `updatePriceForFutureRecurringLessons` и `applyShiftFutureRecurringLessons` (`backend/src/services/recurringHelpers.ts`) признак не трогают; кода не добавлять, если тесты T013 зелёные (FR-008)

### Implementation for User Story 1 — frontend

- [X] T032 [US1] В `frontend/src/features/lessons/models/lessonActions.model.ts` добавить событие `lessonTaxExemptChanged = createEvent<{ lessonId: string; isTaxExempt: boolean }>()` и `sample` → `lessonModel.updateLesson` с `{ id: lessonId, data: { isTaxExempt } }`, без диалога подтверждения (research R13). Уведомления об успехе и ошибке уже даёт `lessonsNotifications.model.ts`, новых не добавлять
- [X] T033 [US1] Создать презентационный компонент `frontend/src/features/lessons/ui/TaxExemptSwitch/` (`TaxExemptSwitch.tsx`, `TaxExemptSwitch.styled.ts`, `TaxExemptSwitch.constants.ts`, `index.ts`): props `checked`, `onChange(checked: boolean)`, `disabled?`, `hint?`; разметка как у `PaymentStatus` / `HomeworkSentStatus`: MUI `Switch` в `FormControlLabel`, подпись `TAX_EXEMPT_LABEL` с `fontWeight: 500`, цвет подписи и включённого трека `TAX_EXEMPT_COLOR`, выключенной подписи `text.secondary`; `onClick` на `FormControlLabel` с `stopPropagation`; при `hint` — `FormHelperText` с `id`, связанный через `slotProps.input["aria-describedby"]`, отступ слева под ширину переключателя. Стили переключателя перенести сюда из `frontend/src/features/lessons/ui/TaxExemptStatus/TaxExemptStatus.styled.ts`, константы подсказки — из `TaxExemptCheckbox.constants.ts` (research R14)
- [X] T034 [US1] Переписать `frontend/src/features/lessons/ui/TaxExemptStatus/TaxExemptStatus.tsx` на `TaxExemptSwitch` с реальными данными: `checked={Boolean(lesson.isTaxExempt)}`, `onChange` → `lessonTaxExemptChanged({ lessonId: lesson.id, isTaxExempt })` через `useUnit`, `disabled` пока `lessonModel.updateLessonFx.pending`; снять оба маркера `TODO(auto-feature)`; удалить ставший ненужным `TaxExemptStatus.styled.ts` (пустых файлов не оставлять)
- [X] T035 [US1] Добавить `isTaxExempt: boolean` в `LessonFormData` в `frontend/src/features/lessons/ui/LessonForm/LessonForm.types.ts`
- [X] T036 [US1] В `frontend/src/features/lessons/models/lessonForm.helpers.ts`: `prepareFormData` — `isTaxExempt: lesson.isTaxExempt ?? false` для урока и `false` для пустой формы; `prepareSubmitData` — всегда `isTaxExempt: formData.isTaxExempt` (research R14)
- [X] T037 [US1] В `frontend/src/features/lessons/models/lessonForm.model.ts` добавить `isTaxExempt: false` в начальное значение `$formData`
- [X] T038 [US1] В `frontend/src/features/lessons/ui/LessonForm/components/LessonFormContent.tsx` заменить `TaxExemptCheckbox` на `TaxExemptSwitch` (`checked={formData.isTaxExempt}`, `disabled={isLoading}`, `onChange={(isTaxExempt) => setFormData((prev) => ({ ...prev, isTaxExempt }))}`, `hint` с текстом подсказки), оставить гейтинг `useIsTaxEnabled()`, убрать импорт `isLessonTaxExempt`, снять оба маркера `TODO(auto-feature)`
- [X] T039 [US1] Удалить целиком папку `frontend/src/features/lessons/ui/LessonForm/components/TaxExemptCheckbox/` (4 файла) и проверить, что на неё не осталось ссылок (`grep -rn "TaxExemptCheckbox" frontend/src` пуст)

**Checkpoint**: признак ставится и снимается в попапе и форме, проходит
валидацию, создаётся у серии, наследуется cron, не меняет статус
отменённого урока, не уходит ученику; все тесты US1 зелёные

---

## Phase 4: User Story 2 — Налог в статистике не начисляется на необлагаемые уроки (Priority: P2)

**Goal**: оплаты необлагаемых уроков исключены из налоговой базы и всех
строк ставок, их сумма отдаётся как `taxExemptIncome` и показывается
строкой в тултипе карточки налога; остальные показатели не меняются.

**Independent Test**: ставка 6%, оплачены 1000 ₽ и 2000 ₽ (второй
помечен) → налог 60 ₽, «Заработок» и «Поступления за период» по 3000 ₽,
в тултипе «6% × 1 000 ₽ = 60 ₽» и «Не облагается налогом: 2 000 ₽»;
снять признак → 180 ₽, строки нет.

### Tests for User Story 2

- [X] T040 [P] [US2] Юнит-тесты `computeTaxSummary` в `backend/src/services/__tests__/statistics.helpers.test.ts`: учёт налога выключен → `{ taxAmount: null, taxBreakdown: null, taxExemptIncome: null }`; без необлагаемых → `taxExemptIncome: 0`, `taxAmount`/`taxBreakdown` идентичны расчёту без поля (INV-4); 1000 + 2000 (необлагаемая) при 6% → `60`, `[{ rate: 6, earnings: 1000, tax: 60 }]`, `2000`; все необлагаемые → `taxAmount: 0`, строка ставки с `earnings: 0`, `taxExemptIncome` = сумма; необлагаемая оплата до первого периода не попадает в строку `isOutsidePeriods`; оплата без `paymentDate` (берётся `startTime`) работает так же; копейки: `1000.10 + 999.95` → ровно `2000.05`; округление налога по каждой облагаемой оплате не изменилось (все примеры из `data-model.md` §3)
- [X] T041 [P] [US2] Интеграционные тесты `GET /api/statistics` в новом `backend/src/controllers/statistics/__tests__/taxExemptStatistics.test.ts`: сценарии US2 1, 3, 5, 7, 8 (`taxAmount`, `taxBreakdown`, `taxExemptIncome`); учёт налога выключен → `taxExemptIncome: null`; признак у урока, оплаченного в прошлом месяце: `taxAmount` за прошлый месяц уменьшается ровно на налог урока и возвращается после снятия признака (US2 сценарий 6, FR-012); смена даты оплаты переносит сумму в `taxExemptIncome` другого периода; снятие оплаты убирает её из `taxExemptIncome`; удалённый урок исчезает из суммы
- [X] T042 [P] [US2] Интеграционный тест неизменности в `backend/src/controllers/statistics/__tests__/taxExemptStatistics.test.ts` (INV-5, FR-013, SC-003): при одних и тех же данных до и после пометки уроков совпадают `earnings`, `lastMonthEarnings`, `paymentsInRangeSum`, `paymentsInRangeCount`, `prepaidIncome`, `upcomingIncome`, `unpaidDebtSum`, `unpaidDebtCount`, `lostEarnings`, `trialLessonsCount`, `completedLessons`, `cancelledLessons` — отклонение 0 ₽
- [X] T043 [P] [US2] Интеграционный тест комиссий в `backend/src/controllers/statistics/__tests__/taxExemptStatistics.test.ts`: ученик с комиссией, его оплаченный урок помечен → `commissionWrittenOffSum`, `commissionRemainingTotal` и `commissionCredit` урока в `GET /api/lessons` такие же, как без признака (US2 сценарий 9)
- [X] T044 [P] [US2] Интеграционный тест переноса оплаты в `backend/src/controllers/statistics/__tests__/taxExemptStatistics.test.ts`: отмена оплаченного необлагаемого урока с переносом оплаты на облагаемый → перенесённая сумма в `taxAmount`, а не в `taxExemptIncome` (Clarifications спеки)
- [X] T045 [P] [US2] Тесты `frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/__tests__/TaxRateInfoTooltip.test.tsx`: при `taxExemptIncome > 0` в тултипе последней строкой «Не облагается налогом: 2 000 ₽»; при `0` и без пропа строки нет и содержимое такое же, как до фичи; открытие по наведению мыши, фокусу, тапу (через `useTooltipTrigger`); юнит-тест `formatTaxExemptLine` в новом `frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/__tests__/TaxRateInfoTooltip.helpers.test.ts` (форматирование суммы `2 000 ₽`)
- [X] T046 [P] [US2] Тесты `shouldShowTaxInfoIcon` в `frontend/src/pages/ReportsPage/components/FinancialStatistics/__tests__/FinancialStatistics.helpers.test.ts`: одна ставка + `taxExemptIncome > 0` → `true`; одна ставка + `0` → `false` (как раньше); несколько ставок → `true` независимо от суммы; `getTaxLabel` не изменился
- [X] T047 [P] [US2] Тесты `frontend/src/pages/ReportsPage/components/FinancialStatistics/__tests__/FinancialStatistics.test.tsx`: одна ставка и `taxExemptIncome: 2000` → подпись «Налоги (6%)», info-иконка есть, в тултипе строка про необлагаемые; `taxExemptIncome: 0` → иконки при одной ставке нет (FR-016); `taxAmount: null` → карточки налога нет и упоминаний «Не облагается налогом» на странице нет (FR-017)

### Implementation for User Story 2

- [X] T048 [US2] В `backend/src/services/statistics/statistics.types.ts`: `PaidLessonForTax` += `isTaxExempt: boolean`, `TaxSummary` += `taxExemptIncome: number | null`
- [X] T049 [US2] В `backend/src/services/statistics/statistics.ts` добавить `isTaxExempt: true` в `select` выборки `paidLessonsForTax`; запрос и `paidInRangeWhere` не менять
- [X] T050 [US2] В `backend/src/services/statistics/statistics.helpers.ts` переписать `computeTaxSummary` по `data-model.md` §3: ранний выход возвращает и `taxExemptIncome: null`; оплаты делятся на облагаемые (в `buildTaxBreakdown` как раньше) и необлагаемые (сумма в целых копейках → `taxExemptIncome`). Суммирование вынести в отдельный хелпер в том же файле. `backend/src/services/taxRate.ts` не трогать (research R8)
- [X] T051 [US2] В `frontend/src/pages/ReportsPage/components/FinancialStatistics/FinancialStatistics.tsx` заменить мок на `const taxExemptIncome = statistics.taxExemptIncome ?? 0`, убрать импорт `MOCK_TAX_EXEMPT_INCOME`, снять маркер `TODO(auto-feature)`; удалить файл `FinancialStatistics.constants.ts` целиком (в нём только мок и маркер)
- [X] T052 [US2] Проверить контраст первой строки тултипа налога (`frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/`), research R17: сравнить `git diff main -- frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/` и вычисленный цвет первой строки в DevTools на ветке и на `main` (ожидание: тот же `Typography body2` = `#2D5A3D` на фоне тултипа `alpha(#43A047, 0.92)`, на `main` так же). Если на ветке хуже, чем на `main`, вернуть цвет первой строки к `main`; если так же, первую строку **не трогать**. В любом случае `ExemptLine` должна иметь тот же цвет текста, что строки ставок. Результат (было/стало, цвета) записать в описание PR

**Checkpoint**: налог считается только по облагаемым оплатам, сумма
необлагаемых видна в тултипе, остальные показатели не изменились;
все тесты US2 зелёные

---

## Phase 5: User Story 3 — Видеть в карточке урока, что он не облагается налогом (Priority: P3)

**Goal**: у помеченных уроков рядом со стоимостью значок с подсказкой
в списке и в календаре; у остальных значка и места под него нет;
при выключенном учёте налога значков нет.

**Independent Test**: пометить урок → в списке рядом со стоимостью значок,
подсказка по наведению, фокусу и тапу, тап не открывает попап; у соседнего
урока значка нет; в календаре значок «0%»; на 375px вместе с пометкой
комиссии и регулярного занятия вёрстка не ломается.

### Tests for User Story 3

- [X] T053 [P] [US3] Компонентные тесты `frontend/src/shared/ui/TaxExemptBadge/__tests__/TaxExemptBadge.test.tsx`: `isTaxExempt: false` → в DOM ничего (FR-018); `variant="full"` → «0%» и «без налога»; `variant="icon"` → только «0%»; `role="img"` и `aria-label` «Не облагается налогом: доход по уроку не учитывается в сумме налога» (FR-019); подсказка с заголовком и расшифровкой открывается по наведению мыши, по фокусу и по клику; клик не всплывает к родительскому обработчику
- [X] T054 [P] [US3] Обновить `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/__tests__/LessonCard.test.tsx`: учёт налога включён и `isTaxExempt: true` → значок рядом со стоимостью; `isTaxExempt: false` → значка нет; учёт налога выключен → значка нет даже при `isTaxExempt: true` (US3 сценарий 6); клик по значку не вызывает `onCardClick`; признак вместе с `commissionCredit` и `isRecurring` → все три пометки в DOM (US3 сценарий 4)
- [X] T055 [P] [US3] Обновить `frontend/src/pages/lessons/components/LessonCell/__tests__/LessonCell.test.tsx`: обычный и `compact` вариант показывают значок без текста («0%», без «без налога») у помеченного урока при включённом учёте налога; нет значка у непомеченного и при выключенном учёте; клик по значку не вызывает `onClick` ячейки

### Implementation for User Story 3

- [X] T056 [P] [US3] В `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx` заменить мок на `const isTaxExempt = isTaxEnabled && Boolean(lesson.isTaxExempt)`, убрать импорт `isLessonTaxExempt`, снять маркер `TODO(auto-feature)`
- [X] T057 [P] [US3] В `frontend/src/pages/lessons/components/LessonCell/LessonCell.tsx` то же: `isTaxEnabled && Boolean(lesson.isTaxExempt)`, убрать импорт `isLessonTaxExempt`, снять маркер `TODO(auto-feature)`
- [X] T058 [US3] Удалить мок из `shared/ui`: файл `frontend/src/shared/ui/TaxExemptBadge/TaxExemptBadge.helpers.ts` целиком, константу `MOCK_TAX_EXEMPT_NOTES_MARKER` и маркер из `TaxExemptBadge.constants.ts`, ре-экспорт `isLessonTaxExempt` из `frontend/src/shared/ui/TaxExemptBadge/index.ts` и `frontend/src/shared/ui/index.ts` (выполнять после T034, T038, T056, T057 — до этого на хелпер ещё есть ссылки)
- [X] T059 [US3] Проверить на ширине 375px и на десктопе (сверить с `docs/mockups/034-tax-exempt-lessons/screenshots/01`, `06`, `08`): карточка списка с признаком + комиссией + регулярным занятием, ячейка календаря в обычном и компактном виде — пометки читаемы, вёрстка не ломается (правки `minWidth: 0` из макетов в `CommissionBadge.styled.ts` и `LessonCell.tsx` на месте; FR-021)

**Checkpoint**: значок виден только у помеченных уроков при включённом
учёте налога, подсказка работает мышью, клавиатурой и тапом

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: e2e, снос остатков макетов и финальные гейты качества

### E2E

- [X] T060 [P] E2E `frontend/e2e/lessons/tax-exempt-lesson.spec.ts` (`@regression`, `@lessons`), describe «Уроки без налога»: репетитор с `taxEnabled: true` открывает попап урока, включает «Не облагается налогом», видит тост и значок в карточке списка, наводит на значок и видит подсказку; выключает, значок пропал; создаёт урок с включённым переключателем в форме и видит значок; с выключенным учётом налога переключателя нет (US1, US3). Сидирование через `createLesson` с `isTaxExempt`, селекторы по роли и подписи
- [X] T061 [P] E2E `frontend/e2e/reports/tax-exempt-statistics.spec.ts` (`@regression`, `@reports`), describe «Налог без необлагаемых уроков»: ставка 6% (`setTaxPeriodsFor`), оплаченные уроки 1000 ₽ и 2000 ₽ (второй `isTaxExempt: true`) → «Налоги (6%)» = 60 ₽, «Поступления за период» = 3000 ₽, в тултипе info-иконки «Не облагается налогом: 2 000 ₽» (US2). Ожидать содержимое тултипа одним опросом DOM, без `waitForTimeout`
- [X] T062 Прогнать существующие `frontend/e2e/reports/tax-breakdown.spec.ts`, `frontend/e2e/profile/tax-toggle.spec.ts`, `frontend/e2e/lessons/mark-payment.spec.ts`, `frontend/e2e/lessons/recurring-lessons.spec.ts`: без необлагаемых уроков поведение прежнее (FR-016); бэкенд с `NODE_ENV=test` и `E2E=1`
- [ ] T063 Запустить `/e2e-check` по diff ветки и закрыть Critical/High пробелы покрытия, если найдутся

### Снос остатков макетов

- [X] T064 Проверить, что `grep -rn "TODO(auto-feature)\|isLessonTaxExempt\|MOCK_TAX_EXEMPT\|благотвор\|TaxExemptCheckbox" frontend/src backend/src` ничего не находит (все 10 маркеров сняты задачами T034, T038, T051, T056, T057, T058)

### Финальные гейты

- [X] T065 В `backend/`: `npm run lint`, `npm run build`, `npm test` (bcrypt-тяжёлые сьюты при параллельном vitest — с `--runInBand`)
- [ ] T066 В `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run find-cycle`, `npm run format:check`
- [X] T067 Перечитать `docs/conventions/backend.md`, `docs/conventions/frontend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/backend-testing.md` и вручную сверить весь новый и изменённый код: named exports, function expressions, `type` + `import type`, без `any`, `index.ts` в `TaxExemptSwitch/`, без deep-импортов, без inline-стилей и `sx`, константы/хелперы/стили в отдельных файлах, компоненты < 150 строк, без `<form>` и `useEffect` для данных, `sample` + `useUnit`, тексты и ошибки на русском, минимум комментариев
- [ ] T068 Пройти `specs/034-tax-exempt-lessons/quickstart.md` §4 вручную: все три истории, отменённый урок остаётся отменённым, кабинет ученика без признака

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T003)**: сразу; блокирует всё (без колонки нет типов Prisma)
- **Foundational (T004–T009)**: после Setup; **блокирует все истории**
- **US1 (T010–T039)**: после Foundational, от других историй не зависит
- **US2 (T040–T052)**: после Foundational. Бэкенд US2 технически независим от US1 (признак можно поставить в тесте напрямую через Prisma), но ручная проверка осмысленна после US1
- **US3 (T053–T059)**: после Foundational. Независима от US1/US2 на уровне кода; T058 ждёт T034, T038 (US1) и T056, T057
- **Polish (T060–T068)**: после историй, которые сдаются. T064 обязателен в любом случае: мок с «благотвор» не должен попасть в прод

### Файловые пересечения (нельзя параллелить)

- T012, T013, T014, T016 — один новый файл `lessonTaxExempt.test.ts`: писать последовательно или одним исполнителем
- T041–T044 — один новый файл `taxExemptStatistics.test.ts`
- T026 → T027 (константа из `validators.ts` импортируется в `updateLesson.validators.ts`)
- T033 → T034 и T033 → T038 (оба используют `TaxExemptSwitch`)
- T035 → T036 → T037 (тип `LessonFormData` нужен хелперам и модели)
- T048 → T049 → T050 (типы → выборка → расчёт)
- T034, T038, T056, T057 → T058 (снятие последних ссылок на `isLessonTaxExempt`)
- T005 → T056, T057 (поле `Lesson.isTaxExempt`); T006 → T051

### Внутри истории

- Тесты пишутся до реализации, падают, затем закрываются реализацией
- Бэкенд перед фронтом: пока API не отдаёт поле, компонент нечем кормить
- Снятие `TODO(auto-feature)` — последний шаг соответствующей задачи

### Parallel Opportunities

- Phase 2: T004–T009 все параллельны
- Phase 3: бэкенд-тесты T010, T011, T015 параллельны между собой и с блоком T012–T016; фронт-тесты T017–T025 параллельны
- Phase 4: T040, T045, T046, T047 параллельны между собой и с блоком T041–T044
- Phase 5: T053–T055 параллельны; T056 и T057 параллельны
- Phase 6: T060 и T061 параллельны
- После Foundational истории US1, US2, US3 можно вести параллельно разными исполнителями; пересечения перечислены выше

---

## Parallel Example: User Story 1

```text
# Бэкенд-тесты одновременно:
T010 validators.test.ts          T011 lessonUpdate.helpers.test.ts
T015 recurringLessons.test.ts    T012–T016 lessonTaxExempt.test.ts (один исполнитель)

# Фронт-тесты одновременно:
T017 lessonActions.model.test.ts   T020 lessonForm.helpers.test.ts
T022 TaxExemptSwitch.test.tsx      T023 TaxExemptStatus.test.tsx
```

## Parallel Example: User Story 2

```text
T040 statistics.helpers.test.ts   T045 TaxRateInfoTooltip.test.tsx
T046 FinancialStatistics.helpers.test.ts   T047 FinancialStatistics.test.tsx
T041–T044 taxExemptStatistics.test.ts (один исполнитель)
```

---

## Implementation Strategy

### MVP

Phase 1 + Phase 2 + Phase 3 (US1): признак хранится и переключается
в попапе и форме. Проверяется по Independent Test истории 1. Без US2
признак ещё не влияет на налог, поэтому в прод MVP отдельно не выкатывается.

### Инкременты

1. **MVP**: US1, признак ставится и хранится
2. **+US2**: правильная сумма налога, ради которой фича затевалась
3. **+US3**: значок в списке и календаре
4. **Phase 6**: e2e, снос моков, гейты. **Обязательно** при любом наборе
   сдаваемых историй

### Чего делать НЕ нужно (вне рамок спеки)

- Отдельной карточки «доход без налога» в статистике
- Признака на уровне ученика, массовой пометки, фильтра списка по признаку
- Причины или комментария к освобождению, истории изменений признака
- Значка в виджете ближайших уроков на дашборде
- Нового WebSocket-события для признака (Clarifications, research R12)
- Распространения признака на будущие уроки серии при правке одного урока (FR-008)
