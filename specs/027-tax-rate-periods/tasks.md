---

description: "Tasks for feature 027-tax-rate-periods"
---

# Tasks: Гибкая ставка налога по периодам

**Input**: Design documents from `/specs/027-tax-rate-periods/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Включены — CLAUDE.md обязывает покрывать нового кода тестами; никакого «отложим тесты в следующий PR» (Constitution VI).

**Organization**: Задачи сгруппированы по пользовательским историям, каждая история независимо тестируема.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей).
- **[Story]**: к какой User Story относится задача (US1, US2, US3); фазы Setup/Foundational/Polish без метки.
- В описании — точный путь.

## Path Conventions

Web monorepo: `backend/src/`, `frontend/src/` относительно корня worktree
`/Volumes/Samsung_T5/Projects/kaluger-super-app/.claude/worktrees/027-tax-rate-periods/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Никаких новых пакетов/тулинга не вводим; проект уже инициализирован.
Этой фазы хватает на одну верификационную задачу.

- [X] T001 Подтвердить, что worktree рабочий: запустить `npm install` в `backend/` и `frontend/`, убедиться, что `npm run lint` (frontend) и `npm test` (backend, frontend) стартуют без ошибок до изменений

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Расширение Prisma-схемы, миграция данных и общие типы.
Без завершения этого этапа ни одна история не двигается.

**⚠️ CRITICAL**: ни одна задача US1/US2/US3 не стартует, пока T002..T008 не выполнены.

- [X] T002 Обновить `backend/prisma/schema.prisma`: добавить `User.taxEnabled Boolean @default(false)`, добавить связь `User.taxRatePeriods TaxRatePeriod[]`, удалить `User.taxRate`, добавить новую модель `TaxRatePeriod` с `@@unique([userId, startDate])` и `@@index([userId, startDate])` (см. data-model.md)
- [X] T003 Сгенерировать миграцию: из `backend/` выполнить `npm run db:migrate -- --create-only --name tax_rate_periods`, проверить созданный файл `backend/prisma/migrations/<ts>_tax_rate_periods/migration.sql`
- [X] T004 Дополнить `backend/prisma/migrations/<ts>_tax_rate_periods/migration.sql` data-частью (INSERT seed-периодов для пользователей с `taxRate <> 6.0`, UPDATE `taxEnabled = true` для них) и завершить шагом `ALTER TABLE "users" DROP COLUMN "taxRate"` — см. quickstart.md шаг 1.2
- [X] T005 Применить миграцию: `npm run db:migrate` (dev) и `npm run db:migrate:test` (тестовая БД); подтвердить, что `npm run db:generate` собирает клиент без `taxRate` на `User`
- [X] T006 [P] Расширить `backend/src/types/index.ts`: добавить `TaxRatePeriodDto`, `TaxBreakdownEntry`; обновить тип ответа статистики (`taxAmount: number | null`, `taxBreakdown: TaxBreakdownEntry[] | null`); удалить любые упоминания `taxRate` поля у `User`
- [X] T007 [P] Расширить `frontend/src/shared/types/index.ts`: добавить `TaxRatePeriod`, `TaxBreakdownEntry`, обновить тип `User` (`taxEnabled: boolean`, удалить `taxRate`), обновить тип `Statistics` (`taxAmount`, `taxBreakdown`); проверить, что нигде не остаётся ссылок на `user.taxRate`
- [X] T008 Проверить компиляцию: `npm run build` в `backend/`, `npx tsc --noEmit` в `frontend/`. Тесты на этом этапе уйдут в красное (так и должно быть до US1/US2)

**Checkpoint**: Миграция применена, типы расширены — фаза US1 разблокирована.

---

## Phase 3: User Story 1 — Тумблер «Учитывать налог» + попап управления периодами (Priority: P1) 🎯 MVP

**Goal**: Репетитор включает учёт налога, в попапе редактирует список
налоговых периодов (CRUD), сохраняет; при выключенном тумблере в системе
нет ни кнопки «Настроить ставки», ни карточки налога. Покрывает FR-001..FR-014, FR-022..FR-023.

