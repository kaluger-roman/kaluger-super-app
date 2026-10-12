# Implementation Plan: История поступлений в отчётах

**Branch**: `035-income-history` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-income-history/spec.md`

## Summary

На странице отчётов появляются вкладки «Сводка» (всё, что есть сейчас)
и «История поступлений» — оплаты выбранного периода по дням поступления,
от новых к старым, с суммой за день, итогом за весь период (сумма, число,
налог, необлагаемые, в счёт комиссий), налогом и зачётом комиссии
по каждой оплате и переходом к уроку по клику на строку. Длинная история
приходит с сервера порциями по ~50 оплат по кнопке «Показать ещё», день
никогда не делится. У урока появляется хранимая полученная сумма
(`Lesson.receivedAmount`): её задаёт поле «Получено» во всех диалогах
отметки оплаты (по умолчанию стоимость), её правит форма редактирования
оплаченного урока, она переходит на урок-получатель при переносе оплаты,
стирается при снятии оплаты и не зависит от последующих правок стоимости.
Все показатели по уже полученным деньгам считаются по ней, показатели по
деньгам, которые ещё не пришли, остаются на стоимости.

**Технический подход.**

- **БД**: одна nullable-колонка `lessons."receivedAmount" DECIMAL(10,2)`
  и бэкфилл `COALESCE(price, 0)` у оплаченных уроков в той же миграции —
  после неё каждая цифра статистики совпадает с прежней (R1).
- **Запись**: единственная точка — новый чистый `resolveReceivedAmount`
  в `buildLessonUpdateData`; плюс ветка отмены и перенос оплаты в
  транзакции; валидация в `validateUpdateData` (R3–R5).
- **Агрегаты**: `paidInRangeWhere` (`receivedAmount > 0`) остаётся единым
  определением набора оплат для карточки, налога, необлагаемых и истории;
  `earnings`, `lastMonthEarnings`, `prepaidIncome`, `paymentsInRange`,
  налог, `paymentsSummary` на странице уроков и FACT-проход аллокатора
  комиссий суммируют `receivedAmount`; долг, потери, предстоящий доход
  и прогноз комиссии — по-прежнему `price` (R6, R7).
- **Налог строки**: из `buildTaxBreakdown` выделяется `resolveLessonTax`,
  ей пользуются и карточка, и история — расхождение исключено по построению (R8).
- **История**: `GET /api/statistics/income-history` — одна индексная
  выборка всех оплат периода, группировка по дню в поясе `X-Timezone`,
  итоги по всему периоду и нарезка порции в памяти; курсор — ключ дня
  (`before`), перезагрузка на глубину — `through` (R9–R13).
- **Фронт**: UI собран на этапе макетов и утверждён; работа — подключить
  Effector: `reportsTabs.model` (вкладка в сторе, не в URL),
  `incomeHistory.model` (первая порция вместе с карточками, «Показать
  ещё», защита от устаревших ответов счётчиком поколения),
  `incomeHistoryReload.model` (пересчёт после правки урока на ту же
  глубину, открытие урока с сервера, 404), `$appliedRange` в
  `statistics.model`; поле «Получено» в моделях `PaymentStatus`,
  `LessonStatusIcons` и формы; набор диалогов урока переезжает в
  `features/lessons/ui/LessonDialogs` и монтируется на обеих страницах;
  снос 18 маркеров `TODO(auto-feature)` и моков (R14–R22).

Новых зависимостей и WebSocket-событий нет.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, patronum, effector-react, Material UI (styled API), axios — frontend; Express, Prisma — backend. Новых зависимостей нет
**Storage**: PostgreSQL через Prisma. Одна новая колонка `lessons."receivedAmount" DECIMAL(10,2) NULL` + бэкфилл в миграции; новых таблиц и индексов нет
**Testing**: Vitest + RTL + MSW (frontend); Jest + Supertest + реальная тестовая БД (backend); Playwright (e2e)
**Target Platform**: Web SPA, десктоп и мобильная ширина (375px)
**Project Type**: web (монорепо frontend + backend, затронуты оба)
**Performance Goals**: SC-009 — год с 1000 оплат: итог + первая порция ≤ 2 с, каждая следующая порция ≤ 1 с; список из нескольких сотен строк прокручивается без задержек на телефоне. Один индексный запрос оплат периода + 2 лёгких (пользователь, комиссии) на ответ истории; статистика — без новых запросов
**Constraints**: итоги истории = карточки с отклонением 0 ₽ (SC-001, SC-002); после миграции все показатели совпадают с прежними (SC-006); правка стоимости оплаченного урока не меняет денежные итоги (SC-007); `receivedAmount` не уходит в кабинет ученика (FR-026); вкладка не в URL (FR-001a); порция без общего оверлея (FR-013c); без `<form>`, без `useEffect` для загрузки данных, без inline-стилей; компоненты < 150 строк, модели < 200, контроллеры < 150; тексты и ошибки на русском
**Scale/Scope**: 1 миграция; бэкенд — 1 новый сервис (`incomeHistory`), 1 новый контроллер + валидатор + маршрут, правки в `lessonUpdate`, `updateLesson`, `getCancellationInfo`, валидаторах, `statistics`, `lessonsQuery`, `commission`, `utils/commission.ts`, `taxRate.ts`, `utils/time.ts`, `testSupport`; фронт — 3 новые модели страницы отчётов, правки 3 моделей `features/lessons`, перенос набора диалогов, подключение ~15 компонентов макета, 2 новых e2e

**Unknowns**: нет. Четыре развилки спеки закрыты в Clarifications;
решения реализации — в [research.md](./research.md) (R1–R23). Два
наблюдения о существующем поведении, которое фича сознательно не меняет
(FR-032), вынесены для пользователя: отмена оплаченного урока с датой
оплаты всегда снимает оплату, даже без переноса (R5); дата оплаты хранится
UTC-полночью, что для поясов западнее UTC сдвигает день (R13).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Feature-Sliced Design**: PASS. Модели истории и вкладок —
  `pages/ReportsPage/model` (рядом с `statistics.model`); компоненты
  истории — `pages/ReportsPage/components`; поле «Получено» и диалоги
  оплаты — `features/lessons/ui`; валидация суммы — `features/lessons/models`;
  `ReceivedAmountHint` — `shared/ui` (используют `features/lessons`
  и `pages/ReportsPage`); тип `IncomeHistory` — `shared/types`. Набор
  диалогов урока переезжает из `pages/lessons` в `features/lessons/ui`,
  потому что его монтируют две страницы (page → page запрещён). Импорты
  только вниз, `npm run find-cycle` в гейтах.
- **II. Layered MVC (Backend)**: PASS. Маршрут → `getIncomeHistory`
  (HTTP, валидация query, `X-Timezone`) → `services/incomeHistory`
  (выборка, группировка, налог, порции) → Prisma. Чистые функции —
  `utils/time.ts` (`toDateKeyInTimezone`), `utils/commission.ts`,
  `services/taxRate.ts`. Валидация `receivedAmount` — в
  `controllers/lessons/updateLesson.validators.ts`, вычисление — в
  `services/lessonUpdate/lessonUpdate.helpers.ts`.
- **III. Effector State Management**: PASS. Вкладка, история, порции,
  ошибки, поле «Получено» — сторы; связи только `sample`; компоненты —
  `useUnit`; `fn` чистые, сложная логика вынесена в `*.helpers.ts`;
  загрузка по гейту и событиям, без `useEffect`. Макетный хук
  `useReceivedAmountInput` (`useState` + `useEffect`) удаляется.
- **IV. Type Safety**: PASS. `type`, `import type`, без `any`; бэкенд-типы
  в `types/incomeHistory.ts` и `types/lesson.ts`, сервисные — в
  `services/incomeHistory/incomeHistory.types.ts`; фронт —
  `shared/types/incomeHistory.ts` (из макета) и `shared/types/lesson.ts`.
- **V. Code Consistency**: PASS. Named exports, function expressions,
  `index.ts` в новых папках (`services/incomeHistory/`,
  `features/lessons/ui/LessonDialogs/`), стили / константы / хелперы
  в отдельных файлах, тексты на русском.
- **VI. Testing Discipline**: PASS после задач тестирования. Тесты на всё
  новое, включая код макетов (компоненты истории, `ReceivedAmountHint`,
  `ReceivedAmountField`, `PaymentFields`, `PaidDetailsFields`, `ReportsTabs`,
  `ConfirmStatusDialog.confirmDisabled`); бэкенд без моков Prisma;
  сверка итогов истории с `GET /api/statistics` интеграционным тестом.
- **VII. Simplicity**: PASS. Одна колонка, один эндпоинт, ноль зависимостей
  и WS-событий; без виртуализации, без отдельной таблицы платежей, без
  `$queryRaw`; общий набор диалогов вместо второй копии.

**Post-Design re-check (после Phase 1)**: PASS с одним задокументированным
отклонением от `docs/conventions/frontend.md` (Complexity Tracking):
загрузка порции «Показать ещё» не идёт в глобальный `$isBlocking`, как
прямо требует FR-013c. Контракты ([contracts/README.md](./contracts/README.md))
и модель ([data-model.md](./data-model.md)) новых слоёв не добавили.

## Project Structure

### Documentation (this feature)

```text
specs/035-income-history/
├── plan.md              # This file
├── spec.md              # Спецификация (утверждена, + Clarifications)
├── research.md          # Phase 0: решения R1–R23
├── data-model.md        # Phase 1: колонка, инварианты, строка/день/итог/порция, сторы фронта
├── quickstart.md        # Phase 1: миграция, запуск, ручная проверка по историям
├── contracts/
│   └── README.md        # Phase 1: PUT /api/lessons, income-history, statistics, test-support
├── checklists/
│   └── requirements.md  # (существует)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                        # ИЗМЕНИТЬ: Lesson.receivedAmount
│   └── migrations/<ts>_add_lesson_received_amount/migration.sql  # СОЗДАТЬ: ALTER + UPDATE бэкфилл
└── src/
    ├── types/
    │   ├── lesson.ts                                        # ИЗМЕНИТЬ: UpdateLessonDto.receivedAmount, CommissionLessonInput.receivedAmount
    │   ├── incomeHistory.ts                                 # СОЗДАТЬ: DTO ответа истории
    │   └── index.ts                                         # ИЗМЕНИТЬ: barrel
    ├── utils/
    │   ├── time.ts                                          # ИЗМЕНИТЬ: toDateKeyInTimezone
    │   └── commission.ts                                    # ИЗМЕНИТЬ: FACT от receivedAmount, FORECAST от price
    ├── controllers/
    │   ├── lessons/
    │   │   ├── validators.ts                                # ИЗМЕНИТЬ: константы RECEIVED_AMOUNT_*_ERROR
    │   │   ├── updateLesson.validators.ts                   # ИЗМЕНИТЬ: проверка receivedAmount
    │   │   ├── updateLesson.ts                              # ИЗМЕНИТЬ: receivedAmount = null в ветке отмены
    │   │   └── getCancellationInfo.ts                       # ИЗМЕНИТЬ: transferAmount = receivedAmount
    │   └── statistics/
    │       ├── getIncomeHistory.ts                          # СОЗДАТЬ
    │       ├── getIncomeHistory.validators.ts               # СОЗДАТЬ
    │       └── index.ts                                     # ИЗМЕНИТЬ
    ├── routes/
    │   ├── statistics.ts                                    # ИЗМЕНИТЬ: GET /income-history
    │   └── testSupport.ts                                   # ИЗМЕНИТЬ: receivedAmount в POST/PATCH /lessons
    └── services/
        ├── lessonUpdate/
        │   ├── lessonUpdate.helpers.ts                      # ИЗМЕНИТЬ: resolveReceivedAmount в buildLessonUpdateData
        │   └── lessonUpdate.ts                              # ИЗМЕНИТЬ: перенос оплаты несёт receivedAmount
        ├── statistics/
        │   ├── statistics.ts                                # ИЗМЕНИТЬ: _sum.receivedAmount для оплаченных
        │   ├── statistics.helpers.ts                        # ИЗМЕНИТЬ: paidInRangeWhere, computeTaxSummary
        │   └── statistics.types.ts                          # ИЗМЕНИТЬ: PaidLessonForTax.receivedAmount
        ├── taxRate.ts                                       # ИЗМЕНИТЬ: выделить resolveLessonTax (поведение то же)
        ├── commission/commission.helpers.ts, commission.types.ts  # ИЗМЕНИТЬ: select receivedAmount
        ├── lessonsQuery/lessonsQuery.ts                     # ИЗМЕНИТЬ: paymentsSummary по receivedAmount
        ├── incomeHistory/                                   # СОЗДАТЬ: incomeHistory.ts, .helpers.ts, .types.ts, .constants.ts, index.ts
        ├── index.ts                                         # ИЗМЕНИТЬ: экспорт collectIncomeHistory
        └── studentCabinet/, studentLessonBroadcast/         # НЕ ТРОГАТЬ, закрыть тестами (FR-026)

