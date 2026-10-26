# Research: Полноэкранный режим в звонке

**Feature**: `039-call-fullscreen` | **Date**: 2026-10-23 | **Plan**: [plan.md](./plan.md)

Неизвестных в Technical Context нет: границы закрыты спекой и пятью
Clarifications, UI утверждён на макетах (`docs/mockups/039-call-fullscreen/index.md`).
Ниже — решения реализации, на которых стоят задачи.

## R1. Режим — раскладка экрана звонка, а не Fullscreen API

- **Decision**: «Во весь экран» — состояние `ActiveCallScreen`: без шапки,
  без отступов `StageBox`, без `maxWidth` у `RemoteWrap`, без своего превью,
  плитка собеседника в варианте `fullscreen` (`bare`: без рамки, радиуса и
  плашек), вместо `CallControlBar` — слой `FullscreenControls`. Экран звонка
  уже `position: fixed; inset: 0` поверх приложения (`CallOverlay`), так что
  этого достаточно, чтобы занять всё окно. `requestFullscreen` не вызывается.
- **Rationale**: спека прямо исключает системный полноэкранный режим
  (Assumptions, SC-005); на iPhone Fullscreen API для произвольного элемента
  недоступен.
- **Инвариант**: порядок детей `Root` и `TileBox` одинаков в обоих видах
  (условные узлы стоят на своих местах как `false`), поэтому `<video>`
  собеседника не перемонтируется при переключении. Перемонтирование
  означало бы новый `srcObject`, новый `play()` и на iOS риск «Видео на
  паузе» — закрывается регрессионным тестом (тот же DOM-узел до и после).
- **Alternatives considered**: Fullscreen API с фолбэком — вне скоупа;
  отдельный компонент `FullscreenCallScreen` — перемонтировал бы видео.

## R2. Две модели: режим и масштаб

- **Decision**: `features/videoCall/model/callFullscreen.model.ts`
  (режим, видимость панели, автоскрытие) и
  `features/videoCall/model/callZoom.model.ts` (масштаб, сдвиг, геометрия
  сцены). Экспорт из `model/index.ts`: `callFullscreenModel`,
  `callZoomModel`. Константы — `callFullscreen.constants.ts`, типы —
  `callFullscreen.types.ts`, чистая математика — `callZoom.helpers.ts`.
- **Rationale**: «Business logic in models», «Split models by domain»,
  «Models < 200 lines». Режим сбрасывается событием `callModel.callTerminated`,
  которое живёт в модели, — локальный `useState` в компоненте этого не видел бы.
  Масштаб зависит от режима и от `$peerMediaState`, но не наоборот —
  зависимость моделей односторонняя (`callZoom` → `callFullscreen` → `call`).
- **Alternatives considered**: одна модель `callFullscreenModel` (как в TODO
  макета) — выходит за 200 строк и смешивает два домена; состояние в React —
  против конвенций.

## R3. Когда режим доступен и когда сбрасывается

- **Decision**: кнопка и двойной щелчок работают на всём `ActiveCallScreen`,
  то есть в фазах `connecting` и `active` (Clarification 1). `$isFullscreen`
  сбрасывается в `false` по `callModel.callTerminated` (любое завершение:
  `hangUp`, обрыв, ошибка — все пути проходят через `callEnding` →
  `callTerminated`), по «Свернуть», Esc и двойному щелчку. Ничего
  не сохраняется между звонками и не уходит собеседнику.
- **Rationale**: FR-001, FR-007, Key Entities. Фаза `active` → `connecting`
  в коде не бывает (`connecting` только после принятия вызова), поэтому
  баннер «Соединение…» в режиме — это начальное соединение (макет 07).

## R4. Автоскрытие панели — patronum `debounce`

- **Decision**: `autoHideScheduled` (внутреннее событие) срабатывает при
  входе в режим, на каждую активность в режиме, при уходе курсора с панели
  и при потере клавиатурного фокуса. `debounce({ source: autoHideScheduled,
  timeout: CONTROLS_AUTO_HIDE_MS /* 3000 */ })` → `sample` с `filter`:
  режим включён, курсор не над панелью, клавиатурного фокуса в панели нет →
  `$controlsVisible = false`. Каждая новая активность перезапускает таймер
  (так работает `debounce`), отменять его не нужно: условие проверяется
  в момент срабатывания.