**Independent Test**: см. spec.md User Story 1 — открыть профиль нового
пользователя (тумблер OFF, нет UI налога), включить тумблер, добавить
два периода в попапе, сохранить — на сервере периоды появились,
профиль возвращает `taxEnabled=true`.

### Tests for User Story 1 (написать ДО реализации, должны изначально падать)

- [X] T009 [P] [US1] Integration-тест `backend/src/controllers/taxPeriods/__tests__/listTaxPeriods.test.ts`: 401 без токена; пустой массив для пользователя без периодов; отсортированный по `startDate ASC` массив для пользователя с периодами
- [X] T010 [P] [US1] Integration-тест `backend/src/controllers/taxPeriods/__tests__/createTaxPeriod.test.ts`: 201 на корректные данные; 400 на дубликат `startDate`; 400 на `rate < 0` и `rate > 100`; 401 без токена
- [X] T011 [P] [US1] Integration-тест `backend/src/controllers/taxPeriods/__tests__/updateTaxPeriod.test.ts`: 200 при правке только rate; 200 при правке только startDate; 400 на дубликат; 404 на чужой период; 400 на rate вне диапазона
- [X] T012 [P] [US1] Integration-тест `backend/src/controllers/taxPeriods/__tests__/deleteTaxPeriod.test.ts`: 204 успех; 400 «нельзя удалить последний при `taxEnabled=true`»; 204 разрешено удалить последний при `taxEnabled=false`; 404 на чужой период
- [X] T013 [US1] Расширить `backend/src/controllers/__tests__/auth.test.ts` (или соответствующий existing-файл) кейсами `updateProfile`: успешное включение `taxEnabled=true` при наличии периодов; 400 «добавьте хотя бы один период» при попытке включить без периодов; успешное выключение независимо от периодов
- [X] T014 [P] [US1] Тесты Effector-модели сущности `frontend/src/entities/taxRatePeriod/model/__tests__/tax-rate-period.model.test.ts` через `fork`: загрузка `loadPeriodsFx`, заполнение `$periods`, обработка ошибок
- [X] T015 [P] [US1] Тесты Effector-модели попапа `frontend/src/features/taxRatePeriods/model/__tests__/tax-rate-periods-modal.model.test.ts`: snapshot при `modalOpened`, добавление/удаление/правка строки в `$draftPeriods`, отмена сбрасывает draft, save вызывает корректные api-методы (создать новые, обновить изменившиеся, удалить отсутствующие)
- [X] T016 [P] [US1] RTL-тесты модалки `frontend/src/features/taxRatePeriods/ui/TaxRatePeriodsModal/__tests__/TaxRatePeriodsModal.test.tsx`: рендер списка строк, добавление новой строки кликом, кнопка «Сохранить» disabled когда draft пустой, корректный вызов событий
- [X] T017 [US1] RTL-тест `frontend/src/pages/profile/__tests__/ProfilePage.test.tsx` (расширить): рендер `Switch` для `taxEnabled`; при `taxEnabled=true` — видна кнопка «Настроить ставки», по клику — открыт попап; при `taxEnabled=false` — кнопка скрыта
- [X] T018 [US1] Обновить тесты `frontend/src/pages/profile/models/__tests__/profile.model.test.ts` под новую модель (без `taxRateInput`, с `taxEnabled` событием/стором)

### Implementation for User Story 1

#### Backend

