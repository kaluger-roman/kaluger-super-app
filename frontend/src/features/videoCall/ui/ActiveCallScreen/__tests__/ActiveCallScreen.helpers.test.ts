import { describe, expect, it } from "vitest";

import { DOUBLE_TAP_INTERVAL_MS, TAP_MAX_DURATION_MS } from "../../../videoCall.constants";
import {
  DOUBLE_CLICK_MAX_INTERVAL_MS,
  DOUBLE_TAP_DISTANCE_PX,
  TAP_MOVE_TOLERANCE_PX,
} from "../ActiveCallScreen.constants";
import {
  isDoubleTap,
  isInteractiveTarget,
  isTap,
  isVideoDoubleClick,
  toTapSample,
} from "../ActiveCallScreen.helpers";

const START = { x: 100, y: 100, time: 1000 };

const html = (markup: string): HTMLElement => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.append(host);
  return host;
};

describe("ActiveCallScreen helpers", () => {
  it("should read a pointer event as a tap sample", () => {
    expect(toTapSample({ clientX: 5, clientY: 6, timeStamp: 7 })).toEqual({ x: 5, y: 6, time: 7 });
  });

  it("should take a short press in place for a tap", () => {
    expect(isTap(START, { x: 100, y: 100, time: 1000 + TAP_MAX_DURATION_MS })).toBe(true);
    expect(isTap(START, { x: 100 + TAP_MOVE_TOLERANCE_PX, y: 100, time: 1100 })).toBe(true);
  });

  it("should not take a long press or a swipe for a tap", () => {
    expect(isTap(START, { x: 100, y: 100, time: 1001 + TAP_MAX_DURATION_MS })).toBe(false);
    expect(isTap(START, { x: 100, y: 101 + TAP_MOVE_TOLERANCE_PX, time: 1100 })).toBe(false);
  });

  it("should take two taps close in time and place for a double tap", () => {
    expect(
      isDoubleTap(START, {
        x: 100 + DOUBLE_TAP_DISTANCE_PX,
        y: 100,
        time: 1000 + DOUBLE_TAP_INTERVAL_MS,
      })
    ).toBe(true);
  });

  it("should not take a late, distant or lone tap for a double tap", () => {
    expect(isDoubleTap(START, { x: 100, y: 100, time: 1001 + DOUBLE_TAP_INTERVAL_MS })).toBe(false);
    expect(isDoubleTap(START, { x: 101 + DOUBLE_TAP_DISTANCE_PX, y: 100, time: 1100 })).toBe(false);
    expect(isDoubleTap(null, START)).toBe(false);
  });

  it("should tell buttons and links from the video", () => {
    const host = html(
      '<button><svg data-testid="icon"></svg></button><div role="button">x</div><a href="#">a</a><video></video><div class="plain"></div>'
    );

    expect(isInteractiveTarget(host.querySelector("button"))).toBe(true);
    expect(isInteractiveTarget(host.querySelector("svg"))).toBe(true);
    expect(isInteractiveTarget(host.querySelector('[role="button"]'))).toBe(true);
    expect(isInteractiveTarget(host.querySelector("a"))).toBe(true);
    expect(isInteractiveTarget(host.querySelector("video"))).toBe(false);
    expect(isInteractiveTarget(host.querySelector(".plain"))).toBe(false);
    expect(isInteractiveTarget(null)).toBe(false);
    host.remove();
  });

  it("should take two presses on the video for a double click on it", () => {
    expect(
      isVideoDoubleClick([
        { time: 1000, interactive: false },
        { time: 1000 + DOUBLE_CLICK_MAX_INTERVAL_MS, interactive: false },
      ])
    ).toBe(true);
  });

  it("should not take a double click that started on a button or was not seen whole", () => {
    expect(
      isVideoDoubleClick([
        { time: 1000, interactive: true },
        { time: 1100, interactive: false },
      ])
    ).toBe(false);
    expect(
      isVideoDoubleClick([
        { time: 1000, interactive: false },
        { time: 1100, interactive: true },
      ])
    ).toBe(false);
    expect(
      isVideoDoubleClick([
        { time: 1000, interactive: false },
        { time: 1001 + DOUBLE_CLICK_MAX_INTERVAL_MS, interactive: false },
      ])
    ).toBe(false);
    expect(isVideoDoubleClick([{ time: 1000, interactive: false }])).toBe(false);
  });
});