- **Rationale**: конвенция требует таймеры внутри модели через patronum;
  `debounce` — ровно семантика «через 3 с после последней активности».
  Он уже используется в `app/model/blocking.model.ts`.
- **Alternatives considered**: `delay` + счётчик поколения
  (как `callScreen.model.ts`) — больше кода ради того же; `interval` — не тот
  инструмент; `setTimeout` в компоненте — запрещён конвенцией и ESLint.
- **Тесты**: `vi.useFakeTimers()`, юниты запускаются fire-and-forget,
  `vi.advanceTimersByTimeAsync(3000)` (паттерн `callScreen.model.test.ts`).

## R5. Что считается активностью

- **Decision**: на `Root` экрана звонка: `onPointerMove` только для
  `pointerType === "mouse"` (движение пальца всегда начинается с
  `pointerdown`), `onPointerDown` для любого указателя, `onKeyDown` для любой
  клавиши. Все шлют `callFullscreenModel.activityDetected`; модель
  игнорирует его вне режима. Одиночное касание панель не прячет
  (Clarification 3) — модель вообще не умеет прятать панель по событию,
  только по таймеру. Щипок и перетаскивание — тоже касание, панель
  появляется (буквально по FR-004) и прячется через 3 с.
- **Исключение**: кнопка «Видео на паузе…» (`ResumeOverlay`) гасит
  `pointerdown` и `dblclick` (`stopPropagation`), поэтому касание по ней
  не показывает панель и не переключает режим (Edge Cases).
- **Rationale**: `$controlsVisible` не меняется при повторном `true`, так что
  поток `pointermove` даёт только перезапуск таймера, без ререндеров.
- **Alternatives considered**: показывать панель только по «тапу» (без
  щипка) — удобнее при разглядывании, но отходит от буквы FR-004; оставлено
  как возможное улучшение после QA.

## R6. Удержание панели курсором и клавиатурным фокусом

- **Decision**: два атомарных стора — `$isControlsHovered`,
  `$isControlsFocused`. Наведение — `onPointerEnter` / `onPointerLeave`
  на `TopBar` и `BottomBar` (только `pointerType === "mouse"`;
  сам `Layer` имеет `pointer-events: none` и событий не получает).
  Фокус — `onFocus` / `onBlur` на `Layer` (в React это всплывающие
  focusin/focusout); `controlsFocused` шлётся, только если цель
  `:focus-visible` (helper `isKeyboardFocus`, с `try/catch` на случай
  движка без поддержки селектора), `controlsBlurred` — только если
  `relatedTarget` вне слоя (переход фокуса между кнопками панели не
  снимает удержание). Скрытая панель остаётся в DOM (`opacity: 0`,
  `pointer-events: none`) — Tab доходит до кнопок и показывает её.
- **Rationale**: Clarification 4 — фокус, оставшийся на кнопке после щелчка
  мышью (Chrome фокусирует кнопку по клику), не должен держать панель вечно.
  Макетные `onMouseOver` / `onMouseOut` на `Layer` всплывают от каждого
  ребёнка и дёргают состояние при переходе между кнопками — заменяются.

## R7. Esc

- **Decision**: хук `useFullscreenEscape` в `ActiveCallScreen.hooks.ts`:
  `keydown` на `document` (фаза всплытия) через `useEffect` — это подписка
  на DOM-событие, не загрузка данных и не таймер. Шлёт
  `callFullscreenModel.escapePressed`, если `key === "Escape"`, событие не
  `defaultPrevented`, не `isComposing` и цель не внутри
  `[role="dialog"], [aria-modal="true"]` (helper `isInsideDialog`).
  Модель: `sample({ clock: escapePressed, filter: $isFullscreen, ... })`.
- **Rationale**: FR-006 и Edge Case про диалог поверх экрана звонка.
  MUI `Modal` по Esc зовёт `stopPropagation` на синтетическом событии; React
  слушает на корне и на контейнерах порталов, поэтому до `document` такой
  Esc не доходит — диалог с фокусом «съедает» его сам. Проверка
  `role="dialog"` — страховка для диалогов без этой логики.
