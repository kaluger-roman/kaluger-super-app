# Implementation Plan: Полноэкранный режим в звонке

**Branch**: `039-call-fullscreen` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-call-fullscreen/spec.md`

## Summary

Во время звонка видео собеседника (камера или демонстрация экрана) можно
развернуть на всё окно приложения: кнопка «Во весь экран» в углу плитки,
двойной щелчок / двойное касание по видео; выход — «Свернуть», Esc или
снова двойной щелчок. В режиме нет шапки, отступов, ограничения ширины
и своего превью; панель звонка, имя, таймер, метка демонстрации и
«Свернуть» лежат поверх видео и прячутся через 3 с бездействия (вместе
с курсором). При демонстрации собеседника в режиме её можно увеличить
до 4× (щипок, колесо, «+» / «−» шагом 0,5×) и двигать в границах
картинки; «Исходный размер» возвращает 1×. Режим и масштаб локальны
и сбрасываются с концом звонка. Системный Fullscreen API не используется.

**Технический подход.**

- **Только фронтенд** (`frontend/src/features/videoCall`). Бэкенд, БД,
  REST и WebSocket не меняются; новых зависимостей нет (R17).
- **UI собран на этапе макетов и утверждён**: `FullscreenToggleButton`,
  `FullscreenControls` (`FullscreenTopBar`, `FullscreenBottomBar`),
  `ZoomControls`, `ScreenShareLabel`, вариант плитки `fullscreen`,
  раскладка режима в `ActiveCallScreen`. Работа — заменить моки
  (`callFullscreenMock.helpers.ts`, 19 маркеров `TODO(auto-feature)`)
  моделями и удалить страницу и маршрут макета (R14).
- **Модели** (R2–R6, R9–R11): `callFullscreen.model.ts` — `$isFullscreen`,
  `$controlsVisible`, удержание наведением / клавиатурным фокусом,
  автоскрытие через patronum `debounce` 3000 мс, сброс на
  `callModel.callTerminated`; `callZoom.model.ts` — `$zoom
  { scale, offsetX, offsetY }`, `$stageGeometry`, шаги, масштаб вокруг
  точки, ограничение сдвига с учётом `object-fit: contain` и собственных
  пропорций видео, сбросы (выход из режима, конец демонстрации, поворот,
  конец звонка). Математика — чистые функции в `callZoom.helpers.ts`.
- **DOM-слой** (R7, R8, R12, R13): хуки подписок — `useFullscreenEscape`
  (Esc на `document`, кроме диалогов), `useDoubleTapToggle` (двойное
  касание на pointer events: iOS не шлёт `dblclick`), `useZoomGestures`
  (колесо non-passive, щипок / сдвиг с pointer capture, `touch-action:
  none`), `useStageGeometry` (`ResizeObserver` + `resize` видео),
  `useZoomTransform` (CSS-переменные на `<video>` через ref — не styled-проп
  и не `style={{}}`). Состояние жеста — в `ref`, результат — события модели.
- **Инвариант раскладки**: `<video>` собеседника не перемонтируется при
  переключении режима (R1).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19
**Primary Dependencies**: React, Effector 23, effector-react, patronum 2.3 (`debounce`), Material UI (styled API из `@shared`), Pointer Events, ResizeObserver. Новых зависимостей нет
**Storage**: N/A — состояние в памяти вкладки на время звонка; без изменений БД и API
**Testing**: Vitest 4 + React Testing Library + happy-dom (юнит и компонентные), Playwright (e2e, `frontend/e2e/students/video-call.spec.ts`)
**Target Platform**: Web SPA; Chrome / Firefox / Safari на компьютере, Safari на iPhone, Chrome на Android; ширина от 375 px, альбомная ориентация телефона
**Project Type**: web (монорепо frontend + backend; затронут только frontend)
**Performance Goals**: жесты масштаба на частоте кадров — на событие одно обновление `$zoom` и ререндер одного `CallVideo`, без новых emotion-классов; `pointermove` мыши не вызывает ререндеров (повторный `true` в `$controlsVisible` не меняет стор)
**Constraints**: без системного fullscreen (SC-005); `<video>` не перемонтируется; обычный вид не меняется, кроме кнопки (FR-013); без `useEffect` для данных и таймеров (таймер — patronum в модели); без inline-стилей; компоненты < 150 строк, модели < 200; тексты и `aria-label` на русском
**Scale/Scope**: 2 новые модели + constants / types / helpers; 5 новых хуков; правки ~10 файлов макета; удаление мок-модуля, страницы макета и маршрута; ~12 тестовых файлов (новые и обновлённые); 1 новый e2e-сценарий

**Unknowns**: нет. Пять развилок спеки закрыты в Clarifications (сессия
2026-10-23), решения реализации — в [research.md](./research.md) (R1–R17).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Feature-Sliced Design**: PASS. Всё внутри `features/videoCall`:
  модели в `model/`, компоненты в `ui/`, общий тип `CallZoom` в
  `videoCall.types.ts`. Импорты только вниз (`@shared`), страница макета
  из `pages/` удаляется. Глубоких импортов нет: UI берёт модели через
  `../../model` (index), новые папки имеют `index.ts`. `npm run find-cycle`
  в гейтах; зависимость моделей односторонняя (`callZoom` → `callFullscreen` → `call`).
- **II. Layered MVC (Backend)**: N/A — бэкенд не меняется.
- **III. Effector State Management**: PASS. Режим, видимость панели,
  удержание, масштаб и геометрия — сторы; связи — только `sample`;
  компоненты — `useUnit` (сторы отдельными вызовами, события — объектом);
  `fn` чистые, математика в `callZoom.helpers.ts`; автоскрытие —
  `debounce` из patronum внутри модели; модели экспортируются
  неймспейсами `callFullscreenModel`, `callZoomModel`. `useEffect` —
  только для подписок на DOM-события (как уже `useCallVideoPlayback`),
  не для загрузки данных и не для таймеров.
- **IV. Type Safety**: PASS. `type`, `import type`, без `any`;
  типы модели в `model/callFullscreen.types.ts`, UI-типы в
  `*.types.ts` компонентов.
- **V. Code Consistency**: PASS. Named exports, function expressions,
  константы / хелперы / хуки / типы в отдельных файлах (в файлах
  компонентов — только компонент), без `style={{}}` / `sx` (трансформация —
  CSS-переменные через ref, R13), `aria-label` на кнопках-иконках, тексты
  на русском. `ActiveCallScreen.tsx` остаётся < 150 строк за счёт хуков.
- **VI. Testing Discipline**: PASS после задач тестирования. Новые модели —
  fork + fake timers; хелперы — чистые юниты; хуки — через компонентные
  тесты или `renderHook`; компоненты макета (`FullscreenControls`,
  `FullscreenToggleButton`, `ZoomControls`, вариант `fullscreen`) —
  RTL; существующие тесты `ActiveCallScreen` и `VideoTile` обновляются;
  e2e на вход / выход в реальном звонке.
- **VII. Simplicity**: PASS. Без Fullscreen API, без библиотек жестов,
  без сохранения настроек; два небольших стора-флага удержания вместо
  менеджера фокуса; одна модель геометрии вместо отдельной подписки
  на ориентацию.

**Post-Design re-check (после Phase 1)**: PASS с одним задокументированным
отступлением (Complexity Tracking): `$zoom` — объектный стор вместо трёх
атомарных. Внешних контрактов нет, `contracts/` не создаётся (R17);
интерфейс моделей для UI — [data-model.md](./data-model.md).

## Project Structure

### Documentation (this feature)

```text
specs/039-call-fullscreen/
├── plan.md              # This file
├── spec.md              # Спецификация (утверждена, + Clarifications 2026-10-23)
├── research.md          # Phase 0: решения R1–R17
├── data-model.md        # Phase 1: сторы, события, переходы, чистые функции
├── quickstart.md        # Phase 1: запуск, проверки, ручной сценарий по историям
├── checklists/
│   └── requirements.md  # (существует)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── e2e/students/video-call.spec.ts                      # ИЗМЕНИТЬ: сценарий «во весь экран» (R16)
└── src/
    ├── app/components/AppRoutes/
    │   ├── AppRoutes.tsx                                 # ИЗМЕНИТЬ: убрать маршрут /__mockup/call-fullscreen
    │   └── AppRoutes.constants.ts                        # ИЗМЕНИТЬ: убрать CallFullscreenMockupPage
    ├── pages/callFullscreenMockup/                       # УДАЛИТЬ целиком
    └── features/videoCall/
        ├── callFullscreenMock.helpers.ts                 # УДАЛИТЬ
        ├── videoCall.types.ts                            # ИЗМЕНИТЬ: CallZoom в пикселях (комментарий)
        ├── videoCall.constants.ts                        # СУЩЕСТВУЕТ (макет): SHORT_STAGE_*
        ├── model/
        │   ├── callFullscreen.model.ts                   # СОЗДАТЬ
        │   ├── callZoom.model.ts                         # СОЗДАТЬ
        │   ├── callFullscreen.constants.ts               # СОЗДАТЬ
        │   ├── callFullscreen.types.ts                   # СОЗДАТЬ
        │   ├── callZoom.helpers.ts                       # СОЗДАТЬ
        │   ├── index.ts                                  # ИЗМЕНИТЬ: callFullscreenModel, callZoomModel
        │   └── __tests__/
        │       ├── callFullscreen.model.test.ts          # СОЗДАТЬ
        │       ├── callZoom.model.test.ts                # СОЗДАТЬ
        │       └── callZoom.helpers.test.ts              # СОЗДАТЬ
        └── ui/
            ├── ActiveCallScreen/
            │   ├── ActiveCallScreen.tsx                  # ИЗМЕНИТЬ: модели, хуки, активность, data-testid сцены
            │   ├── ActiveCallScreen.styled.ts            # ИЗМЕНИТЬ: touch-action у RemoteWrap
            │   ├── ActiveCallScreen.hooks.ts             # СОЗДАТЬ: useFullscreenEscape, useDoubleTapToggle
            │   ├── ActiveCallScreen.helpers.ts           # СОЗДАТЬ: isTap, isDoubleTap, isInteractiveTarget, isInsideDialog
            │   ├── ActiveCallScreen.constants.ts         # СОЗДАТЬ: пороги касаний, селекторы
            │   ├── ActiveCallScreen.types.ts             # СОЗДАТЬ: TapSample
            │   └── __tests__/
            │       ├── ActiveCallScreen.test.tsx         # ИЗМЕНИТЬ: режим, Esc, двойной щелчок / касание
            │       └── ActiveCallScreen.helpers.test.ts  # СОЗДАТЬ
            ├── FullscreenControls/                       # СУЩЕСТВУЕТ (макет): модель вместо мока
            │   ├── FullscreenControls.tsx                # ИЗМЕНИТЬ: $controlsVisible, focus / blur
            │   ├── FullscreenTopBar.tsx                  # ИЗМЕНИТЬ: pointerenter / pointerleave
            │   ├── FullscreenBottomBar.tsx               # ИЗМЕНИТЬ: pointerenter / pointerleave, $isZoomAvailable
            │   ├── FullscreenControls.helpers.ts         # СОЗДАТЬ: isKeyboardFocus, isFocusLeaving, isMousePointer
            │   └── __tests__/FullscreenControls.test.tsx # СОЗДАТЬ
            ├── FullscreenToggleButton/                   # СУЩЕСТВУЕТ (макет)
            │   ├── FullscreenToggleButton.tsx            # ИЗМЕНИТЬ: $isFullscreen, fullscreenToggled
            │   └── __tests__/FullscreenToggleButton.test.tsx  # СОЗДАТЬ
            ├── ZoomControls/                             # СУЩЕСТВУЕТ (макет)
            │   ├── ZoomControls.tsx                      # ИЗМЕНИТЬ: callZoomModel
            │   ├── ZoomControls.constants.ts             # ИЗМЕНИТЬ: убрать ZOOM_MIN/MAX_SCALE
            │   └── __tests__/ZoomControls.test.tsx       # СОЗДАТЬ (+ formatZoomPercent)
            ├── ScreenShareLabel/                         # СУЩЕСТВУЕТ (макет), покрыт тестами VideoTile
            └── VideoTile/
                ├── CallVideo.tsx                         # ИЗМЕНИТЬ: хуки масштаба, без $zoom
                ├── VideoTile.styled.ts                   # ИЗМЕНИТЬ: transform из CSS-переменных, $zoomable, ResumeOverlay
                ├── VideoTile.helpers.ts                  # ИЗМЕНИТЬ: убрать getZoomTransform; + хелперы жестов
                ├── VideoTile.hooks.ts                    # ИЗМЕНИТЬ: + useZoomTransform, useZoomGestures, useStageGeometry
                ├── VideoTile.constants.ts                # ИЗМЕНИТЬ: чувствительность колеса
                └── __tests__/
                    ├── CallVideo.test.tsx                # ИЗМЕНИТЬ: масштаб, жесты, геометрия
                    ├── VideoTile.test.tsx                # ИЗМЕНИТЬ: вариант fullscreen, кнопка в remote
                    └── VideoTile.helpers.test.ts         # ИЗМЕНИТЬ: getTileBackground, хелперы жестов
```

**Structure Decision**: веб-монорепо, затронут только `frontend/`.
Вся фича — внутри `features/videoCall` (FSD: `model/` + `ui/`); вне
фичи меняются только `app/components/AppRoutes/` и `e2e/` (снос
маршрута макета и e2e). `backend/` не трогается.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `$zoom` — объектный стор `{ scale, offsetX, offsetY }` вопреки «Atomic stores» (`docs/conventions/frontend.md`) | Три поля меняются одним жестом и связаны ограничением сдвига, зависящим от масштаба (R9, R10) | Три стора обновлялись бы по очереди: промежуточный кадр с новым масштабом и старым сдвигом выводит картинку за край; `combine` для чтения не решает запись |
| Трансформация видео пишется в `element.style` (CSS-переменные) через ref в `useZoomTransform` | Значение меняется на частоте кадров жеста (R13) | styled-проп `$zoom` создаёт новый emotion-класс на каждый кадр; `style={{}}` запрещён ESLint (`react/forbid-dom-props`) |
