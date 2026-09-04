# Implementation Plan: Заметки урока в карточке списка

**Branch**: `032-lesson-notes-in-card` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-lesson-notes-in-card/spec.md`

## Summary

Отобразить заметку урока прямо в карточке урока в списке уроков: непустая
заметка показывается компактным фрагментом (CSS line-clamp в 2 строки),
длинную заметку можно развернуть/свернуть на месте, не открывая попап урока.
Состояние развёрнутости локально для каждой карточки (`useState`), клик по
контролу разворачивания останавливает всплытие (`stopPropagation`), чтобы не
открывался попап. Заметка работает во всех представлениях списка, использующих
`LessonCard` (группировка по датам и недельный вид списка).

Технический подход уже реализован на этапе mockup и является утверждённым
финальным дизайном: презентационный компонент `LessonNotes` (папка
`frontend/src/features/lessons/ui/LessonsList/components/LessonNotes/`) с
файлами `LessonNotes.tsx`, `LessonNotes.hooks.ts` (`useIsTextClamped` —
измерение переполнения через `scrollHeight > clientHeight` + `ResizeObserver`),
`LessonNotes.helpers.ts` (`hasVisibleNotes`), `LessonNotes.constants.ts`
(`NOTES_COLLAPSED_LINES = 2`), `LessonNotes.styled.ts`, `index.ts`. Компонент
уже подключён в `LessonCard.tsx` через `hasVisibleNotes(lesson.notes)` +
`<LessonNotes notes={lesson.notes} />`.

Оставшаяся работа — верификация, полировка edge-кейсов и полное тестовое
покрытие (unit-тесты для `hasVisibleNotes` и хука `useIsTextClamped`,
компонентные тесты `LessonNotes`, обновление затронутых тестов `LessonCard`).
Изменений в бэкенде / Prisma не требуется — `lesson.notes` уже существует.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, Material UI (styled-components API),
`@mui/icons-material` (ExpandMore / ExpandLess). Новых runtime-зависимостей нет.
**Storage**: N/A (данные заметки уже приходят в модели урока; поле
`lesson.notes` существует)
**Testing**: Vitest + React Testing Library + MSW (frontend)
**Target Platform**: Web SPA (десктоп + мобильная ширина экрана)
**Project Type**: web (frontend + backend монорепо; фича только frontend)
**Performance Goals**: список остаётся прокручиваемым и отзывчивым при большом
числе карточек с заметками; развёрнутая длинная заметка (тысячи символов) не
ломает отзывчивость
**Constraints**: без inline-стилей (`style`/`sx`); компоненты < 150 строк;
line-clamp 2 строки в свёрнутом виде; зона касания контрола ≥ 32px по высоте
на мобильном; UI-текст на русском
**Scale/Scope**: 1 презентационный компонент + хук + helper + константы +
стили (уже существуют); подключение в одной карточке `LessonCard`,
переиспользуемой всеми представлениями списка

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I. Feature-Sliced Design: PASS. Код целиком в слое `features/lessons/ui`,
  импорты только вниз (`@shared` для `styled`). Публичный API папки
  `LessonNotes` через `index.ts`, без deep-импортов извне.
- II. Layered MVC (Backend): N/A. Бэкенд не затрагивается.
- III. Effector State Management: PASS с явным обоснованием. Состояние
  развёрнутости — локальный UI-стейт одной карточки (`useState`), не доменное
  состояние формы или данных. Конституция требует Effector для «frontend
  state»; локальный transient toggle раскрытия соответствует утверждённому
  mockup-дизайну (независимое состояние на карточку, не сохраняется между
  визитами — FR-006, Assumptions). Это не форма и не бизнес-данные — вынос в
  Effector был бы over-engineering (принцип VII). См. research.md.
- IV. Type Safety: PASS. `type`-only, `import type`, без `any`; props
  типизированы (`LessonNotesProps`, `MouseEvent<HTMLButtonElement>`).
- V. Code Consistency: PASS. Named exports, function expressions, `index.ts`
  re-export, компонент < 150 строк, без inline-стилей (всё в
  `LessonNotes.styled.ts`), UI-текст на русском («Развернуть» / «Свернуть»).
- VI. Testing Discipline: PASS (после выполнения задач тестирования).
  Vitest + RTL, тест поведения пользователя, независимые тесты.
- VII. Simplicity: PASS. Минимальный набор файлов, без преждевременных
  абстракций, без feature-флагов.

Complexity Tracking: единственное отступление (локальный `useState` вместо
Effector) обосновано выше и в research.md — это не нарушение, а корректная
трактовка принципа VII поверх III для transient UI-стейта. Отдельная запись в
таблице не требуется.

## Project Structure

### Documentation (this feature)

```text
specs/032-lesson-notes-in-card/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (with Clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (README — no API contracts, frontend-only)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/src/features/lessons/ui/LessonsList/components/
├── LessonNotes/                       # презентационный компонент заметки (СУЩЕСТВУЕТ)
│   ├── LessonNotes.tsx                # компонент: useState(expanded) + toggle + stopPropagation
│   ├── LessonNotes.hooks.ts           # useIsTextClamped: scrollHeight>clientHeight + ResizeObserver
│   ├── LessonNotes.helpers.ts         # hasVisibleNotes(notes): trim-непустая проверка
│   ├── LessonNotes.constants.ts       # NOTES_COLLAPSED_LINES = 2
│   ├── LessonNotes.styled.ts          # NotesContainer / NotesText(line-clamp) / ToggleButton
│   ├── index.ts                       # export { LessonNotes, hasVisibleNotes }
│   └── __tests__/                     # ДОБАВИТЬ: тесты компонента, хука, helper
│       ├── LessonNotes.test.tsx
│       ├── LessonNotes.hooks.test.ts
│       └── LessonNotes.helpers.test.ts
└── LessonCard/
    ├── LessonCard.tsx                 # подключает LessonNotes (СУЩЕСТВУЕТ)
    └── __tests__/LessonCard.test.tsx  # ОБНОВИТЬ: покрыть отображение/скрытие заметки
```

**Structure Decision**: Web-монорепо; фича полностью на frontend в слое
`features/lessons`. Используется уже созданная на этапе mockup структура папки
`LessonNotes` (утверждённый финальный дизайн). Новые файлы — только тесты
в подпапках `__tests__/`.

## Complexity Tracking

> Нарушений конституции, требующих обоснования в таблице, нет. Локальный
> `useState` для transient toggle обоснован в Constitution Check и research.md
> как корректное применение принципа VII (Simplicity), а не отступление.