- **Known limitation**: диалог, открытый *под* экраном звонка (z-index ниже)
  с ловушкой фокуса MUI, забирает фокус и первый Esc (закроется он, а не
  режим). Так ведёт себя Esc и сейчас; диалог карточки ученика при вызове
  закрывается (`StudentViewDialog.model.ts`), так что в основном сценарии
  этого не бывает.

## R8. Двойной щелчок и двойное касание

- **Decision**:
  - Мышь — `onDoubleClick` на `RemoteWrap`, если последний `pointerdown`
    был мышиным и цель не интерактивная (`button`, `[role="button"]`, `a`,
    helper `isInteractiveTarget`). Поэтому двойной щелчок по «Во весь экран»
    в углу плитки и по «Видео на паузе» режим не переключает.
  - Касание / перо — свой детектор на pointer events в хуке
    `useDoubleTapToggle` (`ActiveCallScreen.hooks.ts`): касание — один
    указатель, от `pointerdown` до `pointerup` ≤ `TAP_MAX_DURATION_MS`
    (250) и сдвиг ≤ `TAP_MOVE_TOLERANCE_PX` (10); два касания подряд
    ≤ `DOUBLE_TAP_INTERVAL_MS` (300) и ≤ `DOUBLE_TAP_DISTANCE_PX` (30) →
    `fullscreenToggled`. Многопальцевый жест сбрасывает детектор. Чистая
    часть — `isTap`, `isDoubleTap` в `ActiveCallScreen.helpers.ts`.
  - `RemoteWrap` в обычном виде получает `touch-action: manipulation` —
    браузер не зумит страницу по двойному касанию и не ждёт 300 мс.
- **Rationale**: iOS Safari не шлёт `dblclick` на двойное касание надёжно
  (подсказка макета). Отсечение `dblclick` после касания не даёт Android
  Chrome, который синтезирует `dblclick`, переключить режим дважды.
- **Двойное касание при увеличении** выключает режим (US2 сценарий 6),
  масштаб сбрасывается выходом из режима (R11).

## R9. Представление масштаба

- **Decision**: `CallZoom = { scale, offsetX, offsetY }` в
  `videoCall.types.ts`; `scale` ∈ [1, 4], смещения — CSS-пиксели от центра
  бокса видео, применяются как `translate(offsetX, offsetY) scale(scale)`
  с `transform-origin: center`. Один стор `$zoom` с объектом.
- **Rationale**: три поля меняются одним жестом и связаны ограничением
  (R10): раздельные сторы давали бы промежуточные несогласованные кадры.
  Это осознанное отступление от «Atomic stores» (Complexity Tracking).
  Пиксели вместо процентов макета: жесты приходят в пикселях, а при смене
  размера окна смещение всё равно пересчитывается ограничением.

## R10. Ограничение сдвига при `object-fit: contain`

- **Decision**: видео занимает весь бокс `W×H`, но картинка внутри вписана
  (`contain`): `content = fit(videoWidth×videoHeight → W×H)`. При масштабе
  `s` допустимый сдвиг по оси: `max = max(0, (s·contentSize − boxSize) / 2)`,
  смещение зажимается в `[−max, max]`; если увеличенная картинка уже окна
  по оси — она по центру (смещение 0). Без метаданных видео
  (`videoWidth === 0`) `content = box`. Функции `getContentSize`,
  `clampZoom` в `callZoom.helpers.ts`.
- **Rationale**: FR-009 «край картинки не уходит внутрь окна». Без
  собственных пропорций видео ограничение считалось бы по боксу и
  на телефоне (16:9 в портрете) позволило бы увести картинку в чёрные поля.

## R11. Масштаб вокруг точки, шаги кнопок, сбросы

