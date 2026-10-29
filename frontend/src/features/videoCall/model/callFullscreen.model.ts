import { combine, createEffect, createEvent, createStore, merge, sample } from "effector";
import { debounce } from "patronum";

import { CALL_CONTROLS_SELECTOR } from "../videoCall.constants";
import { hasKeyboardFocusWithin } from "../videoCall.helpers";
import * as callModel from "./call.model";
import { CONTROLS_AUTO_HIDE_MS, CONTROLS_REVEAL_GUARD_MS } from "./callFullscreen.constants";

export const $isFullscreen = createStore(false);
// Always true in the regular view: only the fullscreen controls hide.
export const $controlsVisible = createStore(true);
export const $isControlsHovered = createStore(false);
const $isRevealGuarded = createStore(false);
export const $controlsInteractive = combine(
  $controlsVisible,
  $isRevealGuarded,
  (visible, guarded) => visible && !guarded
);
export const $isCursorHidden = combine(
  $isFullscreen,
  $controlsVisible,
  (isFullscreen, visible) => isFullscreen && !visible
);

export const fullscreenToggled = createEvent();
export const doubleTapToggled = createEvent();
export const escapePressed = createEvent();
export const activityDetected = createEvent();
export const hiddenControlsTapped = createEvent();
export const controlsHovered = createEvent();
export const controlsUnhovered = createEvent();
export const controlsFocused = createEvent();
export const controlsBlurred = createEvent();
const autoHideScheduled = createEvent();

export const readControlsFocusFx = createEffect(() =>
  hasKeyboardFocusWithin(CALL_CONTROLS_SELECTOR)
);

sample({
  clock: fullscreenToggled,
  source: $isFullscreen,
  fn: (isFullscreen) => !isFullscreen,
  target: $isFullscreen,
});
sample({ clock: escapePressed, filter: $isFullscreen, fn: () => false, target: $isFullscreen });
sample({ clock: callModel.callTerminated, fn: () => false, target: $isFullscreen });

const fullscreenEntered = sample({
  clock: $isFullscreen.updates,
  filter: (isFullscreen) => isFullscreen,
});
const fullscreenExited = sample({
  clock: $isFullscreen.updates,
  filter: (isFullscreen) => !isFullscreen,
});

sample({ clock: [fullscreenEntered, fullscreenExited], fn: () => true, target: $controlsVisible });
sample({ clock: fullscreenEntered, target: autoHideScheduled });
sample({ clock: fullscreenExited, fn: () => false, target: $isControlsHovered });

sample({ clock: hiddenControlsTapped, target: activityDetected });
sample({ clock: doubleTapToggled, target: fullscreenToggled });

// Only the timer hides the controls: a tap or a move shows them and starts the countdown again.
sample({
  clock: [activityDetected, controlsFocused],
  filter: $isFullscreen,
  fn: () => true,
  target: $controlsVisible,
});
sample({
  clock: [activityDetected, controlsFocused, controlsUnhovered, controlsBlurred],
  filter: $isFullscreen,
  target: autoHideScheduled,
});

sample({
  clock: controlsHovered,
  filter: $isFullscreen,
  fn: () => true,
  target: $isControlsHovered,
});
sample({ clock: controlsUnhovered, fn: () => false, target: $isControlsHovered });

// The hold is checked when the timer fires, so nothing has to cancel a countdown already running.
// The focus is read from the page: a focused button that gets disabled or removed sends no blur,
// so while the focus holds the controls it is checked again a timeout later.
sample({
  clock: debounce({ source: autoHideScheduled, timeout: CONTROLS_AUTO_HIDE_MS }),
  filter: $isFullscreen,
  target: readControlsFocusFx,
});
sample({
  clock: readControlsFocusFx.doneData,
  source: { isFullscreen: $isFullscreen, hovered: $isControlsHovered },
  filter: ({ isFullscreen, hovered }, focused) => isFullscreen && !hovered && !focused,
  fn: () => false,
  target: $controlsVisible,
});
sample({
  clock: readControlsFocusFx.doneData,
  filter: (focused) => focused,
  target: autoHideScheduled,
});

// The tap that reveals hidden controls, and the second tap of a double tap that switches the mode,
// land where buttons appear: the browser checks the click of that tap against the new layout, so
// for a moment those buttons let touches through.
const revealGuardStarted = merge([hiddenControlsTapped, doubleTapToggled]);
sample({ clock: revealGuardStarted, fn: () => true, target: $isRevealGuarded });
sample({
  clock: debounce({ source: revealGuardStarted, timeout: CONTROLS_REVEAL_GUARD_MS }),
  fn: () => false,
  target: $isRevealGuarded,
});
