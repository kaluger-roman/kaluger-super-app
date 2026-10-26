import {
  DOUBLE_CLICK_MAX_INTERVAL_MS,
  DOUBLE_TAP_DISTANCE_PX,
  INTERACTIVE_SELECTOR,
  TAP_MOVE_TOLERANCE_PX,
} from "./ActiveCallScreen.constants";
import type { MouseDownSample, PointerStart, TapSample } from "./ActiveCallScreen.types";
import { DOUBLE_TAP_INTERVAL_MS, TAP_MAX_DURATION_MS } from "../../videoCall.constants";

const distance = (a: TapSample, b: TapSample): number => Math.hypot(a.x - b.x, a.y - b.y);

export const toTapSample = (event: {
  clientX: number;
  clientY: number;
  timeStamp: number;
}): TapSample => ({ x: event.clientX, y: event.clientY, time: event.timeStamp });

export const isTap = (start: PointerStart, end: TapSample): boolean =>
  end.time - start.time <= TAP_MAX_DURATION_MS && distance(start, end) <= TAP_MOVE_TOLERANCE_PX;

export const isDoubleTap = (previous: TapSample | null, current: TapSample): boolean =>
  previous !== null &&
  current.time - previous.time <= DOUBLE_TAP_INTERVAL_MS &&
  distance(previous, current) <= DOUBLE_TAP_DISTANCE_PX;

export const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;

// Both presses of the double click must land on the video itself. When the first one hit a button
// (or happened outside, so it was never seen here), the second one only landed on the video
// because the first one changed the layout under the cursor.
export const isVideoDoubleClick = (presses: MouseDownSample[]): boolean => {
  const [first, second] = presses;
  return (
    presses.length === 2 &&
    !first.interactive &&
    !second.interactive &&
    second.time - first.time <= DOUBLE_CLICK_MAX_INTERVAL_MS
  );
};