frontend/
├── e2e/
│   ├── helpers/db.ts                                        # ИЗМЕНИТЬ: LessonSeed.receivedAmount
│   ├── reports/income-history.spec.ts                       # СОЗДАТЬ
│   └── lessons/received-amount.spec.ts                      # СОЗДАТЬ
└── src/
    ├── app/model/blocking.model.ts                          # ИЗМЕНИТЬ: loadIncomeHistoryFx, openLessonFx (не loadNextPageFx)
    ├── shared/
    │   ├── types/lesson.ts                                  # ИЗМЕНИТЬ: снять мок-маркер, UpdateLessonDto.receivedAmount
    │   ├── types/incomeHistory.ts                           # СУЩЕСТВУЕТ (макет), контракт
    │   ├── api/statistics.ts                                # ИЗМЕНИТЬ: getIncomeHistory
    │   └── ui/
    │       ├── ReceivedAmountHint/                          # СУЩЕСТВУЕТ (макет) + тесты
    │       └── ConfirmStatusDialog/                         # СУЩЕСТВУЕТ (правка макета confirmDisabled) + тесты
    ├── features/lessons/
    │   ├── models/
    │   │   ├── receivedAmount.helpers.ts, receivedAmount.constants.ts  # СОЗДАТЬ (перенос из ReceivedAmountField)
    │   │   ├── lessonActions.model.ts                       # ИЗМЕНИТЬ: lessonPaymentChanged.receivedAmount
    │   │   ├── lessonForm.model.ts, lessonForm.helpers.ts   # ИЗМЕНИТЬ: receivedAmount в форме
    │   └── ui/
    │       ├── ReceivedAmountField/                         # ИЗМЕНИТЬ: удалить hooks-мок и перенесённые helpers/constants
    │       ├── PaymentFields/                               # СУЩЕСТВУЕТ (макет) + тесты
    │       ├── PaymentStatus/ (+ .model.ts)                 # ИЗМЕНИТЬ: сумма в модели и в payload
    │       ├── LessonStatusIcons/ (+ .model.ts)             # ИЗМЕНИТЬ: то же
    │       ├── LessonForm/LessonForm.types.ts               # ИЗМЕНИТЬ: LessonFormData.receivedAmount
    │       ├── LessonForm/components/PaidDetailsFields/     # ИЗМЕНИТЬ: реальные данные
    │       ├── LessonForm/components/LessonStatusSection/   # ИЗМЕНИТЬ: onPaymentChange с суммой
    │       ├── LessonViewDialog/LessonDetails/              # СУЩЕСТВУЕТ (макет) + тесты
    │       └── LessonDialogs/                               # СОЗДАТЬ (перенос из pages/lessons/components/LessonsDialogs)
    └── pages/
        ├── lessons/                                         # ИЗМЕНИТЬ: LessonsPage использует LessonDialogs; удалить components/LessonsDialogs
        └── ReportsPage/
            ├── ReportsPage.tsx                              # ИЗМЕНИТЬ: $activeTab, LessonDialogs
            ├── model/
            │   ├── statistics.model.ts                      # ИЗМЕНИТЬ: periodApplied, $appliedRange
            │   ├── reportsTabs.model.ts                     # СОЗДАТЬ
            │   ├── incomeHistory.model.ts, incomeHistory.helpers.ts, incomeHistory.constants.ts  # СОЗДАТЬ
            │   ├── incomeHistoryReload.model.ts             # СОЗДАТЬ
            │   └── index.ts                                 # ИЗМЕНИТЬ
            └── components/
                ├── ReportsTabs/                             # ИЗМЕНИТЬ: модель вместо URL-мока
                ├── IncomeHistory/ (+ components/*)          # ИЗМЕНИТЬ: модель вместо моков, удалить мок-файлы
                ├── FinancialStatistics/IncomeCards/         # ИЗМЕНИТЬ: ссылка через tabChanged
                └── ReportsLessonDialogs/                    # УДАЛИТЬ ЦЕЛИКОМ
```

**Structure Decision**: веб-монорепо, затронуты оба пакета. Бэкенд:
слоёный MVC, новый модуль один — `services/incomeHistory/` с контроллером
в `controllers/statistics/` (эндпоинт живёт рядом со статистикой и делит
с ней `getDateRange` и `paidInRangeWhere`). Фронт: FSD, UI на местах после
макетов; новые модули — три модели в `pages/ReportsPage/model/` и общий
`features/lessons/ui/LessonDialogs/` (research R15).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `loadNextPageFx.pending` не добавлен в глобальный `$isBlocking` (конвенция «Loading Indicators») | FR-013c: «во время загрузки порции кнопка показывает состояние загрузки… без общего блокирующего индикатора страницы» | Оверлей закрыл бы список, который репетитор листает, и сбил бы ощущение «дописалось без сдвига» (US1 сц. 13); спека требует обратного явно |
