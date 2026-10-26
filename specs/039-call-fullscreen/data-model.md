# Data Model: Полноэкранный режим в звонке

**Feature**: `039-call-fullscreen` | **Date**: 2026-10-23 | **Plan**: [plan.md](./plan.md)

Серверных сущностей нет: ни таблиц, ни полей, ни DTO, ни WebSocket-сообщений.
Всё состояние — клиентское, в памяти вкладки, на время одного звонка.
Ниже — сторы, события и инварианты двух Effector-моделей и тип, который
они делят с UI.

## 1. Типы

`frontend/src/features/videoCall/videoCall.types.ts` (уже есть из макета, меняется комментарий):

```ts
// Offsets are CSS pixels from the centre of the video box, applied before the scale.
export type CallZoom = {
  scale: number;   // 1..4
  offsetX: number; // px
  offsetY: number; // px
};
```

`frontend/src/features/videoCall/model/callFullscreen.types.ts` (новый):

```ts
// The peer's video box on screen and the intrinsic size of the picture inside it.
export type StageGeometry = {
  boxWidth: number;
  boxHeight: number;
  videoWidth: number;  // 0 until metadata arrives
  videoHeight: number;
};

export type StageOrientation = "portrait" | "landscape";

// A zoom gesture around a point given relative to the box centre.
export type ZoomAtPayload = { factor: number; focusX: number; focusY: number };

export type PanPayload = { dx: number; dy: number };
```

## 2. Константы

`frontend/src/features/videoCall/model/callFullscreen.constants.ts` (новый):

| Константа | Значение | Откуда |
|-----------|----------|--------|
| `CONTROLS_AUTO_HIDE_MS` | `3000` | FR-004, Assumptions |
| `ZOOM_MIN_SCALE` | `1` | FR-009 (переезжает из `ZoomControls.constants.ts`) |
| `ZOOM_MAX_SCALE` | `4` | FR-009 (переезжает из `ZoomControls.constants.ts`) |
| `ZOOM_STEP` | `0.5` | Clarification 5 |
| `ZOOM_RESET: CallZoom` | `{ scale: 1, offsetX: 0, offsetY: 0 }` | R11 |

Константы жестов — в UI, рядом с хуками:
`ActiveCallScreen.constants.ts` — `TAP_MAX_DURATION_MS = 250`,
`TAP_MOVE_TOLERANCE_PX = 10`, `DOUBLE_TAP_INTERVAL_MS = 300`,
`DOUBLE_TAP_DISTANCE_PX = 30`, `INTERACTIVE_SELECTOR`, `DIALOG_SELECTOR`;
`VideoTile.constants.ts` — `WHEEL_ZOOM_SENSITIVITY = 0.002`,
`PINCH_WHEEL_ZOOM_SENSITIVITY = 0.01`, `WHEEL_LINE_HEIGHT_PX = 16`.

## 3. `callFullscreen.model.ts` → `callFullscreenModel`

### Сторы

| Стор | Тип | Начальное | Смысл |
|------|-----|-----------|-------|
| `$isFullscreen` | `boolean` | `false` | Режим включён |
| `$controlsVisible` | `boolean` | `true` | Панель видна (в обычном виде всегда `true`) |
| `$isControlsHovered` | `boolean` | `false` | Мышь над верхней или нижней панелью |
| `$isControlsFocused` | `boolean` | `false` | Клавиатурный фокус внутри панели |
| `$isCursorHidden` | `boolean` (derived) | — | `$isFullscreen && !$controlsVisible` |

### События (публичные)

| Событие | Payload | Кто шлёт |
|---------|---------|----------|
| `fullscreenToggled` | — | «Во весь экран» / «Свернуть», двойной щелчок / касание по видео |
| `escapePressed` | — | `useFullscreenEscape` (document `keydown`) |
| `activityDetected` | — | `Root` экрана звонка: движение мыши, `pointerdown`, `keydown` |
| `controlsHovered` / `controlsUnhovered` | — | `TopBar` / `BottomBar`, `pointerenter` / `pointerleave` мыши |
| `controlsFocused` / `controlsBlurred` | — | `Layer`, `focus` с `:focus-visible` / `blur` наружу |

Внутренние: `fullscreenEntered`, `fullscreenExited` (производные `sample`),
`autoHideScheduled`, `autoHideElapsed = debounce(autoHideScheduled, 3000)`.

### Переходы

```text
                 fullscreenToggled
   normal  ───────────────────────────▶  fullscreen (controls visible, timer armed)
     ▲                                        │
     │  fullscreenToggled | escapePressed     │ activityDetected → visible, timer re-armed
     │  | callModel.callTerminated            │ autoHideElapsed ∧ ¬hovered ∧ ¬focused → hidden
     └────────────────────────────────────────┘ controlsUnhovered | controlsBlurred → timer re-armed
```

- `fullscreenToggled`: `$isFullscreen ← !$isFullscreen`.
- `escapePressed` при `$isFullscreen` → `fullscreenExited`; вне режима — ничего.
- `callModel.callTerminated` → `$isFullscreen ← false` (FR-007).
- Вход: `$controlsVisible ← true`, `autoHideScheduled` (Clarification 2).
- Выход: `$controlsVisible ← true`, `$isControlsHovered ← false`,
  `$isControlsFocused ← false` (у обычного вида своя панель, без автоскрытия).
- `activityDetected` при `$isFullscreen` → `$controlsVisible ← true`,
  `autoHideScheduled`. Вне режима игнорируется.
- `controlsUnhovered`, `controlsBlurred` → флаг `false` и `autoHideScheduled`
  (при `$isFullscreen`).
- `autoHideElapsed` с `filter: $isFullscreen ∧ ¬$isControlsHovered ∧
  ¬$isControlsFocused` → `$controlsVisible ← false`.

