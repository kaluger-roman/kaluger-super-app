# Implementation Plan: Гибкая ставка налога по периодам

**Branch**: `027-tax-rate-periods` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-tax-rate-periods/spec.md`

## Summary

Заменяем единственное поле `User.taxRate` на цепочку периодов налоговых ставок
(`TaxRatePeriod`), плюс отдельный тумблер `User.taxEnabled` для управления тем,
включён ли вообще учёт налога. Расчёт `taxAmount` на странице статистики
переходит с одиночного множителя на пер-урочный: для каждого оплаченного
урока в выбранном диапазоне (по `paymentDate`) ищется ставка периода,
к которому относится дата оплаты; если оплата раньше самого раннего периода —
ставка 0%. Управление периодами — отдельный модальный диалог из профиля.
Карточка налога на отчётах: при единственной попавшей ставке — подпись
с процентом, при нескольких — нейтральная подпись с info-иконкой,
по клику тултип со строчной разбивкой `X% × Y ₽ = Z ₽`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) — фронт и бек
**Primary Dependencies**:
- Frontend: React 18, Effector, Material UI, styled-components, Vitest, RTL, MSW
- Backend: Express, Prisma 5+, web-push, Jest, Supertest

**Storage**: PostgreSQL через Prisma ORM
- Новая таблица `tax_rate_periods` (`userId, startDate, rate, createdAt, updatedAt`)
- Новое поле `users.taxEnabled BOOLEAN DEFAULT false`
- Поле `users.taxRate` удаляется в той же миграции после переноса данных в `tax_rate_periods`

**Testing**:
- Backend: Jest + Supertest + реальная тестовая БД (без моков Prisma)
- Frontend: Vitest + React Testing Library + MSW; Effector-сторы тестируются через `fork`

**Target Platform**: Web (SPA + REST API). PWA уже работает, новые поля совместимы.

**Project Type**: Web — монорепо с независимыми `frontend/` и `backend/`.

**Performance Goals**:
- `/api/statistics` сохраняет p95 ≤ 500 мс на типичном пользователе (~1000 уроков)
- CRUD по `/api/tax-periods` отвечает ≤ 100 мс p95
- Модалка периодов открывается мгновенно (данные приходят с `/api/profile`)

**Constraints**:
- Миграция атомарная: создание таблицы, перенос данных, удаление `User.taxRate` —
  всё в одной Prisma-миграции (`migration.sql`)
- Не ломать существующее поведение для пользователей с явно заданной ставкой
  (миграция переносит их в `taxEnabled=true` + один период)
- Все сообщения об ошибках на русском языке (FR-014)
- Соблюдать архитектурные слои FSD на фронте и MVC на беке

**Scale/Scope**:
- ~единицы периодов на пользователя в типичном кейсе, до ~10 в худшем
- Существующая база пользователей небольшая (single-host VPS), миграция
  не требует foreground/background-разделения

## Constitution Check

*GATE: проверка перед Phase 0; повторная проверка после Phase 1.*

| Принцип конституции | Соответствие | Комментарий |
|---|---|---|
| I. Feature-Sliced Design | ✅ | Новый слой `entities/taxRatePeriod` (модель + типы), `features/taxRatePeriods` (модалка, форма редактирования), `pages/profile` уже существует — туда добавляется кнопка и тумблер. Импорты строго вниз. |
| II. Layered MVC (Backend) | ✅ | Routes → Controllers → Services → Prisma. Новый контроллер `controllers/taxPeriods/`, сервис `services/taxRate.ts` с пер-уроком расчётом + вспомогательным резолвером периода. |
| III. Effector | ✅ | Новые сторы (`$periods`, `$isModalOpen`, `$taxEnabled`) и эффекты (`loadPeriodsFx`, `savePeriodsFx`); связи только через `sample`, без `useState` для формы. |
| IV. Type Safety | ✅ | Все типы — через `type` и Prisma-сгенерированные. Используем DTO-типы из `backend/src/types`. |
| V. Code Consistency | ✅ | Компоненты ≤150 строк (модалка декомпозируется на список + строку периода), модели ≤200, контроллеры ≤150. Без `style={{}}`. |
| VI. Testing Discipline | ✅ | Покрываем: сервис расчёта налога (unit), CRUD-контроллеры (integration с реальной БД), модель попапа (Effector через `fork`), компонент карточки налога с тултипом (RTL). |
| VII. Simplicity | ✅ | Не вводим feature-flag — фича просто раскатывается. Не пишем абстракции "TaxStrategy". Прямой пер-уроком расчёт. |

**Решение по миграции `User.taxRate`**: поле удаляется в той же миграции
сразу после переноса данных в `tax_rate_periods`. Конституция VII
(Simplicity) запрещает «speculative future-proofing» и backwards-compat шины;
держать мёртвое поле «на всякий случай» — именно это.

**Constitution gate**: пройден без отклонений.

## Project Structure

### Documentation (this feature)

```text
specs/027-tax-rate-periods/
├── spec.md              # Feature specification (готова)
├── plan.md              # ← этот файл
├── research.md          # Phase 0 — архитектурные решения
├── data-model.md        # Phase 1 — Prisma + типы
├── contracts/
│   ├── tax-periods.openapi.yaml      # CRUD для периодов
│   └── statistics-extension.md       # Изменения в /api/statistics
├── quickstart.md        # Phase 1 — пошаговая инструкция реализации
├── checklists/
│   └── requirements.md
└── tasks.md             # будет создан /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                       # +TaxRatePeriod, +User.taxEnabled, −User.taxRate
│   └── migrations/
│       └── <ts>_tax_rate_periods/          # AddTable + AddColumn + DataMigrate + DropColumn
├── src/
│   ├── routes/
│   │   └── taxPeriods.ts                   # /api/tax-periods (GET, POST, PATCH/:id, DELETE/:id)
│   ├── controllers/
│   │   └── taxPeriods/
│   │       ├── index.ts                    # public API barrel
│   │       ├── listTaxPeriods.ts
│   │       ├── createTaxPeriod.ts
│   │       ├── updateTaxPeriod.ts
│   │       ├── deleteTaxPeriod.ts
│   │       └── __tests__/                  # integration tests на каждый
│   ├── controllers/auth.ts                 # ✏ updateProfile: добавить taxEnabled
│   ├── controllers/statistics/
│   │   └── getStatistics.ts                # ✏ заменить расчёт taxAmount на сервис
│   ├── services/
│   │   ├── taxRate.ts                      # resolveRate(date, periods), calcTax(...)
│   │   ├── taxRate.breakdown.ts            # сборка структуры для info-tooltip
│   │   └── __tests__/                      # unit-тесты (на тестовой БД, но пер-функциональные)
│   ├── types/
│   │   └── index.ts                        # +TaxRatePeriodDto, +TaxBreakdownEntry
│   └── lib/
│       └── prisma.ts                       # без изменений
└── ...
frontend/
├── src/
│   ├── shared/
│   │   ├── api/
│   │   │   └── taxPeriods.ts               # axios-клиент для CRUD
│   │   └── types/
│   │       └── index.ts                    # +TaxRatePeriod, +TaxBreakdownEntry
│   ├── entities/
│   │   └── taxRatePeriod/
│   │       ├── model/
│   │       │   ├── tax-rate-period.model.ts# $periods, $taxEnabled, loadPeriodsFx
│   │       │   └── __tests__/
│   │       ├── types.ts
│   │       └── index.ts
│   ├── features/
│   │   └── taxRatePeriods/
│   │       ├── ui/
│   │       │   ├── TaxRatePeriodsModal/
│   │       │   │   ├── TaxRatePeriodsModal.tsx
│   │       │   │   ├── TaxRatePeriodsModal.styled.ts
│   │       │   │   └── __tests__/
│   │       │   ├── TaxRatePeriodRow/       # одна строка списка
│   │       │   └── TaxRateInfoTooltip/     # info-iconка для отчётов
│   │       ├── model/
│   │       │   ├── tax-rate-periods-modal.model.ts
│   │       │   └── __tests__/
│   │       └── index.ts
│   ├── pages/
│   │   ├── profile/
│   │   │   ├── ProfilePage.tsx             # ✏ +тумблер +кнопка модалки
│   │   │   └── models/
│   │   │       ├── profile.model.ts        # ✏ +taxEnabled, удаление taxRateInput
│   │   │       └── __tests__/
│   │   └── ReportsPage/
│   │       └── components/
│   │           └── FinancialStatistics/
│   │               ├── FinancialStatistics.tsx  # ✏ карточка налога с info-iconкой
│   │               └── __tests__/
│   └── ...
└── ...
```

**Structure Decision**: Web monorepo c существующей FSD-структурой и MVC-беком.
Все новые модели, фичи и сервисы добавляются в соответствующие слои.
Никаких новых пакетов, runtime-зависимостей или подкаталогов верхнего уровня
не требуется.

## Complexity Tracking

> Заполняется ТОЛЬКО при отклонении от конституции.

Отклонений нет — таблица не используется.
