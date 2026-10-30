import { allSettled, fork } from "effector";
import type { EventCallable, Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DOUBLE_TAP_INTERVAL_MS, TAP_MAX_DURATION_MS } from "../../videoCall.constants";
import * as callModel from "../call.model";
import { CONTROLS_AUTO_HIDE_MS, CONTROLS_REVEAL_GUARD_MS } from "../callFullscreen.constants";
import * as callFullscreenModel from "../callFullscreen.model";

// patronum `debounce` keeps the scope busy until its timer fires, so units are launched
// fire-and-forget and the clock is driven explicitly.
const launch = async (scope: Scope, unit: EventCallable<void>) => {
  void allSettled(unit, { scope });
  await vi.advanceTimersByTimeAsync(0);
};

const enter = (scope: Scope) => launch(scope, callFullscreenModel.fullscreenToggled);

const isVisible = (scope: Scope) => scope.getState(callFullscreenModel.$controlsVisible);

const isInteractive = (scope: Scope) => scope.getState(callFullscreenModel.$controlsInteractive);

const forkWithFocus = (isFocused: () => boolean) =>
  fork({ handlers: [[callFullscreenModel.readControlsFocusFx, isFocused]] });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("features/videoCall/model callFullscreen", () => {
  it("should switch the mode on and off with the toggle", async () => {
    const scope = fork();

    await enter(scope);
    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(true);

    await launch(scope, callFullscreenModel.fullscreenToggled);
    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
  });

  it("should show the controls on entering and hide them after the idle timeout", async () => {
    const scope = fork();
    await enter(scope);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS - 1);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(isVisible(scope)).toBe(false);
  });

  it("should bring hidden controls back on activity", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);

    await launch(scope, callFullscreenModel.activityDetected);

    expect(isVisible(scope)).toBe(true);
  });

  it("should restart the countdown on every activity", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(2500);

    await launch(scope, callFullscreenModel.activityDetected);
    await vi.advanceTimersByTimeAsync(2500);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS - 2500);
    expect(isVisible(scope)).toBe(false);
  });

  it("should keep the controls while the pointer is over them and hide them after it leaves", async () => {
    const scope = fork();
    await enter(scope);
    await launch(scope, callFullscreenModel.controlsHovered);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS * 2);
    expect(isVisible(scope)).toBe(true);
    expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(true);

    await launch(scope, callFullscreenModel.controlsUnhovered);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS - 1);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(isVisible(scope)).toBe(false);
  });

  it("should keep the controls while they hold keyboard focus and hide them after it leaves", async () => {
    let focused = true;
    const scope = forkWithFocus(() => focused);
    await enter(scope);
    await launch(scope, callFullscreenModel.controlsFocused);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS * 2);
    expect(isVisible(scope)).toBe(true);

    focused = false;
    await launch(scope, callFullscreenModel.controlsBlurred);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS - 1);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(isVisible(scope)).toBe(false);
  });

  it("should keep the controls while focus stays in them after the pointer left", async () => {
    const scope = forkWithFocus(() => true);
    await enter(scope);
    await launch(scope, callFullscreenModel.controlsHovered);
    await launch(scope, callFullscreenModel.controlsFocused);

    await launch(scope, callFullscreenModel.controlsUnhovered);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS * 2);

    expect(isVisible(scope)).toBe(true);
  });

  it("should hide the controls when the focused button lost focus without a blur", async () => {
    const scope = forkWithFocus(() => false);
    await enter(scope);
    await launch(scope, callFullscreenModel.controlsFocused);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);

    expect(isVisible(scope)).toBe(false);
  });

  it("should hide the controls once a held focus is lost without a blur later on (regression)", async () => {
    let focused = true;
    const scope = forkWithFocus(() => focused);
    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS * 2);
    expect(isVisible(scope)).toBe(true);

    focused = false;
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);

    expect(isVisible(scope)).toBe(false);
  });

  it("should let controls revealed by a tap take touches only after the reveal guard", async () => {
    const scope = fork();
    await enter(scope);
    expect(isInteractive(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);
    expect(isInteractive(scope)).toBe(false);

    await launch(scope, callFullscreenModel.hiddenControlsTapped);
    expect(isVisible(scope)).toBe(true);
    // The second press of the slowest double tap still counted as one.
    await vi.advanceTimersByTimeAsync(TAP_MAX_DURATION_MS + DOUBLE_TAP_INTERVAL_MS - 1);
    expect(isInteractive(scope)).toBe(false);

    await vi.advanceTimersByTimeAsync(CONTROLS_REVEAL_GUARD_MS);
    expect(isInteractive(scope)).toBe(true);
  });

  it("should let controls revealed by the mouse take clicks at once", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);

    await launch(scope, callFullscreenModel.activityDetected);

    expect(isInteractive(scope)).toBe(true);
  });

  it("should let the regular call buttons take touches only after the guard on a double-tap exit (regression)", async () => {
    const scope = fork();
    await enter(scope);

    await launch(scope, callFullscreenModel.doubleTapToggled);
    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
    expect(isInteractive(scope)).toBe(false);

    await vi.advanceTimersByTimeAsync(CONTROLS_REVEAL_GUARD_MS);
    expect(isInteractive(scope)).toBe(true);
  });

  it("should keep the regular call buttons pressable after leaving by «Свернуть» or Escape", async () => {
    const scope = fork();
    await enter(scope);
    await launch(scope, callFullscreenModel.fullscreenToggled);
    expect(isInteractive(scope)).toBe(true);

    await enter(scope);
    await launch(scope, callFullscreenModel.escapePressed);
    expect(isInteractive(scope)).toBe(true);
  });

  it("should show hidden controls when keyboard focus reaches them", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);

    await launch(scope, callFullscreenModel.controlsFocused);

    expect(isVisible(scope)).toBe(true);
  });

  it("should leave the mode on Escape", async () => {
    const scope = fork();
    await enter(scope);

    await launch(scope, callFullscreenModel.escapePressed);

    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
  });

  it("should ignore Escape in the regular view", async () => {
    const scope = fork();

    await launch(scope, callFullscreenModel.escapePressed);

    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
    expect(isVisible(scope)).toBe(true);
  });

  it("should leave the mode when the call ends", async () => {
    const scope = fork();
    await enter(scope);

    await launch(scope, callModel.hangUp);

    expect(scope.getState(callFullscreenModel.$isFullscreen)).toBe(false);
  });

  it("should restore the regular controls and drop the holds on leaving", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);
    expect(isVisible(scope)).toBe(false);
    await launch(scope, callFullscreenModel.controlsHovered);
    await launch(scope, callFullscreenModel.controlsFocused);

    await launch(scope, callFullscreenModel.fullscreenToggled);

    expect(isVisible(scope)).toBe(true);
    expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(false);
  });

  it("should ignore activity, hover and focus in the regular view", async () => {
    const scope = fork({ values: [[callFullscreenModel.$controlsVisible, false]] });

    await launch(scope, callFullscreenModel.activityDetected);
    await launch(scope, callFullscreenModel.controlsHovered);
    await launch(scope, callFullscreenModel.controlsFocused);

    expect(isVisible(scope)).toBe(false);
    expect(scope.getState(callFullscreenModel.$isControlsHovered)).toBe(false);
  });

  it("should hide the cursor only in the mode while the controls are hidden", async () => {
    const scope = fork();
    expect(scope.getState(callFullscreenModel.$isCursorHidden)).toBe(false);

    await enter(scope);
    expect(scope.getState(callFullscreenModel.$isCursorHidden)).toBe(false);

    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS);
    expect(scope.getState(callFullscreenModel.$isCursorHidden)).toBe(true);

    await launch(scope, callFullscreenModel.fullscreenToggled);
    expect(scope.getState(callFullscreenModel.$isCursorHidden)).toBe(false);
  });

  it("should not hide the regular controls with a countdown started before leaving", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(1000);

    await launch(scope, callFullscreenModel.fullscreenToggled);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS * 2);

    expect(isVisible(scope)).toBe(true);
  });

  it("should start a full countdown when the mode is entered again", async () => {
    const scope = fork();
    await enter(scope);
    await vi.advanceTimersByTimeAsync(2000);
    await launch(scope, callFullscreenModel.fullscreenToggled);
    await vi.advanceTimersByTimeAsync(500);

    await enter(scope);
    await vi.advanceTimersByTimeAsync(CONTROLS_AUTO_HIDE_MS - 1);
    expect(isVisible(scope)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(isVisible(scope)).toBe(false);
  });
});
