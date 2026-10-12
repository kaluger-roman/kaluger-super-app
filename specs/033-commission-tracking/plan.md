# Implementation Plan: Учёт комиссий по ученикам

**Branch**: `033-commission-tracking` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-commission-tracking/spec.md`

## Summary

У ученика появляется разовая сумма комиссии (`Student.commissionAmount`,
`Decimal(10,2)`, `NOT NULL DEFAULT 0`). Первые уроки ученика гасят эту
комиссию: рядом со стоимостью урока показывается сумма, ушедшая в счёт
комиссии — фактическая у завершённых и оплаченных уроков и прогнозная
у предстоящих/неоплаченных. В статистике доходов появляются два новых
показателя: «Списано в счёт комиссий» за период (по дате оплаты) и
«Осталось погасить комиссий» — снимок на текущий момент, вынесенный
вместе с существующей «Предоплатой» в новую период-независимую группу.
«Заработок» и налог не меняются ни на копейку.

**Технический подход.** Зачёт нигде не хранится: одна чистая функция
`allocateCommission` (`backend/src/utils/commission.ts`) раскладывает
сумму комиссии по урокам ученика в два прохода (факт → прогноз),
в целых копейках, хронологически по `startTime` с tie-break по `id`.
Сервис `backend/src/services/commission/` батч-загружает уроки учеников
с ненулевой комиссией одним запросом и обогащает ответы трёх потребителей:
списка уроков, списка/карточки ученика и статистики. Если у репетитора
нет ни одного ученика с ненулевой комиссией, дополнительные запросы
не выполняются и в ответах не появляется ни одного нового поля —
это техническая гарантия FR-003.

**Фронтенд уже собран на этапе макетов и утверждён пользователем.**
В финальных местах кода лежат готовые компоненты `CommissionBadge`,
`CommissionProgress`, `CommissionField`, `CommissionCards`,
`PeriodIndependentStats`; типы `Lesson.commissionCredit`,
`Student.commission*` и `Statistics.commission*` уже объявлены в
`frontend/src/shared/types/` — это и есть зафиксированный контракт API.
Оставшаяся фронтовая работа — не новый UI, а: подключение
`commissionAmount` к Effector-модели формы ученика (сейчас поле
write-only и нигде не сохраняется), guard валидации отрицательного
значения, параметр копеек у `formatCurrency`, перезагрузка списков после
мутаций, удаление временной страницы макетов с маршрутом и временным
ре-экспортом, снятие всех 18 маркеров `TODO(auto-feature)` и полное
тестовое покрытие (у новых компонентов тестов сейчас нет).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, Material UI (styled-components API),
`@mui/icons-material` (`Handshake` / `HandshakeOutlined`) — frontend;
Express, Prisma — backend. **Новых runtime-зависимостей нет.**
**Storage**: PostgreSQL через Prisma. Одна новая колонка:
`students.commissionAmount DECIMAL(10,2) NOT NULL DEFAULT 0`.
Производные величины не хранятся (research R2).
**Testing**: Vitest + RTL + MSW (frontend); Jest + Supertest + реальная
тестовая БД (backend); Playwright (e2e)
**Target Platform**: Web SPA — десктоп и мобильная ширина (375px)
**Project Type**: web (монорепо frontend + backend; затронуты оба)
**Performance Goals**: расчёт зачёта не добавляет N+1 — один
`findMany` на весь набор учеников страницы (research R7); для
репетитора без комиссий дополнительных запросов нет вообще
**Constraints**: точность до копеек с отклонением 0 ₽ (SC-003, SC-010) —
арифметика в целых копейках; «Заработок» и налог неизменны (FR-011,
SC-004); данные комиссии не выходят в кабинет ученика (FR-015);
без inline-стилей; компоненты < 150 строк, модели < 200, контроллеры < 150;
UI-текст и ошибки на русском
**Scale/Scope**: 1 миграция; 1 чистая утилита + 1 сервис на бэке;
обогащение 3 ответов API; на фронте 5 уже существующих компонентов
подключаются к реальным данным, 1 Effector-модель расширяется,
1 временная страница удаляется

**Unknowns**: нет. Спека утверждена без маркеров `[NEEDS CLARIFICATION]`;
все решения, оставленные реализации, разобраны в
[research.md](./research.md) (R1–R13).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Feature-Sliced Design**: PASS. `CommissionBadge` / `CommissionProgress`
  живут в `shared/ui` (переиспользуются уроками и учениками),
  `CommissionField` — в `features/students`, `CommissionCards` /
  `PeriodIndependentStats` — в `pages/ReportsPage`. Импорты только вниз.
  Временный ре-экспорт `LessonCard` из `features/lessons/ui/index.ts`
  расширяет публичный API слоя ради страницы макетов — **это нарушение,
  и оно снимается отдельной задачей очистки** (research R12).
- **II. Layered MVC (Backend)**: PASS с оговоркой. Чистый аллокатор —
  в `utils/` (без Prisma и побочных эффектов), работа с БД — в
  `services/commission/`. Оговорка: у учеников исторически нет сервисного
  слоя, контроллеры ходят в Prisma напрямую. Мы **не** переписываем этот
  слой целиком (вне рамок фичи), но новую логику в контроллер не кладём —
  контроллеры только вызывают `attachCommissionToStudents` из сервиса.
- **III. Effector State Management**: PASS. `commissionAmount` входит
  в `$formData` формы ученика; валидация — guard'ом в модели через
  `sample` + `filter`, по образцу уже существующей проверки имени.
  Никакого `useState` для доменных данных, только `sample` и `useUnit`.
- **IV. Type Safety**: PASS. `type`, `import type`, без `any`.
  Бэкендные типы — в `backend/src/types/student.ts` и
  `backend/src/types/lesson.ts` (конвенция «shared types split by domain»),
  фронтовые — в `frontend/src/shared/types/` (уже объявлены).
- **V. Code Consistency**: PASS. Named exports, function expressions,
  `index.ts` в каждой папке, разнесение `*.constants.ts` / `*.helpers.ts` /
  `*.types.ts`, без inline-стилей, тексты на русском.
- **VI. Testing Discipline**: PASS **после** выполнения задач тестирования.
  Критично: у пяти уже написанных компонентов комиссии тестов **нет**
  вовсе — покрытие входит в definition of done, а не в следующий PR.
  Бэкендный аллокатор покрывается юнит-тестами без БД, ответы API —
  интеграционными на реальной тестовой БД (Prisma не мокаем).
- **VII. Simplicity**: PASS. Ноль новых зависимостей, ноль хранимых
  денормализаций, ноль feature-флагов. Единственная новая абстракция —
  чистый аллокатор, который переиспользуется всеми тремя потребителями
  (правило «извлекаем при 2+ использованиях» выполнено).

**Post-Design re-check (после Phase 1)**: без изменений — контракты
из `contracts/` и модель данных не добавили ни новых слоёв, ни новых
зависимостей. Нарушение по временному ре-экспорту `LessonCard` остаётся
известным и адресовано задачей очистки; после неё Constitution Check
чистый.

## Project Structure

### Documentation (this feature)

```text
specs/033-commission-tracking/
├── plan.md              # This file (/speckit.plan output)
├── spec.md              # Feature specification (утверждена пользователем)
├── research.md          # Phase 0 output — решения R1–R13
├── data-model.md        # Phase 1 output — сущности и алгоритм
├── quickstart.md        # Phase 1 output — как поднять и проверить
├── contracts/           # Phase 1 output — контракты трёх затронутых ответов
│   └── README.md
├── checklists/
│   └── requirements.md  # (существует)
└── tasks.md             # Phase 2 output (/speckit.tasks — НЕ здесь)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                  # ИЗМЕНИТЬ: Student.commissionAmount
│   └── migrations/2026…_add_student_commission/
│       └── migration.sql                              # СОЗДАТЬ: ADD COLUMN … NOT NULL DEFAULT 0
└── src/
    ├── utils/
    │   ├── commission.ts                              # СОЗДАТЬ: чистый allocateCommission (копейки, 2 прохода)
    │   └── __tests__/commission.test.ts               # СОЗДАТЬ: юнит-тесты всех edge cases спеки
    ├── services/
    │   ├── commission/                                # СОЗДАТЬ
    │   │   ├── commission.ts                          #   attachCommissionToLessons / attachCommissionToStudents
    │   │   ├── commission.helpers.ts                  #   батч-загрузка уроков, группировка по studentId
    │   │   ├── commission.types.ts                    #   входные/выходные формы
    │   │   ├── index.ts
    │   │   └── __tests__/commission.test.ts           #   интеграционные (реальная тестовая БД)
    │   ├── lessonsQuery/lessonsQuery.ts               # ИЗМЕНИТЬ: маппер, навешивающий commissionCredit
    │   ├── statistics/
    │   │   ├── statistics.ts                          # ИЗМЕНИТЬ: 3 новых показателя
    │   │   ├── statistics.helpers.ts                  # ИЗМЕНИТЬ: расчёт списаний/остатка (повторно использует paidInRangeWhere-базу дат)
    │   │   └── statistics.types.ts                    # ИЗМЕНИТЬ: LessonStatistics += 3 поля
    │   ├── index.ts                                   # ИЗМЕНИТЬ: экспорт сервиса commission
    │   └── studentCabinet/                            # НЕ ТРОГАТЬ (FR-015), покрыть тестом на отсутствие полей
    ├── controllers/students/
    │   ├── validators.ts                              # ИЗМЕНИТЬ: валидация + нормализация commissionAmount
    │   ├── getStudents.ts                             # ИЗМЕНИТЬ: обогащение repaid/remaining
    │   ├── createStudent.ts                           # ИЗМЕНИТЬ: запись + обогащение ответа
    │   └── updateStudent.ts                           # ИЗМЕНИТЬ: запись + обогащение ответа
    └── types/
        ├── student.ts                                 # ИЗМЕНИТЬ: CreateStudentDto += commissionAmount
        └── lesson.ts                                  # ИЗМЕНИТЬ: тип CommissionCredit (зеркало фронта)

