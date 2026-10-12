# Tasks: История поступлений в отчётах

**Input**: Design documents from `/specs/035-income-history/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: ВКЛЮЧЕНЫ и обязательны. `CLAUDE.md`: «All new code must have
full test coverage… Do NOT skip tests or defer them to a later PR».
Конституция, принцип VI, — то же. Тестов требует и код, добавленный
на этапе макетов (компоненты истории, `ReceivedAmountHint`,
`ReceivedAmountField`, `PaymentFields`, `PaidDetailsFields`, `ReportsTabs`,
ссылка в `IncomeCards`, `ConfirmStatusDialog.confirmDisabled`): сейчас
у него тестов нет.

**Organization**: задачи сгруппированы по пользовательским историям спеки
(US1 — история по дням, US2 — полученная сумма, US3 — налог и комиссия
по оплате, US4 — переход к уроку).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 / US2 / US3 / US4, только в фазах историй

## Состояние кодовой базы на старте (важно)

UI фичи собран на этапе макетов и утверждён (docs/mockups/035-income-history/index.md).
В финальных местах лежат `pages/ReportsPage/components/{IncomeHistory,ReportsTabs,ReportsLessonDialogs}/`,
`features/lessons/ui/{ReceivedAmountField,PaymentFields}/`,
`features/lessons/ui/LessonForm/components/PaidDetailsFields/`,
`shared/ui/ReceivedAmountHint/`, `shared/types/incomeHistory.ts`, правки
в `PaymentStatus`, `LessonStatusIcons`, `LessonDetails`, `LessonFormContent`,
`LessonStatusSection`, `IncomeCards`, `ConfirmStatusDialog`, `ReportsPage`.
История захардкожена (`IncomeHistory.constants.ts`, `incomeHistoryMocks.helpers.ts`,
URL-переключатели `?incomeHistoryMock=` и `?reportsTab=`), поле «Получено»
живёт в `useState` и в API не уходит, строка открывает попап с мок-уроком.
В коде **18** маркеров `TODO(auto-feature)`. Серверной части нет ни строки:
ни колонки, ни эндпоинта.

Все команды — на машине `home` в worktree
`/home/roman-kaluger/kaluger-super-app/.claude/worktrees/detalizaciya-postuplenij-tmp`
(`ssh home 'source ~/.nvm/nvm.sh; cd <worktree>/backend && …'`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: колонка в БД с бэкфиллом. Без неё не собирается Prisma-клиент
и ни один слой

- [X] T001 Добавить `receivedAmount Decimal? @db.Decimal(10, 2)` в модель `Lesson` в `backend/prisma/schema.prisma` сразу после `paymentDate` с комментарием `// Сколько реально пришло за урок; null у неоплаченного` (data-model.md §1)
- [X] T002 Из `backend/` выполнить `npx prisma migrate dev --create-only --name add_lesson_received_amount`; в созданный `backend/prisma/migrations/*_add_lesson_received_amount/migration.sql` после `ALTER TABLE "lessons" ADD COLUMN "receivedAmount" DECIMAL(10,2);` дописать `UPDATE "lessons" SET "receivedAmount" = COALESCE("price", 0) WHERE "isPaid" = true;` (research R1, FR-021); затем `npm run db:migrate`
- [X] T003 Из `backend/` выполнить `npm run db:generate` и `npm run db:migrate:test`; на dev-БД проверить три запроса из `specs/035-income-history/quickstart.md` §2 (все возвращают `0`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: типы контракта, единая точка записи полученной суммы
(по умолчанию — стоимость), единое определение набора оплат и сидирование
e2e. На этом стоят все четыре истории

**⚠️ CRITICAL**: ни одна история не начинается, пока эта фаза не закрыта

### Tests — Foundational

- [X] T004 [P] Юнит-тесты `resolveReceivedAmount` в `backend/src/services/__tests__/lessonUpdate.helpers.test.ts` (в `makeLesson` добавить `receivedAmount: null`): неоплаченный + `{ isPaid: true }` → текущая `price`; + `{ isPaid: true, price: 2500 }` → `2500`; + `{ isPaid: true, receivedAmount: 1800 }` → `1800`; урок без цены + `{ isPaid: true }` → `0`; оплаченный + `{ isPaid: false }` → `null`; оплаченный + `{ isPaid: true, paymentDate }` без суммы → ключа нет (не менять); оплаченный + `{ price: 2500 }` → ключа нет; оплаченный + `{ receivedAmount: 2500 }` → `2500`; неоплаченный + `{ price: 100 }` → ключа нет. Через `buildLessonUpdateData`: сырое `receivedAmount` из тела в `dataToUpdate` не попадает мимо хелпера (research R3)
- [X] T005 [P] Интеграционные тесты записи по умолчанию в новом `backend/src/controllers/lessons/__tests__/lessonReceivedAmount.test.ts` (`PUT /api/lessons/:id`): отметка оплаты без суммы → `receivedAmount = price` в ответе и в БД; снятие оплаты → `null`; отмена оплаченного урока с `paymentDate` при следующем неоплаченном уроке ученика той же цены → у получателя `isPaid: true`, прежняя `paymentDate`, `receivedAmount` = сумма отменённого (поставить отменённому `receivedAmount: 1800` напрямую через Prisma), у отменённого `isPaid: false`, `paymentDate: null`, `receivedAmount: null` (FR-018, FR-019); `GET /api/lessons/:id` отдаёт `receivedAmount` числом
- [X] T006 [P] Юнит-тест `paidInRangeWhere` в `backend/src/services/__tests__/statistics.helpers.test.ts`: фильтр `receivedAmount: { gt: 0 }` вместо `price`; интеграционный тест в `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`: урок `isPaid`, `price: 2000`, `receivedAmount: 0` не входит в `paymentsInRangeCount`; урок `price: 0`, `receivedAmount: 1500` входит с суммой 1500 (Edge Cases «оплаченный урок сделали бесплатным»)

### Implementation — Foundational

- [X] T007 [P] В `backend/src/types/lesson.ts`: `UpdateLessonDto` += `receivedAmount?: number`; `CommissionLessonInput` += `receivedAmount: number | null` (data-model.md §7, research R7)
- [X] T008 [P] Во `frontend/src/shared/types/lesson.ts`: у `Lesson.receivedAmount?: number | null` снять маркер `TODO(auto-feature)`; в `UpdateLessonDto` добавить `receivedAmount?: number`
- [X] T009 В `backend/src/services/lessonUpdate/lessonUpdate.helpers.ts` добавить чистую `resolveReceivedAmount(updateData, existingLesson): number | null | undefined` по таблице research R3 и использовать её в `buildLessonUpdateData`: из `...updateData` исключить `receivedAmount`, вместо него `...(resolved !== undefined ? { receivedAmount: resolved } : {})`
- [X] T010 В `backend/src/controllers/lessons/updateLesson.ts` в ветке отмены оплаченного урока рядом с `dataToUpdate.paymentDate = null` добавить `dataToUpdate.receivedAmount = null`; в `backend/src/services/lessonUpdate/lessonUpdate.ts` в `runLessonUpdateTransaction` получателю переноса писать `receivedAmount: existingLesson.receivedAmount` (research R5)
- [X] T011 В `backend/src/services/statistics/statistics.helpers.ts` в `paidInRangeWhere` заменить `price: { gt: 0 }` на `receivedAmount: { gt: 0 }`; в `backend/src/services/statistics/statistics.ts` у `paymentsInRange` суммировать `_sum: { receivedAmount: true }` и отдавать `paymentsInRangeSum` из него (research R6; набор оплат карточки = набор истории)
- [X] T012 [P] В `backend/src/routes/testSupport.ts`: `POST /lessons` пишет `receivedAmount: data.isPaid ? (data.receivedAmount ?? data.price ?? 0) : null`; `PATCH /lessons/:id` при `isPaid: true` пишет `receivedAmount ?? price ?? 0` (цену прочитать из урока), при `isPaid: false` — `null`, отдельный `receivedAmount` применяет как есть. В `frontend/e2e/helpers/db.ts` добавить `receivedAmount?: number` в `LessonSeed` и в тип патча (contracts/README.md §7)

**Checkpoint**: Prisma-клиент знает `receivedAmount`, отметка оплаты
пишет её равной стоимости, карточка «Поступления» считает по ней,
`npx tsc --noEmit` в обоих пакетах зелёный, существующие тесты зелёные

---

## Phase 3: User Story 1 — Видеть историю поступлений за период по датам (Priority: P1) 🎯 MVP

**Goal**: вкладки «Сводка» / «История поступлений» под фильтром периода;
история по дням от новых к старым, сумма за день, итог за весь период
(= карточка), строки с учеником / пробным уроком, датой и временем урока,
предметом, статусом, «дата оплаты не указана»; порции по 50 без деления
дня с «Показать ещё (осталось N)», ошибкой и «Повторить»; ссылка из
карточки; вкладка живёт в сторе, а не в URL.

**Independent Test**: оплаты 2 × 1500 ₽ одного ученика 3-го и 2000 ₽
другого 5-го → вкладка истории: 5-е (2 000 ₽), затем 3-е (3 000 ₽, строки
ученика рядом), итог 5 000 ₽ / 3 оплаты = карточке; прошлый месяц →
оплаты прошлого месяца (quickstart.md §4 US1).

### Tests for User Story 1 — backend

- [X] T013 [P] [US1] Юнит-тесты `toDateKeyInTimezone` в `backend/src/utils/__tests__/time.test.ts`: `2026-10-04T21:30:00Z` → `2026-10-05` в `Europe/Moscow` и `2026-10-04` в `UTC`; полночь UTC; переход на летнее время (`Europe/Berlin`, 2026-03-29); невалидный пояс не используется (вызывающий код подставляет `UTC`)
- [X] T014 [P] [US1] Юнит-тесты хелперов истории в `backend/src/services/__tests__/incomeHistory.helpers.test.ts`: группировка по ключу дня `paymentDate ?? startTime`; дни от новых к старым; порядок строк дня (research R10: ученики по имени `ru`, тёзки разведены по `student.id`, пробные уроки отдельными группами, внутри ученика по `startTime`, затем `id`); суммы дня и итога в копейках (`0.1 + 0.2`-кейсы с копейками); нарезка порции: всё < 50 → один ответ, `nextCursor: null`; дни 30 + 30 → первая порция один день, `remainingCount: 30`; один день из 70 оплат → целиком; ровно 50 → один ответ; `before` — только дни строго старше; `through` — все дни не старше, без предела; `remainingCount` после `before`/`through`
- [X] T015 [P] [US1] Интеграционные тесты в новом `backend/src/controllers/statistics/__tests__/incomeHistory.test.ts` (`GET /api/statistics/income-history`): сценарий Independent Test US1 (дни, суммы, порядок, итог); `summary.total`/`count` равны `paymentsInRangeSum`/`paymentsInRangeCount` из `GET /api/statistics` за тот же период (SC-001); урок без `paymentDate` попадает в день `startTime` с `hasPaymentDate: false` (FR-007); отменённый оплаченный урок без даты оплаты — в истории со `lessonStatus: "CANCELLED"`; предоплата будущего урока — в дне оплаты со `lessonStatus: "SCHEDULED"`; пробный урок без ученика — `student: null`, `prospectName`; архивированный ученик — `student.archived: true`, текущее имя после переименования; урок с `receivedAmount: 0` отсутствует; граница суток по `X-Timezone: Europe/Moscow` (оплата `21:30Z` → следующий день) и `UTC` без заголовка; пустой период → `days: []`, нули, `nextCursor: null`; 120 оплат по дням → первая порция ≤ 50 с целыми днями, `before=nextCursor` продолжает без повторов и пропусков, итог в каждом ответе за весь период (FR-013); `through` возвращает все дни до указанного включительно; `400` при `before` и `through` вместе, при `before=abc`, при `startDate=garbage`; `401` без токена; уроки другого репетитора не видны (FR-037)
- [X] T016 [P] [US1] В `backend/src/__tests__/crossRoleSecurity.test.ts` добавить: токен ученика на `GET /api/statistics/income-history` отвергается так же, как на `GET /api/statistics`

### Tests for User Story 1 — frontend

- [X] T017 [P] [US1] Тесты модели `frontend/src/pages/ReportsPage/model/__tests__/reportsTabs.model.test.ts` (с `fork`): по умолчанию `"summary"`; `tabChanged("history")` меняет вкладку; закрытие и повторное открытие `ReportsPageGate` вкладку не сбрасывает; смена вкладки не вызывает ни `loadStatisticsFx`, ни `loadIncomeHistoryFx` (FR-001a)
- [X] T018 [P] [US1] Тесты `frontend/src/pages/ReportsPage/model/__tests__/statistics.model.test.ts` (с `fork`): открытие гейта и `statisticsLoadRequested` вызывают `periodApplied` с границами `toLocalStartOfDay`/`toLocalEndOfDay`, кладут их в `$appliedRange` и вызывают `loadStatisticsFx`; смена полей дат без «Обновить» `$appliedRange` не меняет
- [X] T019 [P] [US1] Тесты модели `frontend/src/pages/ReportsPage/model/__tests__/incomeHistory.model.test.ts` (с `fork`, эффекты подменены через `fork({ handlers })`): `periodApplied` загружает первую порцию с тем же периодом (FR-013a) на любой вкладке; успех кладёт ответ в `$incomeHistory` и чистит ошибку; ошибка → `$incomeHistoryError` с русским текстом; `incomeHistoryNextPageRequested` шлёт `before = page.nextCursor` и период из `$appliedRange`, дописывает дни, берёт новый `page`, `summary` оставляет прежним; повторный запрос во время загрузки порции не запускает второй эффект; при `nextCursor: null` ничего не шлёт; ошибка порции → `$nextPageError`, показанные дни на месте, повторный запрос чистит ошибку; ответ порции, пришедший после нового `periodApplied`, отбрасывается (`$historyVersion`); два быстрых `periodApplied` — применяется только последний ответ
- [X] T020 [P] [US1] Тесты хелперов `frontend/src/pages/ReportsPage/model/__tests__/incomeHistory.helpers.test.ts`: `appendIncomeHistoryPage` (конкатенация дней с сохранением ссылок на старые объекты дней, `page` из ответа, `summary` прежний), `getLastLoadedDayKey` (`null` для `null`/пустой истории, иначе ключ последнего дня)
- [X] T021 [P] [US1] Компонентный тест `frontend/src/pages/ReportsPage/components/IncomeHistory/__tests__/IncomeHistory.test.tsx` (с `fork` и Provider): ошибка → «Не удалось загрузить историю поступлений…»; пустая история → «За выбранный период поступлений нет» без итога и списка (FR-009); заполненная → пояснение с периодом из `$appliedRange`, итог, дни в порядке ответа; `remainingCount > 0` → «Показать ещё (осталось N)», клик шлёт `incomeHistoryNextPageRequested`; во время `loadNextPageFx` — «Загружаем оплаты…», `aria-busy`, повторный клик ничего не шлёт; `$nextPageError` → сообщение и «Повторить»
- [X] T022 [P] [US1] Компонентные тесты макетных компонентов истории: `IncomeHistoryDay` (`frontend/src/pages/ReportsPage/components/IncomeHistory/components/IncomeHistoryDay/__tests__/IncomeHistoryDay.test.tsx`: заголовок дня с заглавной буквы, «N оплат(ы/а)», сумма с копейками, налог дня только при `taxTotal !== null`), `IncomeHistoryRow` (`…/IncomeHistoryRow/__tests__/IncomeHistoryRow.test.tsx`: имя ученика, чип «Архив», имя контакта + «Пробный урок», строка «Предмет · Тип · урок D MMM, HH:MM–HH:MM», чип статуса только если не `COMPLETED` («Предстоящий» для `SCHEDULED`), «дата оплаты не указана», сумма = `receivedAmount` с копейками), `IncomeHistorySummary` (`…/IncomeHistorySummary/__tests__/IncomeHistorySummary.test.tsx`: «Поступило за период» и число оплат всегда; плитки налога / необлагаемых (> 0) / комиссий только при не-`null`), `IncomeHistoryLoadMore` (`…/IncomeHistoryLoadMore/__tests__/IncomeHistoryLoadMore.test.tsx`: `remainingCount: 0` → ничего; обычное, загрузка, ошибка), `IncomeHistoryEmpty`; и хелперы `formatPaymentsCount` (1 оплата, 2 оплаты, 5 оплат, 11–14 оплат, 21 оплата), `formatHistoryDayLabel`, `getEntryName`, `formatEntryLessonLine`, `getEntryStatusLabel`/`getEntryStatusColor` в `__tests__` рядом с их файлами
- [X] T023 [P] [US1] Компонентные тесты `frontend/src/pages/ReportsPage/components/ReportsTabs/__tests__/ReportsTabs.test.tsx` (с `fork`): две вкладки «Сводка» и «История поступлений», активная из `$activeTab`, клик шлёт `tabChanged`; на ширине `sm` вкладки `fullWidth`; URL не меняется. И `frontend/src/pages/ReportsPage/components/FinancialStatistics/IncomeCards/__tests__/IncomeCards.test.tsx` (обновить): кнопка «История поступлений по дням» шлёт `tabChanged("history")` и вызывает прокрутку к `#reports-tabs` (`scrollIntoView` замокан) (FR-014)
- [X] T024 [P] [US1] Компонентный тест `frontend/src/pages/ReportsPage/__tests__/ReportsPage.test.tsx` (с `fork`): по умолчанию видны карточки сводки и нет истории; после `tabChanged("history")` — история без карточек сводки; фильтр периода виден на обеих вкладках; при ошибке истории карточки сводки отображаются (FR-011)

### Implementation for User Story 1 — backend

- [X] T025 [P] [US1] В `backend/src/utils/time.ts` добавить чистую `toDateKeyInTimezone(date: Date, timezone: string): string` (`Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })`), экспортировать через `backend/src/utils/index.ts`
- [X] T026 [P] [US1] Создать `backend/src/types/incomeHistory.ts` с типами ответа (`IncomeHistoryTaxDto`, `IncomeHistoryEntryDto`, `IncomeHistoryDayDto`, `IncomeHistorySummaryDto`, `IncomeHistoryPageDto`, `IncomeHistoryDto`) ровно по `frontend/src/shared/types/incomeHistory.ts` и contracts/README.md §4; добавить `export type` в `backend/src/types/index.ts`
- [X] T027 [US1] Создать модуль `backend/src/services/incomeHistory/`: `incomeHistory.constants.ts` (`INCOME_HISTORY_PAGE_SIZE = 50`, `select` строки), `incomeHistory.types.ts` (вход сервиса `{ userId, range, timezone, before?, through? }`, строка выборки), `incomeHistory.helpers.ts` (чистые: `toEntry`, `compareEntriesWithinDay`, `groupIntoDays`, `buildSummary`, `slicePage` по research R10–R11, суммы в копейках), `incomeHistory.ts` (`collectIncomeHistory`: `prisma.lesson.findMany({ where: paidInRangeWhere(userId, range), select })` → хелперы; на этом шаге `tax: null`, `taxTotal: null`, `commissionCredit: null`, `commissionTotal: null`, их заполняет US3), `index.ts`; экспортировать `collectIncomeHistory` из `backend/src/services/index.ts`
- [X] T028 [US1] Создать `backend/src/controllers/statistics/getIncomeHistory.validators.ts` (`startDate`/`endDate` разбираются в дату или отсутствуют → иначе «Некорректный период»; `before`/`through` формата `^\d{4}-\d{2}-\d{2}$`, не оба сразу → иначе «Некорректная позиция продолжения истории») и `backend/src/controllers/statistics/getIncomeHistory.ts` (try/catch, `X-Timezone` через `isValidTimezone` с запасным `UTC`, период через `getDateRange` из `./utils`, вызов `collectIncomeHistory`, `500 «Внутренняя ошибка сервера»`); экспорт в `backend/src/controllers/statistics/index.ts`; маршрут `statisticsRouter.get("/income-history", getIncomeHistory)` в `backend/src/routes/statistics.ts` **до** любых параметризованных маршрутов

### Implementation for User Story 1 — frontend

- [X] T029 [P] [US1] Во `frontend/src/shared/api/statistics.ts` добавить `getIncomeHistory: (params: { startDate?: string; endDate?: string; before?: string; through?: string }) => api.get<IncomeHistory>("/statistics/income-history", { params })`
- [X] T030 [US1] В `frontend/src/pages/ReportsPage/model/statistics.model.ts` добавить `$appliedRange` и событие `periodApplied`: `sample` из `[ReportsPageGate.open, statisticsLoadRequested]` с границами дня → `periodApplied`; `periodApplied` → `[loadStatisticsFx, $appliedRange]` (заменяет прежний прямой `sample` в `loadStatisticsFx`) (research R14)
- [X] T031 [P] [US1] Создать `frontend/src/pages/ReportsPage/model/reportsTabs.model.ts` (`$activeTab: ReportsTab` = `"summary"`, `tabChanged`); тип `ReportsTab` перенести в `frontend/src/pages/ReportsPage/model/reportsTabs.types.ts` (компонент `ReportsTabs` импортирует тип оттуда); экспорт `export * as reportsTabsModel` в `frontend/src/pages/ReportsPage/model/index.ts`
- [X] T032 [US1] Создать `frontend/src/pages/ReportsPage/model/incomeHistory.constants.ts` (тексты ошибок первой порции и порции), `incomeHistory.helpers.ts` (`appendIncomeHistoryPage`, `getLastLoadedDayKey`, `buildNextPageParams`) и `incomeHistory.model.ts` (`$incomeHistory`, `$incomeHistoryError`, `$nextPageError`, `$isNextPageLoading`, `$historyVersion`, `incomeHistoryRequested`, `incomeHistoryNextPageRequested`, `loadIncomeHistoryFx`, `loadNextPageFx`; `statisticsModel.periodApplied` → `incomeHistoryRequested`; версия поколения в параметрах и фильтр `done` по ней; фильтр следующей порции по `!pending` и `nextCursor`) по data-model.md §7 и research R14; модель < 200 строк; экспорт `export * as incomeHistoryModel` в `frontend/src/pages/ReportsPage/model/index.ts`
- [X] T033 [US1] Подключить `frontend/src/pages/ReportsPage/components/IncomeHistory/IncomeHistory.tsx` к модели: `$incomeHistory`, `$incomeHistoryError`, `$isNextPageLoading`, `$nextPageError`, `onLoadMore` → `incomeHistoryNextPageRequested`, период пояснения из `statisticsModel.$appliedRange`; убрать `useIsTaxEnabled` и `$statistics` (видимость налога и комиссий задаёт сервер `null`); снять 2 маркера `TODO(auto-feature)` в файле. Обернуть `IncomeHistoryDay` в `memo` в `frontend/src/pages/ReportsPage/components/IncomeHistory/components/IncomeHistoryDay/IncomeHistoryDay.tsx` (research R20)
- [X] T034 [US1] Удалить моки истории: файл `frontend/src/pages/ReportsPage/components/IncomeHistory/incomeHistoryMocks.helpers.ts` целиком; из `IncomeHistory.constants.ts` все `MOCK_*` и `INCOME_HISTORY_MOCK_*` (файл удалить, если пустеет); из `IncomeHistory.helpers.ts` `getMockIncomeHistoryState`, `pickMockIncomeHistory`, `applyMockVisibility` (оставить `formatPaymentsCount`); из `IncomeHistory.types.ts` `IncomeHistoryMockState`, `IncomeHistoryVisibility` (файл удалить, если пустеет); снять 6 маркеров `TODO(auto-feature)` в этих файлах (3 в helpers, 2 в constants, 1 в mocks)
- [X] T035 [US1] Перевести вкладки на модель: `frontend/src/pages/ReportsPage/components/ReportsTabs/ReportsTabs.tsx` — `useUnit(reportsTabsModel.$activeTab)` и `tabChanged`; удалить `ReportsTabs.hooks.ts` (`useMockReportsTab`, маркер `TODO(auto-feature)`), `REPORTS_TAB_MOCK_PARAM`, `toReportsTab` и `ReportsTabs.types.ts`, если тип переехал; в `frontend/src/pages/ReportsPage/components/ReportsTabs/index.ts` и `frontend/src/pages/ReportsPage/components/index.ts` убрать `useMockReportsTab`; `frontend/src/pages/ReportsPage/ReportsPage.tsx` читает `reportsTabsModel.$activeTab`; `frontend/src/pages/ReportsPage/components/FinancialStatistics/IncomeCards/IncomeCards.tsx` шлёт `reportsTabsModel.tabChanged("history")` и вызывает `scrollToReportsTabs()` (FR-001a, FR-014)

**Checkpoint**: вкладка истории показывает реальные оплаты по дням,
итог совпадает с карточкой, «Показать ещё» работает, вкладка переживает
уход со страницы и не попадает в URL. Строка ещё открывает мок-урок (US4)

---

## Phase 4: User Story 2 — Хранить, сколько реально пришло за урок (Priority: P2)

**Goal**: поле «Получено» (по умолчанию стоимость) во всех трёх диалогах
отметки оплаты и в форме оплаченного урока; серверная валидация; правка
стоимости и даты оплаты сумму не меняют; все показатели по полученным
деньгам — по полученной сумме, по неполученным — по стоимости; значок
расхождения в истории и пометка «получено M ₽» в попапе; ученик суммы
не видит.

**Independent Test**: урок 2000 ₽ оплачен с «Получено» 2000, цена → 2500:
в истории 2 000 ₽ и значок «Получено 2 000 ₽, стоимость урока 2 500 ₽»,
карточка по-прежнему 2000; в форме «Получено» → 2500, сохранить: значка нет,
дата оплаты прежняя; другой урок 2000 ₽ с «Получено» 1800 → 1 800 ₽
со значком, карточка учитывает 1800 (quickstart.md §4 US2).

### Tests for User Story 2 — backend

- [X] T036 [P] [US2] Юнит-тесты валидатора в `backend/src/controllers/lessons/__tests__/validators.test.ts` (`validateUpdateData`): пропускает `receivedAmount` `0`, `1800`, `1800.5`, `99999999.99` у оплачиваемого (`isPaid: true`) и уже оплаченного урока; отклоняет `-1`, `100000000`, `1800.123`, `"1800"`, `null`, `NaN` текстом `RECEIVED_AMOUNT_INVALID_ERROR`; отклоняет сумму у неоплаченного урока без `isPaid: true` и при `{ isPaid: false, receivedAmount }` текстом `RECEIVED_AMOUNT_UNPAID_ERROR` (research R4, FR-020a)
- [X] T037 [P] [US2] Интеграционные тесты в `backend/src/controllers/lessons/__tests__/lessonReceivedAmount.test.ts` (дописать к T005): отметка с `receivedAmount: 1800` у урока 2000 → `1800`; смена цены оплаченного урока на 2500 → сумма 2000 (FR-017); повторное сохранение формы (`isPaid: true`, та же `paymentDate`, без суммы и с той же суммой) → сумма не меняется; смена только `paymentDate` → сумма не меняется; `{ receivedAmount: 2500 }` у оплаченного → `2500`, `isPaid` и `paymentDate` прежние (FR-020); одним телом `{ price: 2500, isPaid: true }` у неоплаченного → `2500` (US2 сц. 9); снять оплату и отметить снова без суммы → текущая цена (US2 сц. 8); регулярная серия: предоплаченный будущий урок, смена цены серии через `PUT { price }` → цена у предоплаченного новая, `receivedAmount` прежний (FR-017, US2 сц. 12); `400` из T036 доходит до HTTP с русским текстом; чужой урок → `404`
- [X] T038 [P] [US2] Тест `GET /api/lessons/:id/cancellation-info` в `backend/src/controllers/lessons/__tests__/getCancellationInfo.test.ts`: `transferAmount` = `receivedAmount` отменяемого урока (1800 при цене 2000) (research R5)
- [X] T039 [P] [US2] Интеграционные тесты статистики в новом `backend/src/controllers/statistics/__tests__/receivedAmountStatistics.test.ts`: при `receivedAmount ≠ price` по полученной сумме считаются `earnings`, `lastMonthEarnings`, `prepaidIncome`, `paymentsInRangeSum`, `taxAmount` и `taxBreakdown[].earnings`, `taxExemptIncome`; по стоимости — `unpaidDebtSum`, `unpaidDebtOver24hSum`, `lostEarnings`, `upcomingIncome`, `trialLessonsCount` (FR-025); недоплата не создаёт долга (FR-020b); при `receivedAmount = price` у всех оплаченных все показатели равны значениям, посчитанным по цене (SC-006); смена цены оплаченного урока меняет `earnings`, `paymentsInRangeSum`, налог и `commissionWrittenOffSum` на 0 ₽ (SC-007)
- [X] T040 [P] [US2] Юнит-тесты аллокатора в `backend/src/utils/__tests__/commission.test.ts`: FACT зачитывает `receivedAmount` (1500 при цене 3000), FORECAST — `price`; урок с `receivedAmount: 0` FACT-зачёта не получает; переплата (`received > price`) зачитывается полученной суммой в пределах остатка; `repaid + remaining === commissionAmount` в копейках. Интеграционный тест в `backend/src/controllers/statistics/__tests__/commissionStatistics.test.ts`: `commissionWrittenOffSum` и прогресс ученика (`commissionRepaid` в `GET /api/students`) по полученной сумме (FR-030)
- [X] T041 [P] [US2] Тест `paymentsSummary` в `backend/src/services/__tests__/lessonsQuery.test.ts` или `backend/src/__tests__/lessonsPaymentFilter.test.ts`: «Оплачено за период» на странице уроков — Σ `receivedAmount`, урок с `receivedAmount: 0` не считается (FR-025)
- [X] T042 [P] [US2] Тесты изоляции кабинета: в `backend/src/controllers/__tests__/studentCabinet.test.ts` ответ `GET /api/student-cabinet/lessons` ни у одного урока не содержит `receivedAmount` (по образцу проверки `isTaxExempt`); в `backend/src/controllers/lessons/__tests__/lessonReceivedAmount.test.ts` payload `broadcastStudentLessonUpdated` после `PUT { isPaid: true, receivedAmount }` не содержит суммы (шпион на `getWebSocketManager`, как в `updateLesson.test.ts`) (FR-026)

### Tests for User Story 2 — frontend

- [X] T043 [P] [US2] Тесты хелперов `frontend/src/features/lessons/models/__tests__/receivedAmount.helpers.test.ts`: `validateReceivedAmount` (пусто, пробелы, `-1`, `abc`, `1800,5` с запятой, `1800.123`, `100000000`, `0`, `99999999.99`), `toReceivedAmountInput` (`null`/`undefined` → `""`, число → строка), `parseReceivedAmount` (запятая → точка, число)
- [X] T044 [P] [US2] Тесты моделей диалогов: `frontend/src/features/lessons/ui/PaymentStatus/__tests__/PaymentStatus.model.test.ts` (с `fork`): `confirmDialogOpened({ isPaid: true, price: 2000 })` → `$receivedAmountInput = "2000"`, ошибки нет; `receivedAmountChanged("")` → «Укажите полученную сумму»; при `isPaid: false` ошибки нет; закрытие сбрасывает; `frontend/src/features/lessons/ui/LessonStatusIcons/__tests__/LessonStatusIcons.model.test.ts` — то же для `paymentDialogOpened({ lessonId, price })`
- [X] T045 [P] [US2] Тест `frontend/src/features/lessons/models/__tests__/lessonActions.model.test.ts` (обновить): `lessonPaymentChanged({ lessonId, isPaid: true, paymentDate, receivedAmount: 1800 })` → `updateLessonFx` с `data: { isPaid: true, paymentDate: <ISO>, receivedAmount: 1800 }`; `isPaid: false` → без `receivedAmount`
- [X] T046 [P] [US2] Тесты формы: `frontend/src/features/lessons/models/__tests__/lessonForm.helpers.test.ts` — `prepareFormData` оплаченного урока → `receivedAmount` из урока (при `null` — из цены), неоплаченного и пустой формы → `""`; `prepareSubmitData` шлёт `receivedAmount` числом только при `isPaid`; `validateFormData` и `canSubmitLessonForm` блокируют пустое/отрицательное «Получено» у оплаченного; `frontend/src/features/lessons/models/__tests__/lessonForm.model.test.ts` — `$receivedAmountError`, `$canSubmit = false` при ошибке, отправка формы оплаченного урока передаёт сумму в `lessonModel.updateLesson`
- [X] T047 [P] [US2] Компонентные тесты `PaymentStatus` в `frontend/src/features/lessons/ui/PaymentStatus/__tests__/PaymentStatus.component.test.tsx` (обновить): в диалоге отметки «Дата оплаты» и «Получено (₽)» = цена урока; ввод 1800 + «Подтвердить» шлёт `lessonPaymentChanged` с `receivedAmount: 1800`; пустое поле → ошибка под полем, кнопка неактивна, Enter не подтверждает (US2 сц. 3); в диалоге снятия оплаты поля нет; с `onPaymentChange` (форма) колбэк получает сумму четвёртым аргументом; удалить/переписать `PaymentStatus.hooks.test.ts`, если он проверял удалённый хук
- [X] T048 [P] [US2] Компонентные тесты `frontend/src/features/lessons/ui/LessonStatusIcons/__tests__/LessonStatusIcons.test.tsx` (обновить): диалог значка оплаты содержит «Получено» = цена; ошибка блокирует «Подтвердить» и Enter; подтверждение шлёт сумму; снятие оплаты — без поля. И `frontend/src/shared/ui/ConfirmStatusDialog/__tests__/ConfirmStatusDialog.test.tsx`: `confirmDisabled` делает кнопку неактивной и игнорирует Enter
- [X] T049 [P] [US2] Компонентные тесты полей: `frontend/src/features/lessons/ui/ReceivedAmountField/__tests__/ReceivedAmountField.test.tsx` (подпись «Получено (₽)», `₽`-адорнмент, ошибка вместо подсказки, `onChange` со строкой, `disabled`); `frontend/src/features/lessons/ui/PaymentFields/__tests__/PaymentFields.test.tsx` (дата и сумма, колбэки); `frontend/src/features/lessons/ui/LessonForm/components/PaidDetailsFields/__tests__/PaidDetailsFields.test.tsx` (значение из `formData.receivedAmount`, ввод вызывает `setFormData`, ошибка из `$receivedAmountError`); `frontend/src/features/lessons/ui/LessonForm/components/LessonStatusSection/__tests__/LessonStatusSection.test.tsx` (обновить: в `PaymentStatus` уходит цена из `formData.price`; подтверждение оплаты пишет `isPaid`, `paymentDate`, `receivedAmount` в `formData`; снятие — очищает сумму)
- [X] T050 [P] [US2] Компонентные тесты `frontend/src/shared/ui/ReceivedAmountHint/__tests__/ReceivedAmountHint.test.tsx` и хелперов `…/__tests__/ReceivedAmountHint.helpers.test.ts`: при совпадении (в копейках) ничего не рендерится; при расхождении — значок с `aria-label` «Получено 2 000 ₽, стоимость урока 2 500 ₽»; тултип по наведению мыши, фокусу и клику, с причиной и подсказкой про поле «Получено»; клик не всплывает к родителю, `keydown` не всплывает (FR-022); `variant="full"` показывает «получено 0 ₽» при сумме 0 и цене 2000; `receivedAmount: null` → ничего
- [X] T051 [P] [US2] Обновить `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.test.tsx`: оплаченный урок с расхождением — пометка «получено M ₽» рядом со стоимостью; без расхождения и у неоплаченного — пометки нет (FR-024). И строку истории: в `IncomeHistoryRow.test.tsx` (T022) значок расхождения есть при `receivedAmount ≠ price` и отсутствует при равенстве (FR-023)

### Implementation for User Story 2 — backend

- [X] T052 [US2] В `backend/src/controllers/lessons/validators.ts` экспортировать `RECEIVED_AMOUNT_INVALID_ERROR`, `RECEIVED_AMOUNT_UNPAID_ERROR`, `MAX_RECEIVED_AMOUNT = 99_999_999.99`; в `backend/src/controllers/lessons/updateLesson.validators.ts` добавить проверку `receivedAmount` по research R4 рядом с проверкой `isTaxExempt`
- [X] T053 [US2] В `backend/src/services/statistics/statistics.ts` перевести на `_sum.receivedAmount` агрегаты `earnings`, `lastMonthEarnings`, `prepaidIncome`; выборку `paidLessonsForTax` — `select: { receivedAmount, paymentDate, startTime, isTaxExempt }`; в `backend/src/services/statistics/statistics.types.ts` `PaidLessonForTax.price` → `receivedAmount`; в `backend/src/services/statistics/statistics.helpers.ts` `computeTaxSummary` передаёт в `buildTaxBreakdown` `price: receivedAmount`, `sumLessonPrices` → `sumReceivedAmounts`. `unpaidWhere`, `lostEarnings`, `upcomingIncome`, `trialLessonsCount` не трогать (research R6)
- [X] T054 [US2] Комиссия по полученной сумме: в `backend/src/services/commission/commission.helpers.ts` `LESSON_SELECT` += `receivedAmount: true`, `toAllocatorInput` += `receivedAmount: toAmount(lesson.receivedAmount)`; `backend/src/services/commission/commission.types.ts` `CommissionLessonRow` += `receivedAmount`; в `backend/src/utils/commission.ts` `runPass` получает функцию суммы урока: FACT — `receivedAmount ?? 0`, FORECAST — `price ?? 0` (research R7)
- [X] T055 [P] [US2] В `backend/src/services/lessonsQuery/lessonsQuery.ts` `paymentsSummary`: `where: { ...where, isPaid: true, receivedAmount: { gt: 0 } }`, `_sum: { receivedAmount: true }`
- [X] T056 [P] [US2] В `backend/src/controllers/lessons/getCancellationInfo.ts` `transferAmount: (lesson.receivedAmount ?? lesson.price)?.toNumber() ?? 0`

### Implementation for User Story 2 — frontend

- [X] T057 [US2] Создать `frontend/src/features/lessons/models/receivedAmount.constants.ts` (`MAX_RECEIVED_AMOUNT`, `RECEIVED_AMOUNT_ERRORS`) и `frontend/src/features/lessons/models/receivedAmount.helpers.ts` (`validateReceivedAmount`, `toReceivedAmountInput`, новая `parseReceivedAmount`) переносом из `frontend/src/features/lessons/ui/ReceivedAmountField/ReceivedAmountField.helpers.ts` / `.constants.ts` (в UI-константах остаётся `RECEIVED_AMOUNT_LABEL`; пустые файлы удалить); удалить `frontend/src/features/lessons/ui/ReceivedAmountField/ReceivedAmountField.hooks.ts` (маркер `TODO(auto-feature)`), поправить `frontend/src/features/lessons/ui/ReceivedAmountField/index.ts`
- [X] T058 [US2] В `frontend/src/features/lessons/ui/PaymentStatus/PaymentStatus.model.ts`: `confirmDialogOpened` принимает `{ isPaid: boolean; price?: number }` (`$pendingStatus` из `isPaid`), `$receivedAmountInput` (= `toReceivedAmountInput(price)` при открытии, `""` при закрытии), `receivedAmountChanged`, производный `$receivedAmountError` (только при `$pendingStatus === true`). В `frontend/src/features/lessons/ui/LessonStatusIcons/LessonStatusIcons.model.ts`: `paymentDialogOpened({ lessonId, price })` и то же трио юнитов. Обновить существующие вызовы и тесты этих событий
- [X] T059 [US2] В `frontend/src/features/lessons/models/lessonActions.model.ts` payload `lessonPaymentChanged` += `receivedAmount?: number`, `fn` кладёт `receivedAmount` в `data` только при `isPaid: true`
- [X] T060 [US2] Подключить диалоги: `frontend/src/features/lessons/ui/PaymentStatus/PaymentStatus.tsx` — сумма и ошибка из `PaymentStatus.model`, открытие с `price: lesson.price`, подтверждение шлёт `receivedAmount: parseReceivedAmount(input)` в `lessonPaymentChanged` или в `onPaymentChange(lessonId, isPaid, paymentDate, receivedAmount)` (тип пропа расширить); `frontend/src/features/lessons/ui/LessonStatusIcons/LessonStatusIcons.tsx` — из `LessonStatusIcons.model`, `paymentDialogOpened({ lessonId: lesson.id, price: lesson.price })`; снять 2 маркера `TODO(auto-feature)`
- [X] T061 [US2] Форма: `frontend/src/features/lessons/ui/LessonForm/LessonForm.types.ts` `LessonFormData.receivedAmount: string`; `frontend/src/features/lessons/models/lessonForm.helpers.ts` — `prepareFormData`, `prepareSubmitData`, `validateFormData`, `canSubmitLessonForm` по research R16; `frontend/src/features/lessons/models/lessonForm.model.ts` — `receivedAmount: ""` в начальном `$formData`, `$receivedAmountError = $formData.map(...)` (модель < 200 строк); `frontend/src/features/lessons/ui/LessonForm/components/LessonStatusSection/LessonStatusSection.tsx` — `onPaymentChange` пишет `receivedAmount` (при снятии оплаты `""`); `frontend/src/features/lessons/ui/LessonForm/components/PaidDetailsFields/PaidDetailsFields.tsx` — значение `formData.receivedAmount`, `onChange` через `setFormData`, ошибка `useUnit(lessonFormModel.$receivedAmountError)`, убрать проп `lesson`, если больше не нужен; снять 2 маркера `TODO(auto-feature)`
- [X] T062 [US2] Убедиться, что `frontend/src/features/lessons/ui/LessonViewDialog/LessonDetails/LessonDetails.tsx` и `IncomeHistoryRow.tsx` показывают `ReceivedAmountHint` по реальным `lesson.receivedAmount` / `entry.receivedAmount` (код из макета, правки только если тесты T050–T051 красные); `ReceivedAmountHint` в карточки списка и календаря не добавлять (FR-024)

**Checkpoint**: полученная сумма вводится, хранится, правится в форме,
переживает правку цены и переносится при отмене; все карточки считают
по ней; значок и пометка показывают расхождение

---

## Phase 5: User Story 3 — Видеть налог и комиссию по каждой оплате (Priority: P3)

**Goal**: при включённом учёте налога у каждой строки налог и ставка
на дату оплаты от полученной суммы, «вне настроенных периодов»,
«не облагается налогом»; налог за день; итог налога = карточке,
необлагаемые = строке тултипа; у зачтённых в счёт комиссии оплат —
зачтённая сумма, итог = «Списано в счёт комиссий»; без налога и без
учеников с комиссией — ни одной соответствующей пометки.

**Independent Test**: ставка 6%; оплаты 1000 ₽, 2000 ₽ «не облагается»,
1500 ₽ ученика с комиссией 3000 ₽ → строки «налог 60 ₽ · 6%»,
«не облагается», «налог 90 ₽ · 6%» + «в счёт комиссии 1 500 ₽»; итог
налога 150 ₽ = карточке, в счёт комиссий 1 500 ₽ = карточке; цена
первого урока 1200 → налог 60 ₽; учёт налога выключен → налога нет
(quickstart.md §4 US3).

### Tests for User Story 3

- [X] T063 [P] [US3] Юнит-тесты `resolveLessonTax` в `backend/src/services/__tests__/taxRate.test.ts`: дата раньше первого периода → `isOutsidePeriods`, налог 0; периодов нет → `isOutsidePeriods`; ставка 0% → `rate: 0`, не «вне»; смена ставки внутри периода; округление `Math.round` по оплате; существующие тесты `buildTaxBreakdown` остаются зелёными без правок (research R8)
- [X] T064 [P] [US3] Юнит-тесты налога и комиссии строк в `backend/src/services/__tests__/incomeHistory.helpers.test.ts` (дописать к T014): `tax` = `TAXED` / `OUTSIDE_PERIODS` / `EXEMPT` / `null` при выключенном учёте; `day.taxTotal` = Σ `TAXED.amount` дня (необлагаемые не входят); `summary.taxExemptTotal` = Σ полученных сумм необлагаемых; `commissionCredit` из карты FACT-зачётов, `null` без учеников с комиссией; `summary.commissionTotal` = Σ зачётов периода или `null`
- [X] T065 [P] [US3] Интеграционные тесты сверки в `backend/src/controllers/statistics/__tests__/incomeHistory.test.ts` (дописать к T015): набор Independent Test US3 плюс смена ставки внутри периода, оплата до первого периода, ставка 0%, изменённая после оплаты цена, недоплата — `summary.taxTotal === taxAmount`, `summary.taxExemptTotal === taxExemptIncome`, `summary.commissionTotal === commissionWrittenOffSum` из `GET /api/statistics` за тот же период, Σ налогов строк всех порций = `taxAmount` (SC-002); налог дня = Σ строк дня (FR-028, US3 сц. 5); учёт налога выключен → все налоговые поля `null` (FR-029); без учеников с комиссией → все комиссионные поля `null` (FR-031); предоплаченный будущий урок ученика с комиссией — `commissionCredit: null` (только FACT); сумма строки не уменьшена на налог и комиссию (FR-010)
- [X] T066 [P] [US3] Компонентные тесты `frontend/src/pages/ReportsPage/components/IncomeHistory/components/IncomeHistoryTax/__tests__/IncomeHistoryTax.test.tsx` и хелпера `formatEntryTax`: `null` → ничего; `TAXED` → «налог 60 ₽ · 6%»; `OUTSIDE_PERIODS` → «налог 0 ₽ · вне настроенных периодов»; `EXEMPT` → значок «не облагается налогом». В `IncomeHistoryRow.test.tsx` (T022): `commissionCredit` → «в счёт комиссии 1 500 ₽», `null` → нет пометки

### Implementation for User Story 3

- [X] T067 [US3] В `backend/src/services/taxRate.ts` выделить из цикла `buildTaxBreakdown` экспортируемую чистую `resolveLessonTax(amount: number, effectiveDate: Date, sortedPeriods: TaxRatePeriodDto[]) => { rate: number; isOutsidePeriods: boolean; tax: number }` и использовать её в `buildTaxBreakdown` (поведение не меняется)
- [X] T068 [US3] В `backend/src/services/incomeHistory/incomeHistory.ts` параллельно с выборкой оплат загрузить пользователя (`taxEnabled`, `taxRatePeriods` по возрастанию `startDate`) и `loadStudentAllocations(userId)` из `backend/src/services/commission` (экспортировать при необходимости через `index.ts`); в `incomeHistory.helpers.ts` заполнить `entry.tax` через `resolveLessonTax` (`paymentDate ?? startTime`, `receivedAmount`, `isTaxExempt`), `day.taxTotal`, `summary.taxTotal`, `summary.taxExemptTotal`, `entry.commissionCredit` (только `state === "FACT"`) и `summary.commissionTotal` по data-model.md §3–§5; `null` при выключенном учёте налога и без учеников с комиссией (research R8–R9)
- [X] T069 [US3] Проверить, что `IncomeHistorySummary`, `IncomeHistoryDay`, `IncomeHistoryRow`, `IncomeHistoryTax` (код макета) показывают налоговые и комиссионные данные только по не-`null` полям ответа и не читают флаг профиля; правки — только если T066 красный

**Checkpoint**: налог и комиссия в истории сходятся с карточками до копейки
при любых ставках, необлагаемых уроках и правках цены

---

## Phase 6: User Story 4 — Перейти из истории к уроку (Priority: P4)

**Goal**: клик или Enter по строке открывает попап того самого урока
(загруженного с сервера) поверх вкладки истории; полный набор диалогов
попапа работает на отчётах; любая правка из попапа и формы пересчитывает
историю (на ту же глубину) и карточки без перезагрузки, вкладка, период
и прокрутка сохраняются; удалённый урок — понятное сообщение и обновление.

**Independent Test**: нажать на строку — попап этого урока; сменить дату
оплаты на день другого периода и закрыть — строка исчезла, итог и карточка
уменьшились на полученную сумму, период и прокрутка не сбросились
(quickstart.md §4 US4).

### Tests for User Story 4

- [X] T070 [P] [US4] Тесты модели `frontend/src/pages/ReportsPage/model/__tests__/incomeHistoryReload.model.test.ts` (с `fork`): `incomeHistoryLessonOpened(id)` вызывает `openLessonFx(id)`, успех → `lessonsModel.viewDialogOpened(lesson)`; `404` → `notificationsModel.showErrorEvent` с «Урок не найден…» и перезагрузка карточек и истории; другая ошибка → `extractAxiosError(…, "Не удалось открыть урок")` без перезагрузки; `lessonModel.updateLessonFx.done` и `removeLessonFx.done` при открытом `ReportsPageGate` → `loadStatisticsFx($appliedRange)` и `loadIncomeHistoryFx` с `through` = последний загруженный день; при пустой истории — без `through`; при закрытом гейте — ничего не грузится; `updateLessonFx.fail` — ничего не грузится
- [X] T071 [P] [US4] Обновить `IncomeHistoryRow.test.tsx` (T022): клик и Enter по строке шлют `incomeHistoryLessonOpened(entry.lessonId)`; клик по значку расхождения внутри строки событие не шлёт (FR-022)
- [X] T072 [P] [US4] Компонентный тест нового `frontend/src/features/lessons/ui/LessonDialogs/__tests__/LessonDialogs.test.tsx` (с `fork`): рендерит форму, попап, `ConfirmDialog` из `$confirmDialog`, `LessonDeleteDialog`, `RescheduleDialog`; подтверждение удаления шлёт `lessonDeleteRequestedFromDialog`, переноса — `lessonRescheduleRequestedFromDialog`. Существующие тесты `frontend/src/pages/lessons/**` остаются зелёными
- [X] T073 [P] [US4] Интеграционный тест в `backend/src/controllers/statistics/__tests__/incomeHistory.test.ts` (дописать): после `PUT /api/lessons/:id { paymentDate }` на дату вне периода оплата исчезает из `GET /income-history?through=…`, итог и `remainingCount` пересчитаны; после `DELETE /api/lessons/:id` урока нет; `GET /api/lessons/:id` удалённого урока → `404 «Урок не найден»` (FR-035, FR-036)

### Implementation for User Story 4

- [X] T074 [US4] Перенести `frontend/src/pages/lessons/components/LessonsDialogs/` в `frontend/src/features/lessons/ui/LessonDialogs/` (`LessonDialogs.tsx`, `index.ts`), экспортировать из `frontend/src/features/lessons/ui/index.ts`; `frontend/src/pages/lessons/LessonsPage.tsx` использует `LessonDialogs` из `@features`; удалить старую папку и её экспорт из `frontend/src/pages/lessons/components/index.ts`; `npm run find-cycle` чистый (research R15)
- [X] T075 [US4] Создать `frontend/src/pages/ReportsPage/model/incomeHistoryReload.model.ts`: `incomeHistoryLessonOpened`, `openLessonFx` (`lessonsApi.getById`), `doneData` → `lessonsModel.viewDialogOpened`; `failData` 404 (хелпер `isNotFoundError` в `incomeHistory.helpers.ts`) → уведомление (текст в `incomeHistory.constants.ts`) + `reportsReloadRequested`; иное → `extractAxiosError`; `reportsReloadRequested` и `[lessonModel.updateLessonFx.done, lessonModel.removeLessonFx.done]` с фильтром `ReportsPageGate.status` → `statisticsModel.loadStatisticsFx($appliedRange)` и `incomeHistoryModel.incomeHistoryRequested({ ...$appliedRange, through: getLastLoadedDayKey($incomeHistory) ?? undefined })`; экспорт в `frontend/src/pages/ReportsPage/model/index.ts` (research R12, R15)
- [X] T076 [US4] В `frontend/src/pages/ReportsPage/components/IncomeHistory/components/IncomeHistoryRow/IncomeHistoryRow.tsx` `onClick` → `incomeHistoryReloadModel.incomeHistoryLessonOpened(entry.lessonId)`; убрать проп `paymentDate`, если не нужен, и его передачу в `IncomeHistoryDay.tsx`; удалить `buildMockLesson` из `IncomeHistoryRow.helpers.ts`; снять 2 маркера `TODO(auto-feature)`
- [X] T077 [US4] В `frontend/src/pages/ReportsPage/ReportsPage.tsx` заменить `ReportsLessonDialogs` на `LessonDialogs` из `@features`; удалить папку `frontend/src/pages/ReportsPage/components/ReportsLessonDialogs/` (маркер `TODO(auto-feature)`) и её экспорт из `frontend/src/pages/ReportsPage/components/index.ts`

**Checkpoint**: история — рабочий инструмент сверки: открыть урок,
исправить, вернуться к той же строке с пересчитанными цифрами

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: глобальный индикатор, e2e, снос моков, гейты качества

- [X] T078 В `frontend/src/app/model/blocking.model.ts` добавить в `$isBlocking` `incomeHistoryModel.loadIncomeHistoryFx.pending` и `incomeHistoryReloadModel.openLessonFx.pending` (через экспорт из `@pages/ReportsPage`); `loadNextPageFx.pending` **не** добавлять (FR-013c, Complexity Tracking плана); тест в `frontend/src/app/model/__tests__/blocking.model.test.ts`: первая порция блокирует, порция «Показать ещё» — нет
- [X] T079 [P] E2E `frontend/e2e/reports/income-history.spec.ts` (`@regression @reports`, `test.describe("История поступлений")`): сидирование через API (`LessonSeed` с `isPaid`, `paymentDate`, `receivedAmount`); учитель открывает отчёты — активна «Сводка»; ссылка «История поступлений по дням» открывает вкладку; дни и итог совпадают с карточкой «Поступления за период»; нажатие на строку открывает попап урока; снятие оплаты в попапе убирает строку и уменьшает итог без перезагрузки; второй тест — 60 оплат на разные дни → «Показать ещё (осталось N)» → догружено, кнопка исчезла
- [X] T080 [P] E2E `frontend/e2e/lessons/received-amount.spec.ts` (`@regression @lessons`, `test.describe("Полученная сумма за урок")`): учитель отмечает оплату в попапе, вводит в «Получено» 1800 при цене 2000 → в попапе «получено 1 800 ₽»; в форме редактирования «Получено (₽)» = 1800, меняет на 2000 и сохраняет → пометка пропала, урок оплачен с прежней датой
- [X] T081 Прогнать существующие e2e `frontend/e2e/lessons/mark-payment.spec.ts`, `cancel-with-payment-shift.spec.ts`, `lesson-commission-credit.spec.ts`, `frontend/e2e/reports/*.spec.ts`; поправить только то, что сломало новое поле в диалоге оплаты (селекторы `getByLabel("Дата оплаты")` должны остаться валидными)
- [X] T082 Финальная проверка сноса моков (research R22): `grep -rn "TODO(auto-feature)\|MOCK_INCOME\|incomeHistoryMock\|INCOME_HISTORY_MOCK\|reportsTab=\|REPORTS_TAB_MOCK_PARAM\|useMockReportsTab\|buildMockLesson\|useReceivedAmountInput\|ReportsLessonDialogs" frontend/src backend/src` — пусто; пустых файлов не осталось
- [X] T083 Гейты бэкенда из `backend/`: `npm test` (bcrypt-тяжёлые наборы при таймауте — `--runInBand`), `npm run lint`, `npm run build`, `npm run format:check`
- [X] T084 Гейты фронта из `frontend/`: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run find-cycle`, `npm run format:check`
- [X] T085 Перечитать `docs/conventions/backend.md`, `docs/conventions/frontend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/backend-testing.md`, `docs/conventions/e2e-testing.md` и вручную сверить весь новый и изменённый код: named exports, function expressions, `type` + `import type`, без `any`, `index.ts` в новых папках, без deep-импортов, без inline-стилей и `sx`, константы / хелперы / типы / стили в отдельных файлах, компоненты < 150 строк, модели < 200, контроллеры < 150, без `<form>` и `useEffect` для данных, только `sample` + `useUnit`, тексты и ошибки на русском, минимум комментариев
- [X] T086 Пройти `specs/035-income-history/quickstart.md` §2 (сверка статистики до/после миграции) и §4 вручную на десктопе и на 375px, включая прокрутку нескольких порций на телефоне (FR-013e) и сохранение прокрутки после закрытия попапа (FR-034)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T003)**: сразу; блокирует всё (без колонки нет типов Prisma)
- **Foundational (T004–T012)**: после Setup; **блокирует все истории**
- **US1 (T013–T035)**: после Foundational, от других историй не зависит
- **US2 (T036–T062)**: после Foundational. Бэкенд US2 независим от US1;
  значок в строке истории (T051, T062) осмыслен после T033
- **US3 (T063–T069)**: после US1 (дополняет сервис `incomeHistory` из T027
  и тесты T014/T015)
- **US4 (T070–T077)**: после US1 (строка, модели истории, `$appliedRange`)
- **Polish (T078–T086)**: после сдаваемых историй; T082 обязателен
  в любом случае: моки и URL-переключатели не должны попасть в прод

### Файловые пересечения (нельзя параллелить)

- T005, T037, T042 — один файл `lessonReceivedAmount.test.ts`
- T014 → T064; T015 → T065 → T073 — одни и те же файлы тестов
- T022, T051, T066, T071 — `IncomeHistoryRow.test.tsx`
- T009 → T010 (оба меняют путь записи); T011 → T053 (`statistics.ts`, `statistics.helpers.ts`)
- T025, T026 → T027 → T028; T027 → T068; T067 → T068
- T029, T030, T031 → T032 → T033 → T034; T031 → T035
- T057 → T058 → T060; T057 → T061; T059 → T060
- T032 → T075 → T076; T074 → T077; T075 → T078
- T007 → T054; T008 → T059, T061

### Внутри истории

- Тесты пишутся до реализации, падают, затем закрываются реализацией
- Бэкенд перед фронтом: пока API не отдаёт данные, компонент нечем кормить
- Снятие `TODO(auto-feature)` — последний шаг соответствующей задачи

### Parallel Opportunities

- Phase 2: T004–T008 и T012 параллельны
- Phase 3: бэкенд-тесты T013–T016 и фронт-тесты T017–T024 параллельны; T025, T026, T029, T031 параллельны
- Phase 4: T036–T051 параллельны (кроме общего файла T037/T042 с T005); T055, T056 параллельны
- Phase 5: T063–T066 параллельны
- Phase 6: T070–T073 параллельны
- Phase 7: T079, T080 параллельны
- После Foundational US1 и US2 можно вести параллельно разными исполнителями

---

## Parallel Example: User Story 1

```text
# Бэкенд-тесты одновременно:
T013 time.test.ts                 T014 incomeHistory.helpers.test.ts
T015 incomeHistory.test.ts        T016 crossRoleSecurity.test.ts

# Фронт-тесты одновременно:
T017 reportsTabs.model.test.ts    T019 incomeHistory.model.test.ts
T021 IncomeHistory.test.tsx       T023 ReportsTabs.test.tsx
```

## Parallel Example: User Story 2

```text
T036 validators.test.ts           T039 receivedAmountStatistics.test.ts
T040 commission.test.ts           T043 receivedAmount.helpers.test.ts
T044 PaymentStatus.model.test.ts  T050 ReceivedAmountHint.test.tsx
```

---

## Implementation Strategy

### MVP

Phase 1 + Phase 2 + Phase 3 (US1): история по дням с итогом, равным
карточке, порциями и вкладками. Полученная сумма уже хранится (равна
стоимости), поэтому цифры истории корректны с первого дня. Проверяется
по Independent Test истории 1.

### Инкременты

1. **MVP**: US1 — история поступлений
2. **+US2**: поле «Получено», правка в форме, все карточки по полученной сумме
3. **+US3**: налог и комиссия по каждой оплате
4. **+US4**: переход к уроку и пересчёт после правки
5. **Phase 7**: оверлей, e2e, снос моков, гейты. **Обязательно** при любом
   наборе сдаваемых историй

### Чего делать НЕ нужно (вне рамок спеки)

- Выгрузки истории (CSV, Excel, PDF), импорта выписки, отметки «сверено»
- Фильтра и поиска внутри истории
- Статуса «оплачен частично», долга по недоплате, нескольких поступлений за урок
- Правки полученной суммы из попапа или из строки истории
- Пометки «получено» в карточках списка уроков и в календаре
- Перевода `/statistics/by-subject`, `/by-type`, `/by-student` на полученную сумму
- Хранения вкладки в URL, постоянной ссылки на урок
- Нового WebSocket-события (research R19)
- Изменения правила отмены оплаченного урока без переноса (research R5) и хранения даты оплаты (research R13)