- **Decision**:
  - Вокруг точки `p` (от центра бокса): `t₁ = p − (s₁ / s₀)·(p − t₀)`,
    затем `clampZoom` (`zoomAt` в helpers). Щипок — точка между пальцами,
    колесо — курсор, кнопки — центр (`p = 0`).
  - Кнопки (Clarification 5): `ZOOM_STEP = 0.5`, `getNextZoomStep(s) =
    min(4, floor(s / 0.5 + ε)·0.5 + 0.5)`, `getPrevZoomStep(s) =
    max(1, ceil(s / 0.5 − ε)·0.5 − 0.5)`. При `scale === 1` смещения 0.
  - Сброс в `{1, 0, 0}`: «Исходный размер», выход из режима, остановка
    демонстрации собеседником (`$peerMediaState.screenSharing` → `false`),
    смена ориентации (R13), `callTerminated`.
  - Любой ввод масштаба игнорируется, пока `$isZoomAvailable` (режим
    включён и собеседник показывает экран) ложно — FR-011.
  - Производные: `$isZoomed` (`scale > 1`), `$canZoomIn` (`< 4`),
    `$canZoomOut` (`> 1`). `ZOOM_MIN_SCALE` / `ZOOM_MAX_SCALE` переезжают
    из `ZoomControls.constants.ts` в `model/callFullscreen.constants.ts`.

## R12. Жесты: колесо, щипок, перетаскивание

- **Decision**: хук `useZoomGestures(videoRef, enabled)` в
  `VideoTile.hooks.ts`, навешивается только на видео демонстрации
  в полноэкранной плитке (`zoomable`).
  - **Колесо** — нативный `addEventListener("wheel", …, { passive: false })`:
    React вешает `wheel` пассивно, `preventDefault` из `onWheel` не работает,
    а `ctrl + wheel` (щипок тачпада) иначе масштабирует всю страницу.
    Коэффициент `exp(−deltaY·k)`, `k = 0.002` для колеса и `0.01` при
    `ctrlKey`; `deltaMode` строк → ×16 px, страниц → ×высота бокса
    (`getWheelZoomFactor`).
  - **Щипок и сдвиг** — Pointer Events с `setPointerCapture`; активные
    указатели в `Map` в `ref` хука. Два указателя → `zoomedAt({ factor:
    dist / prevDist, focusX, focusY })` вокруг середины и `panned` на сдвиг
    середины; один указатель при `scale > 1` → `panned({ dx, dy })`.
    Чистая часть — `getPointerDistance`, `getPointerMidpoint`,
    `toCenterOffset` в `VideoTile.helpers.ts`.
  - Видео получает `touch-action: none` (страница не зумится и не
    скроллится под пальцами) и, для WebKit, `preventDefault` на
    `gesturestart` / `gesturechange`.
- **Rationale**: FR-009, Assumption «жесты не включают масштаб страницы».
  Состояние жеста (позиции пальцев) — чисто визуальное, живёт в `ref`;
  результат — события модели, источник правды один.

## R13. Применение трансформации и геометрия сцены

- **Decision**:
  - Трансформация пишется не через styled-проп (как в макете
    `$zoom` → `getZoomTransform`: новый emotion-класс на каждый кадр
    жеста) и не через `style={{}}` (запрещено ESLint), а хуком
    `useZoomTransform(videoRef, zoom)`: в `useLayoutEffect`
    `element.style.setProperty("--call-zoom-x" | "--call-zoom-y" |
    "--call-zoom-scale", …)`. `VideoElement` в `.styled.ts` содержит
    `transform: translate(var(--call-zoom-x, 0px), var(--call-zoom-y, 0px))
    scale(var(--call-zoom-scale, 1))`. Когда видео не `zoomable`, свойства
    удаляются. `getZoomTransform` и проп `$zoom` удаляются.
  - Геометрия: хук `useStageGeometry(videoRef, enabled)` — `ResizeObserver`
    на `<video>` плюс медиасобытия `loadedmetadata` / `resize` (у
    демонстрации меняется `videoWidth`, когда собеседник выбирает другое
    окно) → `callZoomModel.stageGeometryChanged({ boxWidth, boxHeight,
    videoWidth, videoHeight })`; при выключении — `stageGeometryChanged(null)`.
  - Модель пересчитывает `clampZoom` на каждое изменение геометрии
    (окно на компьютере сузили), а смена ориентации бокса
    (`$stageOrientation`: `portrait` / `landscape` / `null`) сбрасывает
    масштаб — FR-010 «поворот экрана».
