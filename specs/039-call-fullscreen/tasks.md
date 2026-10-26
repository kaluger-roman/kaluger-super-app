# Tasks: Полноэкранный режим в звонке

**Input**: Design documents from `/specs/039-call-fullscreen/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: ВКЛЮЧЕНЫ и обязательны. `CLAUDE.md`: «All new code must have
full test coverage… Do NOT skip tests or defer them to a later PR»;
конституция, принцип VI, — то же. Тестов требует и код, собранный на этапе
макетов (`FullscreenToggleButton`, `FullscreenControls`, `ZoomControls`,
вариант плитки `fullscreen`, `getTileBackground`): сейчас у него тестов нет.

**Organization**: задачи сгруппированы по историям спеки (US1 — развернуть
собеседника на всё окно, US2 — приблизить часть демонстрации).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 / US2, только в фазах историй

## Состояние кодовой базы на старте (важно)

UI фичи собран на этапе макетов и утверждён
(`docs/mockups/039-call-fullscreen/index.md`). В финальных местах лежат
`features/videoCall/ui/{FullscreenToggleButton,FullscreenControls,ZoomControls,ScreenShareLabel}/`,
правки в `ActiveCallScreen` (раскладка режима), `VideoTile/*` (вариант
`fullscreen`, `bare`, `zoomable`, `getTileBackground`, `getZoomTransform`,
styled-проп `$zoom`), `videoCall.constants.ts` (`SHORT_STAGE_*`),
`videoCall.types.ts` (`CallZoom`). Состояние захардкожено:
`features/videoCall/callFullscreenMock.helpers.ts` читает query-параметры
(`?mode=full&controls=0&zoom=2&panX=…`), события — пустые функции.
Есть временная страница `pages/callFullscreenMockup/` и маршрут
`/__mockup/call-fullscreen` в `app/components/AppRoutes/`. В коде **19**
маркеров `TODO(auto-feature)`. Моделей режима и масштаба нет ни строки.
Бэкенд и БД не меняются.

Все команды — на машине `home` в worktree
`/home/roman-kaluger/kaluger-super-app/.claude/worktrees/call-fullscreen-tmp`
(`ssh home 'source ~/.nvm/nvm.sh; cd <worktree>/frontend && …'`).
Одиночный тест: `npm run test -- path/to/file.test.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: рабочее окружение и точка отсчёта

- [X] T001 В worktree проверить `frontend/node_modules` (в свежем worktree — симлинк из основного checkout) и снять базу: из `frontend/` `npm run test -- src/features/videoCall` и `npx tsc --noEmit` на состоянии макета; записать уже падающие тесты (если есть), чтобы не путать их с регрессиями. Перечитать `docs/conventions/frontend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/e2e-testing.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: типы и константы, общие для обеих моделей (data-model.md §1–§2)

- [X] T002 [P] Создать `frontend/src/features/videoCall/model/callFullscreen.types.ts`: `StageGeometry { boxWidth, boxHeight, videoWidth, videoHeight }`, `StageOrientation = "portrait" | "landscape"`, `ZoomAtPayload { factor, focusX, focusY }`, `PanPayload { dx, dy }` (data-model.md §1)
- [X] T003 [P] Создать `frontend/src/features/videoCall/model/callFullscreen.constants.ts`: `CONTROLS_AUTO_HIDE_MS = 3000`, `ZOOM_MIN_SCALE = 1`, `ZOOM_MAX_SCALE = 4`, `ZOOM_STEP = 0.5`, `ZOOM_RESET: CallZoom = { scale: 1, offsetX: 0, offsetY: 0 }` (data-model.md §2)
- [X] T004 [P] В `frontend/src/features/videoCall/videoCall.types.ts` у `CallZoom` заменить комментарий на `// Offsets are CSS pixels from the centre of the video box, applied before the scale.` (research R9)

**Checkpoint**: типы и константы есть — истории можно начинать

---

## Phase 3: User Story 1 — Развернуть собеседника на всё окно приложения (Priority: P1) 🎯 MVP

**Goal**: кнопка «Во весь экран» / «Свернуть», двойной щелчок и двойное
касание, Esc; в режиме видео собеседника на всё окно без шапки, отступов
и своего превью; панель поверх видео, видна при входе, прячется через 3 с
бездействия вместе с курсором, удерживается курсором над панелью
и клавиатурным фокусом; сброс в конце звонка.

**Independent Test**: spec.md US1 — звонок, ученик показывает экран,
у репетитора в окне 1440×900 «Во весь экран» → демонстрация во всю ширину,
шапки и превью нет; 3 с без мыши — панель исчезает, движение — появляется;
Esc — обычный вид, звонок идёт.

### Tests for User Story 1 (пишутся первыми и падают) ⚠️

- [X] T005 [P] [US1] Создать `frontend/src/features/videoCall/model/__tests__/callFullscreen.model.test.ts` (fork на тест, `vi.useFakeTimers()` в `beforeEach`, юниты fire-and-forget + `vi.advanceTimersByTimeAsync`, как `callScreen.model.test.ts`): `fullscreenToggled` включает и выключает `$isFullscreen`; при входе `$controlsVisible === true`, через `CONTROLS_AUTO_HIDE_MS` — `false`, за 1 мс до — ещё `true`; `activityDetected` показывает скрытую панель и перезапускает таймер (активность на 2,5 с → через 2,5 с ещё видна, через 3 с после неё — скрыта); `controlsHovered` держит панель дольше 3 с, `controlsUnhovered` прячет через 3 с после ухода; то же для `controlsFocused` / `controlsBlurred`; наведение снято, фокус остался — панель не прячется; `escapePressed` в режиме выключает его, вне режима ничего не меняет; `callModel.callTerminated` (через `callModel.hangUp`) выключает режим; после выхода `$controlsVisible === true`, `$isControlsHovered` и `$isControlsFocused` сброшены; `activityDetected` вне режима не трогает сторы; `$isCursorHidden` истинно только в режиме при скрытой панели; таймер, взведённый до выхода из режима, после выхода панель не прячет
- [X] T006 [P] [US1] Создать `frontend/src/features/videoCall/ui/ActiveCallScreen/__tests__/ActiveCallScreen.helpers.test.ts`: `isTap` (короче `TAP_MAX_DURATION_MS` и сдвиг ≤ `TAP_MOVE_TOLERANCE_PX` — касание; дольше или дальше — нет), `isDoubleTap` (второе касание ≤ `DOUBLE_TAP_INTERVAL_MS` и ≤ `DOUBLE_TAP_DISTANCE_PX` — да; позже, дальше или без предыдущего — нет), `isInteractiveTarget` (`button`, вложенный в `button` `svg`, `[role="button"]`, `a` — да; `video`, `div` — нет), `isInsideDialog` (внутри `[role="dialog"]` или `[aria-modal="true"]` — да; `body` — нет)
- [X] T007 [P] [US1] Создать `frontend/src/features/videoCall/ui/FullscreenControls/__tests__/FullscreenControls.helpers.test.ts`: `isMousePointer` (`pointerType === "mouse"`), `isFocusLeaving` (`relatedTarget` вне контейнера или `null` — да; внутри — нет), `isKeyboardFocus` (элемент, на котором `matches(":focus-visible")` истинно, — да; движок кидает на селекторе — `true`, фокус не теряет удержание)
- [X] T008 [P] [US1] Создать `frontend/src/features/videoCall/ui/FullscreenToggleButton/__tests__/FullscreenToggleButton.test.tsx` (`EffectorProvider` + fork, `ThemeProvider`): вне режима кнопка с `aria-label="Во весь экран"`, клик → `$isFullscreen === true` в scope; в режиме — «Свернуть», клик выключает; двойной щелчок по кнопке не всплывает (обёртка с `onDoubleClick`-шпионом не вызвана)
- [X] T009 [P] [US1] Создать `frontend/src/features/videoCall/ui/FullscreenControls/__tests__/FullscreenControls.test.tsx` (fork со значениями `callModel.$activePeerName`, `$callDurationSeconds`, `$peerMediaState`, `callFullscreenModel.$isFullscreen = true`): сверху имя, таймер (`formatCallDuration`), «Демонстрация экрана» только при демонстрации, значок «Микрофон выключен» при выключенном микрофоне собеседника, кнопка «Свернуть»; снизу кнопки звонка («Завершить звонок» и др.); `data-visible` отражает `$controlsVisible`; `pointerenter` мыши на верхней / нижней панели → `$isControlsHovered === true`, `pointerleave` → `false`; `pointerenter` с `pointerType: "touch"` стор не меняет; Tab на кнопку панели (`userEvent.tab()`) → `$isControlsFocused === true`; уход фокуса наружу → `false`, переход фокуса между кнопками панели — остаётся `true`
- [X] T010 [P] [US1] Обновить `frontend/src/features/videoCall/ui/ActiveCallScreen/__tests__/ActiveCallScreen.test.tsx` (существующие 6 тестов сохраняются для обычного вида): в обычном виде есть «Во весь экран», шапка с именем и `local-pip`; клик по «Во весь экран» → `data-fullscreen="true"` у корня, нет шапки (имя только в верхней панели) и `local-pip`, есть `fullscreen-controls` и «Свернуть»; тот же DOM-узел `<video>` собеседника до и после входа и после выхода (регрессия R1, нужен `stream` в `callModel.$remoteStream`); Esc (`userEvent.keyboard("{Escape}")`) выключает режим; Esc при фокусе внутри отрисованного рядом `<div role="dialog">` режим не выключает; Esc в обычном виде ничего не делает; двойной щелчок по `remote-stage` включает и выключает режим; двойной щелчок по «Во весь экран» не переключает; двойное касание (`fireEvent.pointerDown` / `pointerUp` с `pointerType: "touch"`, два раза подряд) переключает режим, одно касание — нет, касание двумя пальцами — нет; баннер «Соединение…» виден в режиме (фаза `connecting`); при скрытой панели у корня `data-cursor-hidden="true"`
- [X] T011 [P] [US1] Обновить `frontend/src/features/videoCall/ui/VideoTile/__tests__/VideoTile.test.tsx`: вариант `remote` показывает кнопку «Во весь экран», `self` / `selfCompact` — нет; вариант `fullscreen` не рисует плашку имени, значок микрофона и метку демонстрации (их показывает `FullscreenTopBar`), камера в нём — `data-layout="overlay"`; плейсхолдер с аватаром в `fullscreen` при выключенной камере
- [X] T012 [P] [US1] Обновить `frontend/src/features/videoCall/ui/VideoTile/__tests__/VideoTile.helpers.test.ts`: `getTileBackground` — демонстрация в `bare` чёрная, в обычной плитке градиент; камера — градиент камеры; плейсхолдер — `#10231a`
- [X] T013 [P] [US1] Дополнить `frontend/src/features/videoCall/ui/VideoTile/__tests__/CallVideo.test.tsx`: `pointerdown` и `dblclick` по «Видео на паузе. Нажмите, чтобы продолжить» не всплывают (шпионы на обёртке не вызваны), клик по ней по-прежнему возобновляет видео (Edge Cases)

### Implementation for User Story 1

- [X] T014 [US1] Создать `frontend/src/features/videoCall/model/callFullscreen.model.ts` по data-model.md §3: сторы `$isFullscreen`, `$controlsVisible`, `$isControlsHovered`, `$isControlsFocused`, `$isCursorHidden`; события `fullscreenToggled`, `escapePressed`, `activityDetected`, `controlsHovered`, `controlsUnhovered`, `controlsFocused`, `controlsBlurred`; внутренние `fullscreenEntered` / `fullscreenExited` как `sample` от `$isFullscreen.updates`, `autoHideScheduled`, `debounce` из `patronum` на `CONTROLS_AUTO_HIDE_MS` с `filter` в момент срабатывания (research R4); сброс по `callModel.callTerminated`. Порядок: сторы → события → `sample`; без `.on` / `.watch`; < 200 строк
- [X] T015 [US1] В `frontend/src/features/videoCall/model/index.ts` добавить `export * as callFullscreenModel from "./callFullscreen.model";`
- [X] T016 [P] [US1] Создать `frontend/src/features/videoCall/ui/ActiveCallScreen/ActiveCallScreen.constants.ts` (`TAP_MAX_DURATION_MS = 250`, `TAP_MOVE_TOLERANCE_PX = 10`, `DOUBLE_TAP_INTERVAL_MS = 300`, `DOUBLE_TAP_DISTANCE_PX = 30`, `INTERACTIVE_SELECTOR = "button, [role=\"button\"], a"`, `DIALOG_SELECTOR = "[role=\"dialog\"], [aria-modal=\"true\"]"`), `ActiveCallScreen.types.ts` (`TapSample { x, y, time }`, `PointerStart`) и `ActiveCallScreen.helpers.ts` (`isTap`, `isDoubleTap`, `isInteractiveTarget`, `isInsideDialog`) — research R7, R8
- [X] T017 [US1] Создать `frontend/src/features/videoCall/ui/ActiveCallScreen/ActiveCallScreen.hooks.ts`: `useFullscreenEscape()` — `useEffect` с `keydown` на `document` (всплытие), шлёт `escapePressed` из `useUnit({ escapePressed: callFullscreenModel.escapePressed })` (scope-bound), если `key === "Escape"`, не `defaultPrevented`, не `isComposing`, цель не `isInsideDialog`; `useDoubleTapToggle()` — возвращает обработчики `onPointerDown`, `onPointerUp`, `onPointerCancel`, `onDoubleClick` для `RemoteWrap`: состояние в `useRef` (активные указатели, прошлое касание, тип последнего указателя), двойное касание пальцем / пером → `fullscreenToggled`, многопальцевый жест сбрасывает детектор, `onDoubleClick` срабатывает только после мышиного `pointerdown`; интерактивные цели (`isInteractiveTarget`) игнорируются (research R7, R8)
- [X] T018 [US1] Подключить `frontend/src/features/videoCall/ui/FullscreenToggleButton/FullscreenToggleButton.tsx`: `useUnit(callFullscreenModel.$isFullscreen)` и `useUnit({ toggle: callFullscreenModel.fullscreenToggled })`; убрать импорт мока и 2 маркера `TODO(auto-feature)`; `onDoubleClick` со `stopPropagation` оставить
- [X] T019 [US1] Создать `frontend/src/features/videoCall/ui/FullscreenControls/FullscreenControls.helpers.ts` (`isMousePointer`, `isFocusLeaving`, `isKeyboardFocus` с `try/catch`, research R6) и подключить `frontend/src/features/videoCall/ui/FullscreenControls/FullscreenControls.tsx`: `useUnit(callFullscreenModel.$controlsVisible)`, `onFocus` → `controlsFocused` только при `isKeyboardFocus(event.target)`, `onBlur` → `controlsBlurred` только при `isFocusLeaving`; убрать `onMouseOver` / `onMouseOut`, импорт мока и 3 маркера `TODO(auto-feature)`. В `FullscreenTopBar.tsx` и `FullscreenBottomBar.tsx` на корневой бар повесить `onPointerEnter` / `onPointerLeave` → `controlsHovered` / `controlsUnhovered` только для мыши (`isMousePointer`)
- [X] T020 [US1] Подключить `frontend/src/features/videoCall/ui/ActiveCallScreen/ActiveCallScreen.tsx`: `useUnit(callFullscreenModel.$isFullscreen)`, `$controlsVisible`, `$isCursorHidden`, события `activityDetected`; на `Root` — `onPointerMove` (только мышь), `onPointerDown`, `onKeyDown` → `activityDetected` (research R5), `data-cursor-hidden`; вызвать `useFullscreenEscape()`; на `RemoteWrap` — обработчики `useDoubleTapToggle()` и `data-testid="remote-stage"` вместо `onDoubleClick={() => toggleFullscreen()}`; порядок детей не менять (комментарий про неперемонтирование `<video>` оставить); убрать импорт мока и 4 маркера `TODO(auto-feature)`; файл < 150 строк. В `ActiveCallScreen.styled.ts` у `RemoteWrap` `touchAction: "manipulation"` (research R8)
- [X] T021 [US1] В `frontend/src/features/videoCall/ui/VideoTile/CallVideo.tsx` у `Styled.ResumeOverlay` добавить `onPointerDown` и `onDoubleClick` со `event.stopPropagation()` — касание по «Видео на паузе…» не показывает панель и не переключает режим (research R5)
- [X] T022 [US1] E2E в `frontend/e2e/students/video-call.spec.ts`: вынести подготовку соединённого звонка из первого теста в локальную функцию файла (`connectTutorStudentCall`) без изменения его поведения; новый тест `"учитель разворачивает собеседника во весь экран и сворачивает обратно, звонок продолжается"`: после соединения клик «Во весь экран» → видна кнопка «Свернуть», `getByTestId("local-pip")` скрыт; `getByTestId("fullscreen-controls")` получает `data-visible="false"` (ожидание `toHaveAttribute` с `timeout`, без `waitForTimeout`); `page.mouse.move` → `data-visible="true"`; `Escape` → снова «Во весь экран», «Завершить звонок» видна у обеих сторон; двойной щелчок по `getByTestId("remote-stage")` включает режим, ещё один — выключает; в конце завершить звонок. Теги describe не меняются (`@regression`, `@students`)

**Checkpoint**: US1 работает и тестируется независимо; масштаб пока на моке (кнопки масштаба в режиме видны, но не действуют до US2)

---

## Phase 4: User Story 2 — Приблизить часть демонстрации (Priority: P2)

**Goal**: в режиме при демонстрации собеседника — масштаб 1×–4× щипком,
колесом и «+» / «−» (шаг 0,5×), сдвиг пальцем / мышью в границах картинки,
«Исходный размер»; сбросы при выходе, конце демонстрации, повороте, конце
звонка; без демонстрации жесты и кнопки не действуют.

**Independent Test**: spec.md US2 — телефон 375×812, демонстрация
компьютера, режим включён: щипок увеличивает, палец двигает, «Исходный
размер» возвращает 100 %; на компьютере колесо масштабирует вокруг курсора.

### Tests for User Story 2 (пишутся первыми и падают) ⚠️

- [X] T023 [P] [US2] Создать `frontend/src/features/videoCall/model/__tests__/callZoom.helpers.test.ts`: `clampScale`; `getContentSize` (16:9 в портретном боксе 375×812 → 375×211; без метаданных → бокс); `getMaxOffset` (при `scale = 1` → 0; при 4× в боксе 1440×810 с 16:9 → `{ x: 2160, y: 1215 }`; ось, где картинка уже окна, → 0); `clampZoom` (зажимает за краем, `scale = 1` → смещения 0, `null` geometry → 0); `zoomAt` (точка под курсором остаётся на месте: проверка `p = t₁ + s₁·x`; масштаб не выходит за 1 и 4; на 1 смещения 0); `panBy` (в границах; при `scale = 1` без изменений); `getNextZoomStep` / `getPrevZoomStep` (1 → 1.5, 1.7 → 2 / 1.5, 2 → 2.5 / 1.5, 4 → 4, 1 → 1, погрешность float 1.4999999 → 1.5); `getStageOrientation`
- [X] T024 [P] [US2] Создать `frontend/src/features/videoCall/model/__tests__/callZoom.model.test.ts` (fork со значениями `callFullscreenModel.$isFullscreen`, `callModel.$peerMediaState`, `callZoomModel.$stageGeometry`): «+» трижды → 2.5, `$canZoomIn` ложно на 4, `$canZoomOut` ложно на 1, `$isZoomed`; «−» до упора → `ZOOM_RESET`; `zoomReset`; `zoomedAt` вокруг точки и в границах; `panned` зажимается; все входы игнорируются вне режима и без демонстрации собеседника (FR-011); сброс при выходе из режима, при `screenSharing → false`, при `callModel.callTerminated`, при смене ориентации (`stageGeometryChanged` 1440×810 → 810×1440); сужение бокса без смены ориентации пересчитывает смещение в новые границы, масштаб сохраняется; `stageGeometryChanged(null)` пишет `null`
- [X] T025 [P] [US2] Создать `frontend/src/features/videoCall/ui/ZoomControls/__tests__/ZoomControls.test.tsx` (fork, режим включён, собеседник показывает экран): группа `role="group"` «Масштаб демонстрации», «100%», «Уменьшить» недоступна; «Увеличить» → «150%», появилась «Исходный размер»; «Исходный размер» → «100%», кнопка исчезла; на 4× «Увеличить» недоступна; `formatZoomPercent` (1 → «100%», 1.234 → «123%»)
- [X] T026 [P] [US2] Дополнить `frontend/src/features/videoCall/ui/VideoTile/__tests__/VideoTile.helpers.test.ts`: `toCenterOffset` (точка клиента → смещение от центра `DOMRect`), `getPointerDistance`, `getPointerMidpoint`, `getWheelZoomFactor` (`deltaY < 0` → > 1; `ctrlKey` чувствительнее; `deltaMode` строк и страниц); удалить проверки `getZoomTransform`, если есть
- [X] T027 [US2] Дополнить `frontend/src/features/videoCall/ui/VideoTile/__tests__/CallVideo.test.tsx` (после T013, тот же файл; fork + `EffectorProvider`, `vi.stubGlobal("ResizeObserver", …)` с ручным вызовом колбэка, заглушки `setPointerCapture` / `releasePointerCapture`, `getBoundingClientRect`, `videoWidth` / `videoHeight`): при `zoomable` и `$zoom = { 2, 40, -20 }` на `<video>` `--call-zoom-scale: 2`, `--call-zoom-x: 40px`, `--call-zoom-y: -20px` и `data-zoomed="true"`; без `zoomable` свойства сняты; `wheel` с `deltaY < 0` → масштаб в scope > 1 и `defaultPrevented` (listener non-passive); два `pointerdown` с `pointerType: "touch"` и разведение `pointermove` → масштаб растёт; один указатель при масштабе > 1 → смещение меняется; при масштабе 1 один палец ничего не двигает; `ResizeObserver` → `$stageGeometry` с размерами бокса и видео; размонтирование → `stageGeometryChanged(null)` и снятие подписок

### Implementation for User Story 2

- [X] T028 [US2] Создать `frontend/src/features/videoCall/model/callZoom.helpers.ts` по data-model.md §4 «Чистые функции»: `clampScale`, `getContentSize`, `getMaxOffset`, `clampZoom`, `zoomAt`, `panBy`, `getNextZoomStep`, `getPrevZoomStep`, `getStageOrientation` (research R10, R11)
- [X] T029 [US2] Создать `frontend/src/features/videoCall/model/callZoom.model.ts` по data-model.md §4: `$zoom`, `$stageGeometry`, `$stageOrientation`, `$isZoomAvailable` (`combine` `callFullscreenModel.$isFullscreen` и `callModel.$peerMediaState`), `$isZoomed`, `$canZoomIn`, `$canZoomOut`; события `zoomInClicked`, `zoomOutClicked`, `zoomReset`, `zoomedAt`, `panned`, `stageGeometryChanged`; все входы с `filter: $isZoomAvailable`; сброс по `zoomReset`, `$isZoomAvailable` → `false`, `$stageOrientation.updates`, `callModel.callTerminated`; пересчёт `clampZoom` по `$stageGeometry.updates`; `fn` — функции из `callZoom.helpers.ts`; < 200 строк. В `frontend/src/features/videoCall/model/index.ts` добавить `export * as callZoomModel from "./callZoom.model";`
- [X] T030 [US2] Подключить `frontend/src/features/videoCall/ui/ZoomControls/ZoomControls.tsx`: `useUnit(callZoomModel.$zoom)`, `$canZoomIn`, `$canZoomOut`, `$isZoomed` (отдельными вызовами), события объектом (`zoomInClicked`, `zoomOutClicked`, `zoomReset`); `disabled` от `$canZoomIn` / `$canZoomOut`, «Исходный размер» при `$isZoomed`; из `ZoomControls.constants.ts` удалить `ZOOM_MIN_SCALE` / `ZOOM_MAX_SCALE`; убрать импорт мока и 4 маркера `TODO(auto-feature)`
- [X] T031 [P] [US2] В `frontend/src/features/videoCall/ui/VideoTile/VideoTile.constants.ts` добавить `WHEEL_ZOOM_SENSITIVITY = 0.002`, `PINCH_WHEEL_ZOOM_SENSITIVITY = 0.01`, `WHEEL_LINE_HEIGHT_PX = 16`, имена CSS-переменных (`ZOOM_SCALE_VAR = "--call-zoom-scale"` и т. п.); в `VideoTile.helpers.ts` удалить `getZoomTransform` и импорт `CallZoom`, добавить `toCenterOffset`, `getPointerDistance`, `getPointerMidpoint`, `getWheelZoomFactor`; типы точек жеста — в `VideoTile.types.ts` (research R12)
- [X] T032 [US2] В `frontend/src/features/videoCall/ui/VideoTile/VideoTile.styled.ts` у `VideoElement` убрать проп `$zoom` и импорт `getZoomTransform`; добавить `$zoomable: boolean` — `touchAction: "none"`, `willChange: "transform"` только при `$zoomable`; `transform: "translate(var(--call-zoom-x, 0px), var(--call-zoom-y, 0px)) scale(var(--call-zoom-scale, 1))"`, `transformOrigin: "center"`; `cursor: "grab"` по `&[data-zoomed="true"]` (research R13)
- [X] T033 [US2] В `frontend/src/features/videoCall/ui/VideoTile/VideoTile.hooks.ts` добавить: `useZoomTransform(videoRef, enabled)` — `useUnit(callZoomModel.$zoom)`, в `useLayoutEffect` `style.setProperty` / `removeProperty` трёх CSS-переменных; `useZoomGestures(videoRef, enabled)` — нативные `wheel` (`passive: false`, `preventDefault`), `pointerdown` / `pointermove` / `pointerup` / `pointercancel` с `setPointerCapture`, `gesturestart` / `gesturechange` с `preventDefault`; указатели в `useRef<Map>`; события `zoomedAt` / `panned` через `useUnit` (scope-bound); `useStageGeometry(videoRef, enabled)` — `ResizeObserver` на видео + `loadedmetadata` / `resize`, `stageGeometryChanged(geometry | null)`; все подписки снимаются в cleanup (research R12, R13)
- [X] T034 [US2] Подключить `frontend/src/features/videoCall/ui/VideoTile/CallVideo.tsx`: вызвать `useZoomTransform`, `useZoomGestures`, `useStageGeometry` с `zoomable`; передать `$zoomable` и `data-zoomed` (`useUnit(callZoomModel.$isZoomed)` при `zoomable`); убрать проп `$zoom`, импорт мока и маркер `TODO(auto-feature)`; файл < 150 строк
- [X] T035 [US2] В `frontend/src/features/videoCall/ui/FullscreenControls/FullscreenBottomBar.tsx` показывать `ZoomControls` по `useUnit(callZoomModel.$isZoomAvailable)` вместо `$peerMediaState.screenSharing` (одно определение доступности, FR-011)
- [X] T036 [US2] Проверить, отдаёт ли `getDisplayMedia` поток в e2e-Chromium с флагами из `frontend/e2e/students/video-call.spec.ts` (добавив при необходимости `--auto-select-desktop-capture-source=Entire screen` в `launchOptions.args` файла): если ученик начинает демонстрацию кнопкой «Демонстрация экрана» — дописать в тест из T022 шаг: в режиме у репетитора видна группа «Масштаб демонстрации», «Увеличить» → «150%» и «Исходный размер», «Исходный размер» → «100%». Если поток не получить — шаг не добавлять и указать в описании PR, что US2 покрыт юнит- и компонентными тестами и ручным QA (research R16)

**Checkpoint**: US1 и US2 работают; моки больше нигде не читаются

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: снос макета, гейты качества, ручная проверка, CHANGELOG

- [X] T037 Удалить временные части макета (research R14): файл `frontend/src/features/videoCall/callFullscreenMock.helpers.ts`; папку `frontend/src/pages/callFullscreenMockup/` целиком; в `frontend/src/app/components/AppRoutes/AppRoutes.constants.ts` — `CallFullscreenMockupPage` и маркер; в `frontend/src/app/components/AppRoutes/AppRoutes.tsx` — импорт `CallFullscreenMockupPage`, маршрут `/__mockup/call-fullscreen` и маркер. `docs/mockups/039-call-fullscreen/` не трогать
- [X] T038 Финальная проверка сноса: из worktree `grep -rn "TODO(auto-feature)\|callFullscreenMock\|getCallFullscreenMock\|mockCallFullscreenEvent\|CallFullscreenMockup\|__mockup/call-fullscreen\|getZoomTransform" frontend/src` — пусто; пустых файлов не осталось; `ZOOM_MIN_SCALE` / `ZOOM_MAX_SCALE` объявлены только в `model/callFullscreen.constants.ts`
- [X] T039 Гейты: из корня worktree `npm run check` до зелёного, затем один раз `npm run check -- --full`; из `frontend/` `npm run find-cycle`. Бэкенд не менялся — `git diff --stat main -- backend` пуст
- [X] T040 Перечитать `docs/conventions/frontend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/e2e-testing.md` и вручную сверить весь новый и изменённый код: named exports, function expressions, `type` + `import type`, без `any`, `index.ts` в новых папках, без deep-импортов (модели через `../../model`), без `style={{}}` / `sx` (CSS-переменные только через ref, Complexity Tracking), константы / хелперы / хуки / типы / стили в отдельных файлах, в файлах компонентов только компонент, компоненты < 150 строк, модели < 200, только `sample` + `useUnit` (сторы отдельными вызовами), `fn` чистые, таймер — patronum в модели, `useEffect` только для DOM-подписок, `aria-label` у кнопок-иконок на русском, минимум комментариев; в тестах `createWatch` вместо `.watch`, `vi.restoreAllMocks()` / `vi.unstubAllGlobals()` в `afterEach`
- [ ] T041 Пройти `specs/039-call-fullscreen/quickstart.md` §3–§5 вручную: компьютер 1440×900 (в т. ч. щипок тачпада и колесо), эмуляция 375×812 и 812×375; на реальном iPhone (Safari) — двойное касание, щипок, поворот, «Видео на паузе» в режиме. Найденные расхождения со спекой — исправить с регрессионным тестом
- [X] T042 Запустить `/changelog` и закоммитить обновлённый `CHANGELOG.md` вместе с последним коммитом фичи (`/news` на этом этапе пайплайна не запускается)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: сразу
- **Foundational (T002–T004)**: после Setup; блокирует обе истории
  (константы и типы нужны обеим моделям)
- **US1 (T005–T022)**: после Foundational; от US2 не зависит
- **US2 (T023–T036)**: после Foundational и T014–T015 (`callZoom.model`
  читает `callFullscreenModel.$isFullscreen`); компонентные части US2
  (T027, T034, T035) — после US1, потому что меняют те же файлы
- **Polish (T037–T042)**: после обеих историй. T037 нельзя раньше T034:
  до этого `CallVideo` и `ZoomControls` ещё читают мок-модуль

### Файловые пересечения (нельзя параллелить)

- `CallVideo.test.tsx`: T013 → T027
- `VideoTile.helpers.test.ts`: T012 → T026
- `CallVideo.tsx`: T021 → T034
- `model/index.ts`: T015 → T029
- `FullscreenControls/*`: T019 → T035
- `VideoTile.helpers.ts` / `.constants.ts` / `.types.ts`: T031 → T032, T033 → T034
- `ActiveCallScreen.*`: T016 → T017 → T020

### Внутри истории

- Тесты пишутся до реализации, падают, затем закрываются реализацией
- Модель → хелперы / хуки → компоненты → e2e
- Снятие маркеров `TODO(auto-feature)` — последний шаг соответствующей задачи

### Parallel Opportunities

- Phase 2: T002, T003, T004
- Phase 3, тесты: T005–T013 (разные файлы); реализация: T016 параллельно T014
- Phase 4, тесты: T023–T026; реализация: T028 и T031 параллельны
- US2-модель (T023, T024, T028, T029) можно вести параллельно с компонентной частью US1 (T017–T022) другим исполнителем

---

## Parallel Example: User Story 1

```text
T005 callFullscreen.model.test.ts         T006 ActiveCallScreen.helpers.test.ts
T007 FullscreenControls.helpers.test.ts   T008 FullscreenToggleButton.test.tsx
T009 FullscreenControls.test.tsx          T010 ActiveCallScreen.test.tsx
T011 VideoTile.test.tsx
T012 VideoTile.helpers.test.ts            T013 CallVideo.test.tsx
```

## Parallel Example: User Story 2

```text
T023 callZoom.helpers.test.ts   T024 callZoom.model.test.ts
T025 ZoomControls.test.tsx      T026 VideoTile.helpers.test.ts
T028 callZoom.helpers.ts        T031 VideoTile.constants / helpers / types
```

---

## Implementation Strategy

### MVP

Phase 1 + Phase 2 + Phase 3 (US1): режим на всё окно с автоскрытием панели,
Esc, двойным щелчком и касанием. Демонстрация уже заметно крупнее
(SC-001, SC-002). Проверяется по Independent Test истории 1. Сдавать MVP
без US2 можно только вместе с T037–T038 и с убранной группой масштаба:
кнопки на моке в проде недопустимы.

### Инкременты

1. **MVP**: US1 — во весь экран
2. **+US2**: масштаб и сдвиг демонстрации
3. **Phase 5**: снос макета, гейты, ручная проверка, CHANGELOG. **Обязательно**

### Чего делать НЕ нужно (вне рамок спеки)

- Системного полноэкранного режима (Fullscreen API) и кнопки для него
- Масштаба камеры собеседника и масштаба в обычном виде
- Сохранения режима или масштаба между звонками и передачи их собеседнику
- Изменений бэкенда, БД, сигналинга
