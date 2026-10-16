# Tasks: Заметки урока в карточке списка

**Feature**: 032-lesson-notes-in-card
**Input**: Design documents from `/specs/032-lesson-notes-in-card/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Контекст**: презентационная реализация (`LessonNotes` + подключение в
`LessonCard`) уже создана на этапе mockup и утверждена как финальный дизайн.
Оставшаяся работа — верификация соответствия спеке, полировка edge-кейсов и
полное тестовое покрытие. Бэкенд/Prisma не затрагиваются.

**Абсолютный корень фронта**:
`frontend/src/features/lessons/ui/LessonsList/components/`

**Convention gate**: перед написанием кода/тестов прочитать
`docs/conventions/frontend.md` и `docs/conventions/frontend-testing.md`.

---

## Phase 1: Setup

- [ ] T001 Прочитать `docs/conventions/frontend.md` и `docs/conventions/frontend-testing.md`; убедиться, что реализация в `frontend/src/features/lessons/ui/LessonsList/components/LessonNotes/` (`LessonNotes.tsx`, `LessonNotes.hooks.ts`, `LessonNotes.helpers.ts`, `LessonNotes.constants.ts`, `LessonNotes.styled.ts`, `index.ts`) и подключение в `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx` присутствуют и соответствуют конвенциям (named exports, function expressions, `import type`, без inline-стилей, без `any`, компонент < 150 строк)

---

## Phase 2: Foundational (blocking prerequisites)

- [ ] T002 Верифицировать существующую реализацию против FR-001..FR-010 и Clarification (line-clamp 2 строки, обрезка по `scrollHeight > clientHeight`); зафиксировать несоответствия для полировки в Phase 3–5 (файлы: все в `LessonNotes/` + `LessonCard/LessonCard.tsx`)

---

## Phase 3: User Story 1 — Заметка видна в карточке (P1) 🎯 MVP

**Goal**: непустая заметка отображается фрагментом прямо в карточке; у уроков
без заметки (в т.ч. только пробелы) блока нет; клик по карточке по-прежнему
открывает попап.

**Independent Test**: короткая заметка видна целиком без действий; урок без
заметки — карточка без пустого блока (spec.md US1 Independent Test).

- [ ] T003 [US1] Убедиться, что `hasVisibleNotes` в `LessonNotes/LessonNotes.helpers.ts` отбрасывает пробельные строки (trim) и служит type guard; при отклонении от FR-001/US1-2/US1-5 — исправить (файл: `LessonNotes/LessonNotes.helpers.ts`)
- [ ] T004 [US1] Убедиться, что `LessonCard.tsx` рендерит `<LessonNotes>` только при `hasVisibleNotes(lesson.notes)` и что заметка отображается во всех представлениях, использующих `LessonCard` (FR-007, FR-009); полировка при необходимости (файл: `LessonCard/LessonCard.tsx`)
- [ ] T005 [P] [US1] Unit-тесты `hasVisibleNotes` в `LessonNotes/__tests__/LessonNotes.helpers.test.ts`: `undefined`/`""`/`"   "`/переводы строк → false; непустой текст → true
- [ ] T006 [P] [US1] Компонентный тест в `LessonNotes/__tests__/LessonNotes.test.tsx`: короткая заметка рендерится целиком, контрол «Развернуть» отсутствует (FR-003, US1-1, US2-4)
- [ ] T007 [US1] Обновить `LessonCard/__tests__/LessonCard.test.tsx`: заметка присутствует при непустом `notes`; блок отсутствует при пустом/пробельном `notes` (FR-007, US1-2, US1-5)

**Checkpoint**: US1 самодостаточна и тестируема независимо.

---

## Phase 4: User Story 2 — Разворачивание длинной заметки (P2)

**Goal**: длинная заметка показывает контрол разворачивания; раскрытие/
сворачивание на месте, переносы строк сохранены; попап не открывается;
состояние независимо для каждой карточки.

**Independent Test**: заметка в несколько абзацев разворачивается по контролу
(виден весь текст с переносами), сворачивается обратно; попап не открывался
(spec.md US2 Independent Test).

- [ ] T008 [US2] Верифицировать хук `useIsTextClamped` в `LessonNotes/LessonNotes.hooks.ts`: `isClamped` по `scrollHeight > clientHeight`, пересчёт через `ResizeObserver`, отсутствие измерения при `expanded`; полировка при необходимости (FR-003, Clarification)
- [ ] T009 [US2] Верифицировать `LessonNotes.tsx`: контрол показывается при `expanded || isClamped`; toggle через `useState`; `event.stopPropagation()` в обработчике; переносы строк в развёрнутом виде (`white-space: pre-wrap`) — FR-004, FR-005, FR-006 (файлы: `LessonNotes/LessonNotes.tsx`, `LessonNotes/LessonNotes.styled.ts`)
- [ ] T010 [P] [US2] Тест в `LessonNotes/__tests__/LessonNotes.hooks.test.ts`: `useIsTextClamped` возвращает `isClamped=true` при переполнении и `false`, когда текст влезает; не измеряет при `expanded` (мокнуть `scrollHeight`/`clientHeight`)
- [ ] T011 [P] [US2] Тесты в `LessonNotes/__tests__/LessonNotes.test.tsx`: клик по контролу разворачивает и сворачивает заметку (текст с переносами виден в развёрнутом виде); повторный клик возвращает компактный вид (FR-004, US2-1, US2-2)
- [ ] T012 [P] [US2] Тест в `LessonNotes/__tests__/LessonNotes.test.tsx`: клик по контролу вызывает `stopPropagation` и НЕ триггерит `onClick` родителя/карточки (FR-005, US2-3, SC-005)
- [ ] T013 [P] [US2] Тест в `LessonNotes/__tests__/LessonNotes.test.tsx`: два экземпляра `LessonNotes` — разворот одного не меняет состояние другого (независимость, FR-006, US2-5)

**Checkpoint**: US2 добавляет разворачивание поверх US1, тестируется отдельно.

---

## Phase 5: User Story 3 — Удобный просмотр на мобильном (P3)

**Goal**: тот же паттерн на узком экране; достаточная зона касания контрола;
текст не ломает вёрстку (длинное слово/ссылка).

**Independent Test**: на мобильной ширине фрагмент компактен, касание контрола
разворачивает без открытия попапа, касание карточки открывает попап
(spec.md US3 Independent Test).

- [ ] T014 [US3] Верифицировать `LessonNotes.styled.ts`: `ToggleButton` имеет достаточную зону касания (`minHeight` ≥ 32, вертикальный паддинг); `NotesText` с `overflow-wrap: anywhere`, чтобы длинное слово/ссылка не растягивали вёрстку (FR-008, Edge Cases); полировка при необходимости
- [ ] T015 [P] [US3] Тест в `LessonNotes/__tests__/LessonNotes.test.tsx`: контрол доступен (роль `button`, `aria-expanded`, `aria-label` меняется «Развернуть»↔«Свернуть»), пригоден для касания (US3-2, доступность)
- [ ] T016 [P] [US3] Тест в `LessonNotes/__tests__/LessonNotes.test.tsx`: очень длинное «слово»/ссылка без пробелов рендерится без переполнения контейнера (проверка применения стилей переноса) — Edge Cases

**Checkpoint**: US3 уточняет поведение для касаний/узких экранов поверх US1–US2.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T017 [P] Прогнать edge-кейсы из spec.md как тесты/проверки в `LessonNotes/__tests__/LessonNotes.test.tsx`: заметка ровно на границе лимита (контрол только при реальной обрезке), многострочная заметка в пределах длины, очень длинная заметка (тысячи символов) — карточка отзывчива (Edge Cases, FR-003)
- [ ] T018 Прогнать гейты качества из `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm test -- src/features/lessons/ui/LessonsList`, `npm run find-cycle` — 0 ошибок, все тесты зелёные
- [ ] T019 Пройти `quickstart.md` вручную (десктоп + мобильная ширина + недельный вид списка); свериться с SC-001..SC-005; зафиксировать результат

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (3→4→5)** → **Polish (Phase 6)**.
- US1 (Phase 3) — MVP, самодостаточна.
- US2 (Phase 4) строится поверх US1 (тот же компонент), но тестируется
  независимо.
- US3 (Phase 5) уточняет US1–US2 для касаний/узких экранов.
- Phase 6 после всех историй.

### Внутри истории

- Верификационные/полировочные задачи по коду (T003–T004, T008–T009, T014)
  идут перед связанными тестами той же истории (или параллельно, если файлы
  разные).

## Parallel Execution Examples

- US1: T005, T006 параллельны (разные файлы). T007 — после/параллельно
  (файл `LessonCard.test.tsx`).
- US2: T010, T011, T012, T013 — тесты; T010 в отдельном файле (`.hooks.test.ts`)
  параллелен остальным; T011–T013 в одном файле — последовательно или как один
  набор.
- US3: T015, T016 параллельны с полировкой T014 при разных файлах.
- Polish: T017 [P]; затем T018 и T019 последовательно (гейты, ручная проверка).

## Implementation Strategy

- **MVP**: Phase 1–3 (US1) — заметка видна в карточке, пустые отфильтрованы.
- **Инкремент 2**: Phase 4 (US2) — разворачивание длинных заметок.
- **Инкремент 3**: Phase 5 (US3) — мобильная полировка и доступность.
- **Финал**: Phase 6 — edge-кейсы, гейты качества, ручная сверка со Success
  Criteria.