- [X] T019 [P] [US1] Реализовать `backend/src/controllers/taxPeriods/listTaxPeriods.ts` (GET, sort `startDate ASC`)
- [X] T020 [P] [US1] Реализовать `backend/src/controllers/taxPeriods/createTaxPeriod.ts` (POST: валидация rate, парсинг startDate, обработка `P2002` → 400 «Период с такой датой начала уже существует»)
- [X] T021 [P] [US1] Реализовать `backend/src/controllers/taxPeriods/updateTaxPeriod.ts` (PATCH /:id: ownership через JWT, валидации, `P2002` → 400)
- [X] T022 [P] [US1] Реализовать `backend/src/controllers/taxPeriods/deleteTaxPeriod.ts` (DELETE /:id: проверка `taxEnabled` пользователя и количества периодов; 400 «Нельзя удалить последний период при включённом учёте налога»)
- [X] T023 [US1] Создать barrel `backend/src/controllers/taxPeriods/index.ts` (re-exports listTaxPeriods, createTaxPeriod, updateTaxPeriod, deleteTaxPeriod)
- [X] T024 [US1] Создать роут `backend/src/routes/taxPeriods.ts` (Router(), все эндпоинты под `authenticateToken`); зарегистрировать `app.use('/api/tax-periods', taxPeriodsRouter)` в существующем app/index файле
- [X] T025 [US1] Модифицировать `backend/src/controllers/auth.ts` (или текущий файл `updateProfile`): принимать `taxEnabled?: boolean`; при `taxEnabled=true` проверить, что у пользователя есть ≥1 период (иначе 400 «Чтобы включить учёт налога, добавьте хотя бы один период»); возвращать обновлённого пользователя с полем `taxEnabled`
- [X] T026 [US1] Прогнать `npm test` в `backend/`: тесты T009–T013 должны позеленеть

#### Frontend (фронт начинается параллельно с бекендом — после T006/T007 типов)

- [X] T027 [P] [US1] Создать API-клиент `frontend/src/shared/api/taxPeriods.ts` (методы `list`, `create`, `update`, `remove`); добавить в barrel `frontend/src/shared/api/index.ts`
- [X] T028 [P] [US1] Создать сущность `frontend/src/entities/taxRatePeriod/`: `types.ts`, `model/tax-rate-period.model.ts` ($periods, loadPeriodsFx, sample on Gate), `index.ts` (re-exports)
- [X] T029 [P] [US1] Реализовать модель попапа `frontend/src/features/taxRatePeriods/model/tax-rate-periods-modal.model.ts`: $isModalOpen, $draftPeriods, события add/edit/remove, savePeriodsFx (вычисляет дифф draft vs initial и вызывает create/update/delete через taxPeriodsApi)
- [X] T030 [P] [US1] UI-компонент `frontend/src/features/taxRatePeriods/ui/TaxRatePeriodRow/TaxRatePeriodRow.tsx` + `.styled.ts` + `index.ts`: одна строка списка (date-picker, числовое поле rate, иконка-удалить); компонент ≤150 строк
- [X] T031 [US1] UI-компонент `frontend/src/features/taxRatePeriods/ui/TaxRatePeriodsModal/TaxRatePeriodsModal.tsx` + `.styled.ts` + `index.ts`: MUI `<Dialog>`, список `<TaxRatePeriodRow>`, кнопка «+ Добавить период», `<DialogActions>` Отмена / Сохранить (disabled при пустом draft); компонент ≤150 строк (декомпозировать по необходимости)
- [X] T032 [US1] Создать barrel `frontend/src/features/taxRatePeriods/index.ts` с публичным API фичи (модалка + модель)
- [X] T033 [US1] Модифицировать `frontend/src/pages/profile/models/profile.model.ts`: удалить `$taxRateInput` и связанные события/sample-блоки; добавить `$taxEnabled: Store<boolean>`, событие `taxEnabledToggled: Event<boolean>`; в `updateProfileFx` отправлять `taxEnabled` (заменить `taxRate`); добавить sample-связку: при попытке сохранить `taxEnabled=true` без периодов — показать нотификацию и не отправлять
- [X] T034 [US1] Модифицировать `frontend/src/pages/profile/ProfilePage.tsx`: заменить инпут процента на MUI `<Switch checked={taxEnabled}>` для `taxEnabledToggled`; при `taxEnabled=true` — рендерить `<Button>Настроить ставки</Button>` диспатчер `modalOpened`; смонтировать `<TaxRatePeriodsModal />`
- [X] T035 [US1] Прогнать `npm test` в `frontend/`: тесты T014–T018 должны позеленеть

**Checkpoint**: Тумблер + CRUD-попап работают end-to-end. Карточка налога ещё не пересчитывается по периодам (это US2), но управление настроено.

---

## Phase 4: User Story 2 — Корректный пересчёт по дате оплаты + info-iconка (Priority: P1)