### Инварианты

- В обычном виде `$controlsVisible === true` и курсор не прячется.
- Одиночное касание панель не прячет: прячет только `autoHideElapsed`
  (Clarification 3).
- Режим не трогает `$selfMediaState`, `$peerMediaState`, потоки
  и соединение (FR-005, FR-006).

## 4. `callZoom.model.ts` → `callZoomModel`

### Сторы

| Стор | Тип | Начальное | Смысл |
|------|-----|-----------|-------|
| `$zoom` | `CallZoom` | `ZOOM_RESET` | Масштаб и сдвиг демонстрации |
| `$stageGeometry` | `StageGeometry \| null` | `null` | Бокс видео и размер картинки; `null`, пока видео не масштабируемо |
| `$stageOrientation` | `StageOrientation \| null` (derived) | — | `boxHeight > boxWidth ? "portrait" : "landscape"` |
| `$isZoomAvailable` | `boolean` (derived) | — | `callFullscreenModel.$isFullscreen ∧ callModel.$peerMediaState.screenSharing` |
| `$isZoomed` | `boolean` (derived) | — | `$zoom.scale > ZOOM_MIN_SCALE` |
| `$canZoomIn` | `boolean` (derived) | — | `$zoom.scale < ZOOM_MAX_SCALE` |
| `$canZoomOut` | `boolean` (derived) | — | `$zoom.scale > ZOOM_MIN_SCALE` |

### События (публичные)

| Событие | Payload | Кто шлёт |
|---------|---------|----------|
| `zoomInClicked` / `zoomOutClicked` | — | «+» / «−» в `ZoomControls` |
| `zoomReset` | — | «Исходный размер» |
| `zoomedAt` | `ZoomAtPayload` | колесо над видео, щипок |
| `panned` | `PanPayload` | перетаскивание мышью, сдвиг пальцем / серединой щипка |
| `stageGeometryChanged` | `StageGeometry \| null` | `useStageGeometry` в `CallVideo` |

### Переходы

Все входы масштаба (`zoomInClicked`, `zoomOutClicked`, `zoomedAt`,
`panned`) проходят только при `$isZoomAvailable` (FR-011), берут
`{ zoom: $zoom, geometry: $stageGeometry }` и пишут в `$zoom` результат
чистой функции из `callZoom.helpers.ts`:

| Вход | Функция | Результат |
|------|---------|-----------|
| `zoomInClicked` | `zoomAt(zoom, getNextZoomStep(scale) / scale, 0, 0, geometry)` | шаг вверх вокруг центра |
| `zoomOutClicked` | `zoomAt(zoom, getPrevZoomStep(scale) / scale, 0, 0, geometry)` | шаг вниз; на `1` смещения `0` |
| `zoomedAt` | `zoomAt(zoom, factor, focusX, focusY, geometry)` | масштаб в `[1, 4]` вокруг точки, затем `clampZoom` |
| `panned` | `panBy(zoom, dx, dy, geometry)` | сдвиг + `clampZoom`; при `scale === 1` без изменений |
| `$stageGeometry` изменился | `clampZoom(zoom, geometry)` | смещение в новых границах |

Сброс `$zoom ← ZOOM_RESET`: `zoomReset`; `callFullscreenModel.$isFullscreen`
→ `false`; `callModel.$peerMediaState.screenSharing` → `false`;
`$stageOrientation.updates` (поворот, FR-010); `callModel.callTerminated`.
`stageGeometryChanged` пишет `$stageGeometry` всегда (и `null`).

### Чистые функции `callZoom.helpers.ts`

| Функция | Контракт |
|---------|----------|
| `clampScale(scale)` | в `[ZOOM_MIN_SCALE, ZOOM_MAX_SCALE]` |
| `getContentSize(geometry)` | размер картинки при `object-fit: contain`; без метаданных — бокс |
| `getMaxOffset(scale, geometry)` | `{ x, y }`: `max(0, (scale·content − box) / 2)` по осям; `null` geometry → `{0, 0}` |
| `clampZoom(zoom, geometry)` | смещения в `[−max, max]`; `scale === 1` → смещения `0` |
| `zoomAt(zoom, factor, focusX, focusY, geometry)` | `s₁ = clampScale(s₀·factor)`, `t₁ = p − (s₁/s₀)(p − t₀)`, `clampZoom` |
| `panBy(zoom, dx, dy, geometry)` | `clampZoom({ ...zoom, offsetX + dx, offsetY + dy })` |
| `getNextZoomStep(scale)` / `getPrevZoomStep(scale)` | следующий / предыдущий шаг `0.5` с учётом ε (170 % → 200 % / 150 %) |
| `getStageOrientation(geometry)` | `"portrait"` / `"landscape"` / `null` |

### Инварианты

- `1 ≤ scale ≤ 4` всегда.
- `|offsetX| ≤ getMaxOffset(scale, geometry).x`, то же по `y`: край
  картинки не уходит внутрь окна (FR-009).
- `scale === 1` ⇒ `offsetX === offsetY === 0`.
- Вне `$isZoomAvailable` `$zoom` равен `ZOOM_RESET` (сбросы выше закрывают
  все пути выхода из доступности).

## 5. UI-состояние, которое сознательно не в Effector

Чисто визуальное и покадровое, без бизнес-логики, живёт в `ref` хуков:

- позиции активных указателей щипка / сдвига (`useZoomGestures`);
- время и точка прошлого касания для двойного касания, тип последнего
  указателя (`useDoubleTapToggle`);
- подписки `ResizeObserver`, `wheel` (non-passive), `gesturestart`,
  `keydown` на `document`.

Результат каждого жеста — событие модели; источник правды о режиме
и масштабе один.