frontend/src/
├── shared/
│   ├── types/{lesson,student,statistics}.ts           # ИЗМЕНИТЬ: снять TODO(auto-feature)
│   ├── lib/lib.helpers.ts                             # ИЗМЕНИТЬ: formatCurrency + опция копеек
│   └── ui/
│       ├── CommissionBadge/                           # СУЩЕСТВУЕТ + ДОБАВИТЬ __tests__/
│       └── CommissionProgress/                        # СУЩЕСТВУЕТ + ДОБАВИТЬ __tests__/
├── features/
│   ├── students/
│   │   ├── models/studentForm.model.ts                # ИЗМЕНИТЬ: commissionAmount в $formData + guard валидации
│   │   ├── models/studentForm.helpers.ts              # ИЗМЕНИТЬ: prepareEmpty/ForEdit/Create/Update
│   │   └── ui/StudentForm/
│   │       ├── StudentForm.types.ts                   # ИЗМЕНИТЬ: commissionAmount обязателен, снять TODO
│   │       └── CommissionField/                       # СУЩЕСТВУЕТ + ДОБАВИТЬ __tests__/
│   └── lessons/ui/
│       ├── index.ts                                   # ИЗМЕНИТЬ: убрать временный ре-экспорт LessonCard
│       ├── LessonsList/components/LessonCard/         # ИЗМЕНИТЬ: снять TODO + обновить тесты
│       └── LessonViewDialog/LessonDetails/            # ИЗМЕНИТЬ: снять TODO + обновить тесты
├── pages/
│   ├── index.ts                                       # ИЗМЕНИТЬ: убрать экспорт CommissionMockupPage
│   ├── CommissionMockupPage/                          # УДАЛИТЬ ЦЕЛИКОМ (13 файлов)
│   ├── students/components/StudentCard/               # ИЗМЕНИТЬ: снять TODO + тесты
│   └── ReportsPage/components/FinancialStatistics/
│       ├── CommissionCards/                           # СУЩЕСТВУЕТ + ДОБАВИТЬ __tests__/
│       ├── PeriodIndependentStats/                    # СУЩЕСТВУЕТ + ДОБАВИТЬ __tests__/
│       └── IncomeCards/                               # ИЗМЕНИТЬ: добить мёртвый код после переноса «Предоплаты»
└── app/components/AppRoutes/
    ├── AppRoutes.tsx                                  # ИЗМЕНИТЬ: убрать маршрут макетов
    └── AppRoutes.constants.ts                         # ИЗМЕНИТЬ: убрать lazy-импорт макетов
```

**Structure Decision**: веб-монорепо, затронуты оба пакета. Бэкенд —
слоёный MVC с новой чистой утилитой в `utils/` и новым сервисом
`services/commission/`; фронт — FSD, где вся UI-часть уже стоит в
финальных местах после этапа макетов, а работа сводится к подключению
данных, Effector-обвязке, очистке временного кода и тестам.

## Complexity Tracking

> Нарушений конституции, требующих обоснования, нет.

Единственное отступление — временный ре-экспорт `LessonCard` из
`frontend/src/features/lessons/ui/index.ts`, добавленный на этапе макетов
и расширяющий публичный API слоя. Это не архитектурное решение фичи,
а остаток строительных лесов: он удаляется вместе со страницей макетов
отдельной задачей (research R12), и после неё отступлений не остаётся.