**Goal**: Сумма налога на странице статистики считается пер-уроком по
`paymentDate` урока; при единственной попавшей ставке — подпись с процентом;
при нескольких — нейтральная подпись + info-icon с тултипом-разбивкой
(включая строку «вне настроенных периодов» для оплат до самого раннего периода).
Покрывает FR-015..FR-021.

**Independent Test**: см. spec.md User Story 2 acceptance scenarios — создать
тестового пользователя с двумя периодами, оплаты по обе стороны границы,
одна оплата до самого раннего периода → проверить итоговый `taxAmount`,
структуру `taxBreakdown`, рендер карточки и тултипа.

### Tests for User Story 2

- [X] T036 [P] [US2] Unit-тест `backend/src/services/__tests__/taxRate.test.ts`: `resolveRate(date, periods)` для пустых периодов / даты до первого / даты в середине / даты после последнего; `calcLessonTax` округление; `buildTaxBreakdown` корректная агрегация по ставкам, сортировка по `rate ASC`, флаг `isOutsidePeriods`
- [X] T037 [US2] Расширить `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`: пользователь с `taxEnabled=false` → `taxAmount: null, taxBreakdown: null`; два периода + уроки с обеих сторон границы → корректный breakdown; одна оплата до самого раннего периода → строка с `isOutsidePeriods: true`; пустая выборка при `taxEnabled=true` → `taxAmount: 0, taxBreakdown: []`
- [X] T038 [P] [US2] RTL-тест `frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/__tests__/TaxRateInfoTooltip.test.tsx`: рендер info-iconки, открытие тултипа по hover/click, наличие строк `X% × Y ₽ = Z ₽`, суффикс «(вне настроенных периодов)» для `isOutsidePeriods`
- [X] T039 [US2] Расширить `frontend/src/pages/ReportsPage/components/FinancialStatistics/__tests__/FinancialStatistics.test.tsx`: при `taxAmount=null` карточка не рендерится; при `breakdown.length===1` — подпись `Налоги (X%)`, без iconки; при `breakdown.length>1` — нейтральная подпись + iconка

### Implementation for User Story 2

- [X] T040 [P] [US2] Реализовать `backend/src/services/taxRate.ts`: чистые функции `resolveRate(paymentDate, periods)`, `calcLessonTax(price, rate)`, `buildTaxBreakdown(lessons, periods): { taxAmount, taxBreakdown }` — округление ПО УРОКУ, сортировка breakdown по `rate ASC`, признак `isOutsidePeriods` для нулевой строки
- [X] T041 [US2] Модифицировать `backend/src/controllers/statistics/getStatistics.ts`: убрать `taxRate` из `select`; вместо `Math.round(earningsValue * taxRate / 100)` — вытащить уроки `prisma.lesson.findMany({ where: { tutorId, isPaid: true, paymentDate: paymentDateRange, price: { gt: 0 } }, select: { price: true, paymentDate: true } })` (если выгоднее — переиспользовать существующий запрос paymentsInRange, но с `select` вместо `aggregate`); вызвать `buildTaxBreakdown`; если `taxEnabled=false` → `taxAmount: null, taxBreakdown: null`; обеспечить инвариант `taxAmount === sum(entry.tax)`
- [X] T042 [P] [US2] UI-компонент `frontend/src/features/taxRatePeriods/ui/TaxRateInfoTooltip/TaxRateInfoTooltip.tsx` + `.styled.ts` + `index.ts`: MUI `<InfoOutlined>` + `<Tooltip arrow open={controlled}>`; принимает `breakdown: TaxBreakdownEntry[]`; рендерит строки `X% × Y ₽ = Z ₽` + суффикс для `isOutsidePeriods`; управляемое состояние через `useState` + handlers (исключение из правила «без useState» оправдано — это локальный UI-state без бизнес-логики; альтернатива — Effector-стор оверкилл для одного тултипа)
- [X] T043 [US2] Модифицировать `frontend/src/pages/ReportsPage/components/FinancialStatistics/FinancialStatistics.tsx`: пропсы `taxAmount: number | null`, `taxBreakdown: TaxBreakdownEntry[] | null`; ранний return-null если оба null; `breakdown.length===1` → `Налоги ({rate}%)` без iconки; `breakdown.length>1` → `Налоги` + `<TaxRateInfoTooltip />`
- [X] T044 [US2] Обновить место подключения `FinancialStatistics` в `frontend/src/pages/ReportsPage/ReportsPage.tsx`: пробросить новые поля из стора статистики (заменить `taxRate` на `taxAmount`+`taxBreakdown`)
- [X] T045 [US2] Прогнать `npm test` в обоих пакетах: тесты T036–T039 должны позеленеть