- **Rationale**: подсказки макета; в полноэкранном виде бокс видео = окно,
  так что ориентация бокса = ориентация экрана, а отдельная подписка
  на `orientationchange` (устаревшее, по-разному на iOS) не нужна.
- **Производительность**: на кадр жеста — обновление `$zoom` и ререндер
  одного `CallVideo`; `ZoomControls` перерисовывает подпись процента.

## R14. Перенос макета в рабочий код

- **Decision**: утверждённые файлы макета остаются на своих местах;
  меняются источники данных: `FullscreenToggleButton`, `ZoomControls`,
  `FullscreenControls`, `ActiveCallScreen`, `CallVideo` читают модели через
  `useUnit`. Удаляются: `features/videoCall/callFullscreenMock.helpers.ts`,
  `pages/callFullscreenMockup/` целиком, маршрут `/__mockup/call-fullscreen`
  и `CallFullscreenMockupPage` в `app/components/AppRoutes/AppRoutes.tsx` /
  `AppRoutes.constants.ts`; все 19 маркеров `TODO(auto-feature)`.
  `docs/mockups/039-call-fullscreen/` остаётся (документация).
- Рефакторинг макета, который остаётся: `ScreenShareLabel` вынесен из
  `VideoTile`, `SHORT_STAGE_*` переехали в `videoCall.constants.ts`,
  `getTileBackground` в `VideoTile.helpers.ts`.

## R15. Доступность

- `aria-label` у всех новых кнопок-иконок («Во весь экран» / «Свернуть»,
  «Увеличить», «Уменьшить»; «Исходный размер» — с текстом), группа масштаба
  `role="group"` с `aria-label="Масштаб демонстрации"`, процент —
  `aria-live="polite"` (FR-012, макет). Скрытая панель доступна с
  клавиатуры (R6), Esc — R7. Курсор прячется только при скрытой панели.

## R16. Тестовая стратегия

- **Юнит (fork, Vitest)**: `callFullscreen.model` (переключение, Esc,
  сброс на `callTerminated`, автоскрытие 3 с, перезапуск, удержание
  наведением / фокусом), `callZoom.model` (шаги, границы, ограничение,
  `zoomedAt`, `panned`, сбросы, игнор без демонстрации / вне режима,
  пересчёт и сброс по геометрии), `callZoom.helpers`, хелперы жестов
  и двойного касания.
- **Компонентные (RTL, happy-dom)**: `ActiveCallScreen` (вход / выход,
  нет шапки и превью, тот же `<video>`, Esc, двойной щелчок, двойной щелчок
  по кнопке не переключает, баннер и «Видео на паузе» в режиме),
  `FullscreenControls`, `FullscreenToggleButton`, `ZoomControls`,
  `CallVideo` (CSS-переменные, колесо, щипок / сдвиг через pointer events,
  геометрия через заглушку `ResizeObserver`), `VideoTile` (вариант
  `fullscreen` без плашек, кнопка только в `remote`).
  `happy-dom` 20 знает `PointerEvent` и `ResizeObserver`, но наблюдатель
  сам не срабатывает — тесты подменяют его через `vi.stubGlobal`.
- **E2E**: в `frontend/e2e/students/video-call.spec.ts` — вход кнопкой,
  автоскрытие (`data-visible="false"` с таймаутом ожидания, без
  `waitForTimeout`), появление по движению мыши, выход Esc и двойным
  щелчком, звонок продолжается у обеих сторон. Масштаб в e2e не
  проверяется: щипок фейковым устройством не воспроизвести; если
  `getDisplayMedia` под флагами fake-UI отдаёт поток — добавить проверку
  кнопок масштаба, иначе — ручной QA на iPhone (quickstart.md).

## R17. Бэкенд, БД, API

- **Decision**: без изменений. Нет новых эндпоинтов, WebSocket-сообщений,
  таблиц и миграций; ничего не сохраняется и не передаётся собеседнику
  (Key Entities). Каталог `contracts/` не создаётся — внешних контрактов
  нет; публичный интерфейс моделей для UI описан в [data-model.md](./data-model.md).
