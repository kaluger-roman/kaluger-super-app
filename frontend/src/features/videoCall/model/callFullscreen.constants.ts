import { DOUBLE_TAP_INTERVAL_MS, TAP_MAX_DURATION_MS } from "../videoCall.constants";
import type { CallZoom } from "../videoCall.types";

export const CONTROLS_AUTO_HIDE_MS = 3000;
// The second press of the slowest double tap still counted as one comes this long after the first.
export const CONTROLS_REVEAL_GUARD_MS = TAP_MAX_DURATION_MS + DOUBLE_TAP_INTERVAL_MS;

export const ZOOM_MIN_SCALE = 1;
export const ZOOM_MAX_SCALE = 4;
export const ZOOM_STEP = 0.5;
// A gesture may leave 1.4999999 for 1.5: the next button step must still be 2, not 1.5.
export const ZOOM_STEP_EPSILON = 1e-6;

export const ZOOM_RESET: CallZoom = { scale: 1, offsetX: 0, offsetY: 0 };