**Checkpoint**: Налог на отчётах считается корректно, тултип работает; US1 + US2 вместе формируют полноценный MVP.

---

## Phase 5: User Story 3 — Визуальное выделение текущей ставки и истории (Priority: P3)

**Goal**: В попапе видно, какой период активен сейчас, какие были раньше,
какой назначен на будущее (с подписью «вступит в силу с …»).
Покрывает spec.md User Story 3 (FR-009 уже закрыт, тут чистый UX).

**Independent Test**: открыть попап с тремя периодами (один в прошлом,
один активен, один в будущем) — увидеть визуальное различие.

### Tests for User Story 3

- [X] T046 [US3] Расширить `frontend/src/features/taxRatePeriods/ui/TaxRatePeriodsModal/__tests__/TaxRatePeriodsModal.test.tsx` (или добавить новый файл) кейсами: текущий период имеет визуальный маркер (data-attribute / aria-current); период с будущей датой подписан «вступит в силу с …»

### Implementation for User Story 3

- [X] T047 [US3] Модифицировать `frontend/src/features/taxRatePeriods/ui/TaxRatePeriodRow/TaxRatePeriodRow.tsx`: принимать пропсы `isCurrent`, `isFuture`; визуальное выделение (например, бордер у активного, бледный фон у будущего) через styled-component
- [X] T048 [US3] В `TaxRatePeriodsModal.tsx` вычислять для каждого `DraftPeriod` флаги `isCurrent`/`isFuture` относительно `new Date()` и передавать в `<TaxRatePeriodRow>`; для будущих — рендерить подпись `вступит в силу с {startDate}`

**Checkpoint**: User Story 3 даёт улучшенный UX без блокировки US1/US2.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T049 [P] Playwright e2e-сценарий `frontend/tests/e2e/tax-rate-periods.spec.ts` (см. quickstart.md шаг 8): регистрация → профиль (Switch OFF) → включение → попытка save без периодов → попап → 2 периода → save → ReportsPage → видна карточка с iconкой → hover → видны строки → возврат в профиль → выключение → карточка скрыта
- [X] T050 Запустить полный quality gate в `backend/`: `npm run lint && npm run build && npm test` — всё зелёное
- [X] T051 Запустить полный quality gate в `frontend/`: `npm run lint && npm run format:check && npm test && npm run find-cycle` — всё зелёное
- [ ] T052 Прогнать quickstart.md «sanity check» вручную: создать пользователя, пройти сценарий целиком; убедиться, что `User.taxRate` исчез из API ответов и от существующих пользователей с не-дефолтной ставкой остался корректный seed-период
- [ ] T053 Сгенерировать запись в `CHANGELOG.md` через `/changelog` (или вручную описать релиз)
- [ ] T054 Сгенерировать пользовательскую новость через `/news`
- [X] T055 [P] Проверить, что нигде в коде не остаётся ссылок на `user.taxRate`, `taxRateInput`, мёртвых тестов на старую модель — `grep -rn "taxRate[^P]" backend/src frontend/src`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — без зависимостей, можно стартовать сразу
- **Foundational (Phase 2)**: T002→T003→T004→T005→T006 строго последовательно (миграция → клиент); T006/T007 параллельны после T005; T008 в конце фазы
- **User Story 1 (Phase 3)**: целиком блокируется Foundational
- **User Story 2 (Phase 4)**: блокируется Foundational; не зависит от US1 (статистика читает периоды независимо), но в реальной разработке удобнее после US1
- **User Story 3 (Phase 5)**: блокируется US1 (нужна сама модалка)
- **Polish (Phase 6)**: блокируется всеми историями

