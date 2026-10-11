# Implementation Plan: Уроки без налога

**Branch**: `034-tax-exempt-lessons` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-tax-exempt-lessons/spec.md`

## Summary

У урока появляется хранимый признак «Не облагается налогом»
(`Lesson.isTaxExempt`, `BOOLEAN NOT NULL DEFAULT false`). Репетитор
переключает его в попапе урока (сохраняется сразу, как оплата и ДЗ)
и в форме создания и редактирования. Регулярное занятие, созданное
с признаком, ставит его всем урокам серии, а ночное продление серии
наследует признак от последнего урока, как стоимость. Изменение у одного
урока серии меняет только этот урок. В статистике оплаты необлагаемых
уроков исключаются из налоговой базы до расчёта по периодам ставок
и показываются отдельной строкой в тултипе карточки налога; все
показатели дохода и комиссий не меняются. В списке уроков и в календаре
у помеченных уроков стоит значок с подсказкой. Всё налоговое скрыто,
пока учёт налога в профиле выключен.

**Технический подход.** Новых эндпоинтов, WS-событий и зависимостей
нет. Признак идёт существующими `POST/PUT /api/lessons` (сервис
обновления уже пробрасывает `...updateData` в Prisma, нужна только
валидация типа). Расчёт налога: в `computeTaxSummary` оплаты делятся
на облагаемые (идут в неизменный `buildTaxBreakdown`) и необлагаемые
(сумма в копейках → `taxExemptIncome`). При разборе кода найден
баг, который фича задела бы напрямую: любой `PUT` без `status` переводит
**прошедший** отменённый урок в `COMPLETED`. Переключатель в попапе
доступен у отменённых уроков, поэтому порядок проверок в
`computeUpdatedStatus` исправляется и закрывается регрессионным тестом
(research R5).

**Фронтенд собран на этапе макетов и утверждён.** `TaxExemptBadge`,
`TaxExemptStatus`, строка в `TaxRateInfoTooltip`, `useIsTaxEnabled`,
`useTooltipTrigger` стоят в финальных местах; признак замокан
(«благотвор» в заметках), сумма в статистике захардкожена. Оставшаяся
работа на фронте: типы контракта, Effector-событие для попапа, поле
в модели формы, **замена чекбокса в форме на переключатель (правка
пользователя после макетов)**, снос моков и 10 маркеров
`TODO(auto-feature)`, тесты всего добавленного на этапе макетов
и проверка контраста первой строки тултипа налога.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, patronum, Material UI (styled API) — frontend; Express, Prisma — backend. Новых зависимостей нет
**Storage**: PostgreSQL через Prisma. Одна новая колонка `lessons."isTaxExempt" BOOLEAN NOT NULL DEFAULT false`
**Testing**: Vitest + RTL + MSW (frontend); Jest + Supertest + реальная тестовая БД (backend); Playwright (e2e)
**Target Platform**: Web SPA, десктоп и мобильная ширина (375px)
**Project Type**: web (монорепо frontend + backend, затронуты оба)
**Performance Goals**: ноль новых запросов. Статистика читает признак из уже существующей выборки `paidLessonsForTax` (+1 колонка в `select`)
**Constraints**: налог по облагаемым оплатам не меняется ни на копейку (SC-001, SC-002); показатели дохода и комиссий неизменны (SC-003); признак не уходит в кабинет ученика (FR-022); статус отменённого урока не меняется при правке признака; без `<form>`, без `useEffect` для загрузки данных, без inline-стилей; компоненты < 150 строк, контроллеры < 150; тексты и ошибки на русском
**Scale/Scope**: 1 миграция; правки в 2 валидаторах, 2 сервисах создания, cron, хелпере статуса, сервисе статистики, test-support роуте; на фронте 2 типа, 1 событие в модели, модель/хелперы формы, 1 новый презентационный компонент (`TaxExemptSwitch`) вместо `TaxExemptCheckbox`, 6 компонентов отвязываются от моков, 2 новых e2e

**Unknowns**: нет. Две развилки спеки закрыты в Clarifications, решения
реализации разобраны в [research.md](./research.md) (R1–R19).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Feature-Sliced Design**: PASS. `TaxExemptBadge` в `shared/ui`
  (используется `features/lessons` и `pages/lessons`) и флаг профиля
  не читает: гейтинг через `useIsTaxEnabled` из `entities/user` делают
  вызывающие слои. `TaxExemptSwitch` и `TaxExemptStatus` в
  `features/lessons/ui`, строка тултипа в `features/taxRatePeriods`,
  карточка в `pages/ReportsPage`. Импорты только вниз, без deep-импортов.
- **II. Layered MVC (Backend)**: PASS. Валидация в
  `controllers/lessons/*validators.ts`; запись в `services/lessonCreation`,
  `services/lessonUpdate`, `services/recurringLessons.ts`; расчёт
  в `services/statistics`. Чистая `services/taxRate.ts` не меняется.
- **III. Effector State Management**: PASS. Попап: событие
  `lessonTaxExemptChanged` → `sample` → `lessonModel.updateLesson`;
  форма: поле в `$formData`. Компоненты только `useUnit`, без `useState`
  для доменных данных, без `.watch`.
- **IV. Type Safety**: PASS. `type`, `import type`, без `any`; бэкенд-типы
  в `types/lesson.ts` и `services/statistics/statistics.types.ts`,
  фронт в `shared/types/{lesson,statistics}.ts`.
- **V. Code Consistency**: PASS. Named exports, function expressions,
  `index.ts` в новой папке `TaxExemptSwitch/`, `*.styled.ts` /
  `*.constants.ts` отдельно, тексты на русском.
- **VI. Testing Discipline**: PASS после задач тестирования. Тестов
  требует и новая логика, и всё, что добавлено на этапе макетов
  (`TaxExemptBadge`, `useTooltipTrigger`, `useIsTaxEnabled`,
  `TaxExemptStatus`, строка тултипа); найденный баг статуса закрывается
  регрессионным тестом.
- **VII. Simplicity**: PASS. Ноль новых эндпоинтов, WS-событий
  и зависимостей; одна колонка без индекса; расчёт налога меняется
  разделением входа одной функции.

**Post-Design re-check (после Phase 1)**: без изменений. Контракты
([contracts/README.md](./contracts/README.md)) и модель
([data-model.md](./data-model.md)) не добавили слоёв и зависимостей.
Фикс `computeUpdatedStatus` меняет поведение и вне фичи (форма
и переключатель ДЗ на прошедших отменённых уроках): это исправление
бага в сторону заявленной семантики существующего теста, а не новое
поведение.

## Project Structure

### Documentation (this feature)

```text
specs/034-tax-exempt-lessons/
├── plan.md              # This file
├── spec.md              # Спецификация (утверждена, + Clarifications)
├── research.md          # Phase 0: решения R1–R19
├── data-model.md        # Phase 1: колонка, жизненный цикл, алгоритм налога
├── quickstart.md        # Phase 1: запуск и ручная проверка
├── contracts/
│   └── README.md        # Phase 1: тела/ответы /api/lessons, /api/statistics, WS
├── checklists/
│   └── requirements.md  # (существует)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                   # ИЗМЕНИТЬ: Lesson.isTaxExempt
│   └── migrations/<ts>_add_lesson_tax_exempt/migration.sql  # СОЗДАТЬ
└── src/
    ├── types/lesson.ts                                 # ИЗМЕНИТЬ: CreateLessonDto.isTaxExempt
    ├── controllers/lessons/
    │   ├── validators.ts                               # ИЗМЕНИТЬ: проверка типа + константа сообщения
    │   ├── updateLesson.validators.ts                  # ИЗМЕНИТЬ: та же проверка
    │   └── __tests__/                                  # ИЗМЕНИТЬ/СОЗДАТЬ: lessonTaxExempt.test.ts, validators.test.ts
    ├── services/
    │   ├── lessonCreation/lessonCreation.ts            # ИЗМЕНИТЬ: одиночный и регулярный урок
    │   ├── lessonUpdate/lessonUpdate.helpers.ts        # ИЗМЕНИТЬ: computeUpdatedStatus (баг R5)
    │   ├── recurringLessons.ts                         # ИЗМЕНИТЬ: cron наследует признак
    │   ├── statistics/
    │   │   ├── statistics.ts                           # ИЗМЕНИТЬ: select isTaxExempt
    │   │   ├── statistics.helpers.ts                   # ИЗМЕНИТЬ: split + taxExemptIncome
    │   │   └── statistics.types.ts                     # ИЗМЕНИТЬ: PaidLessonForTax, TaxSummary
    │   ├── taxRate.ts                                  # НЕ ТРОГАТЬ
    │   └── studentCabinet/, studentLessonBroadcast/    # НЕ ТРОГАТЬ, закрыть тестами (FR-022)
    ├── routes/testSupport.ts                           # ИЗМЕНИТЬ: POST /lessons принимает isTaxExempt
    └── controllers/statistics/__tests__/               # СОЗДАТЬ: taxExemptStatistics.test.ts

frontend/
├── e2e/
│   ├── helpers/db.ts                                   # ИЗМЕНИТЬ: LessonSeed.isTaxExempt
│   ├── lessons/tax-exempt-lesson.spec.ts               # СОЗДАТЬ
│   └── reports/tax-exempt-statistics.spec.ts           # СОЗДАТЬ
└── src/
    ├── shared/
    │   ├── types/lesson.ts, statistics.ts              # ИЗМЕНИТЬ: isTaxExempt, taxExemptIncome
    │   ├── lib/tooltipTrigger.hooks.ts                 # СУЩЕСТВУЕТ (макет) + тесты
    │   └── ui/TaxExemptBadge/                          # СУЩЕСТВУЕТ: удалить мок-хелпер и мок-константу, + тесты
    ├── entities/user/user.hooks.ts                     # СУЩЕСТВУЕТ (макет) + тесты
    ├── features/
    │   ├── lessons/
    │   │   ├── models/lessonActions.model.ts           # ИЗМЕНИТЬ: lessonTaxExemptChanged
    │   │   ├── models/lessonForm.model.ts              # ИЗМЕНИТЬ: $formData.isTaxExempt
    │   │   ├── models/lessonForm.helpers.ts            # ИЗМЕНИТЬ: prepareFormData / prepareSubmitData
    │   │   └── ui/
    │   │       ├── TaxExemptSwitch/                    # СОЗДАТЬ: презентационный переключатель (правка пользователя)
    │   │       ├── TaxExemptStatus/                    # ИЗМЕНИТЬ: реальные данные + событие, переиспользует TaxExemptSwitch
    │   │       ├── LessonForm/LessonForm.types.ts      # ИЗМЕНИТЬ: LessonFormData.isTaxExempt
    │   │       ├── LessonForm/components/LessonFormContent.tsx   # ИЗМЕНИТЬ: TaxExemptSwitch вместо чекбокса
    │   │       ├── LessonForm/components/TaxExemptCheckbox/      # УДАЛИТЬ ЦЕЛИКОМ
    │   │       └── LessonsList/components/LessonCard/  # ИЗМЕНИТЬ: lesson.isTaxExempt
    │   └── taxRatePeriods/ui/TaxRateInfoTooltip/       # СУЩЕСТВУЕТ: + тесты, проверка контраста
    └── pages/
        ├── lessons/components/LessonCell/              # ИЗМЕНИТЬ: lesson.isTaxExempt
        └── ReportsPage/components/FinancialStatistics/ # ИЗМЕНИТЬ: statistics.taxExemptIncome; удалить FinancialStatistics.constants.ts
```

**Structure Decision**: веб-монорепо, затронуты оба пакета. Бэкенд:
слоёный MVC, новых модулей нет, правки точечные в существующих сервисах
уроков и статистики. Фронт: FSD, UI уже на местах после макетов; новый
модуль один, `features/lessons/ui/TaxExemptSwitch/`, общий для попапа
и формы (research R14).

## Complexity Tracking

> Нарушений конституции, требующих обоснования, нет.