### User Story Dependencies

- **US1 (P1) MVP**: только Foundational
- **US2 (P1)**: только Foundational; технически параллелится с US1, но семантически фича без US1 не имеет смысла (нечего настраивать)
- **US3 (P3)**: после US1; добавляется поверх существующей модалки

### Within Each User Story

- Тесты пишутся ДО реализации; убедиться, что они падают, потом зеленеть
- Backend контроллеры и тесты к ним → роут/регистрация → фронт-API → entity-модель → feature-модель → UI → page-страница
- Внутри backend: контроллеры с разными файлами параллельны [P]; barrel/route — последовательно после
- Внутри frontend: API-клиент, entity, feature-модель параллельны; UI после моделей; страница после UI

### Parallel Opportunities

- **Phase 2**: T006 ⇄ T007 (разные файлы)
- **Phase 3 tests**: T009 ⇄ T010 ⇄ T011 ⇄ T012 ⇄ T014 ⇄ T015 ⇄ T016 (разные файлы)
- **Phase 3 backend impl**: T019 ⇄ T020 ⇄ T021 ⇄ T022 (4 разных контроллера)
- **Phase 3 frontend impl**: T027 ⇄ T028 ⇄ T029 ⇄ T030 (api / entity / feature-model / row-UI)
- **Phase 4 tests**: T036 ⇄ T038 (разные файлы); T037, T039 — расширение существующих
- **Phase 4 impl**: T040 ⇄ T042 (бек-сервис ⇄ фронт-tooltip)
- **Phase 6**: T049 ⇄ T055

---

## Parallel Example: User Story 1 — backend testing batch

```bash
# Параллельные интеграционные тесты в backend/:
Task: "Integration-тест listTaxPeriods.test.ts"
Task: "Integration-тест createTaxPeriod.test.ts"
Task: "Integration-тест updateTaxPeriod.test.ts"
Task: "Integration-тест deleteTaxPeriod.test.ts"

# Параллельная реализация контроллеров:
Task: "listTaxPeriods.ts"
Task: "createTaxPeriod.ts"
Task: "updateTaxPeriod.ts"
Task: "deleteTaxPeriod.ts"
```

## Parallel Example: User Story 1 — frontend module batch

```bash
Task: "frontend/src/shared/api/taxPeriods.ts"
Task: "frontend/src/entities/taxRatePeriod/* (model + types + index)"
Task: "frontend/src/features/taxRatePeriods/model/tax-rate-periods-modal.model.ts"
Task: "frontend/src/features/taxRatePeriods/ui/TaxRatePeriodRow/*"
```

---

## Implementation Strategy

### MVP (US1 + US2) → одна поставка

US1 без US2 не имеет ценности (управляешь периодами, но статистика их игнорирует).
Поэтому MVP в этом проекте — это US1 + US2 в паре. US3 — следующая полировка.

1. **Phase 1 + 2** — миграция и типы
2. **Phase 3 (US1)** — управление периодами
3. **Phase 4 (US2)** — корректный пересчёт + info-icon
4. **Validate**: e2e и quality gates (Phase 6 частично — T050, T051)
5. **Demo / merge / deploy**

### После MVP

6. **Phase 5 (US3)** — визуальные подсказки в модалке
7. **Phase 6 (полный)** — changelog/news/чистка

### Параллельная работа

Если работают двое:
- Dev A: Phase 3 backend + Phase 4 backend (T009–T026 + T036–T037 + T040–T041)
- Dev B: Phase 3 frontend + Phase 4 frontend (T014–T018 + T027–T035 + T038–T039 + T042–T044)

---

## Notes

- [P] = разные файлы, нет зависимостей
- Все новые/изменённые файлы покрываются тестами (Constitution VI + CLAUDE.md)
- Коммиты — по логическим единицам (можно по таскам или по чекпоинтам)
- В случае ошибки миграции в T005 — фикс делается отдельным `--create-only`-патчем, без `--reset` локальной БД
- `Math.round(price * rate / 100)` округляется ПО УРОКУ (не по итогу); тест на это обязателен (T036)
- Не вводить `feature flag` — фича выкатывается целиком (Constitution VII)
