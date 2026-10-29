import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BACKGROUND_HINT_DISMISSED_KEY } from "../backgroundHint.constants";
import * as backgroundHintModel from "../backgroundHint.model";
import * as callModel from "../call.model";
import * as callPresenceModel from "../callPresence.model";
import type { BackgroundMediaCapability } from "../callPresence.types";
import "../index";

const IOS: BackgroundMediaCapability = { audio: false, video: false };
const ANDROID: BackgroundMediaCapability = { audio: true, video: false };

const started: Scope[] = [];

const settle = () => new Promise((resolve) => setImmediate(resolve));

// The call duration ticks (patronum interval) until the call ends: the call is started
// fire-and-forget and ended after the test.
const startCall = async (capability: BackgroundMediaCapability) => {
  const scope = fork({
    values: [
      [callPresenceModel.$backgroundCapability, capability],
      [callModel.$callPhase, "connecting"],
    ],
  });
  started.push(scope);
  void allSettled(callModel.callConnected, { scope });
  await settle();
  return scope;
};

const dismiss = async (scope: Scope) => {
  void allSettled(backgroundHintModel.backgroundHintDismissed, { scope });
  await settle();
};

afterEach(async () => {
  await Promise.all(
    started.splice(0).map((scope) => allSettled(callModel.callEndedLocally, { scope }))
  );
  vi.restoreAllMocks();
});

describe("features/videoCall/model/backgroundHint.model", () => {
  it("should show the hint in a call where the own microphone stops in the background", async () => {
    const scope = await startCall(IOS);

    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(true);
  });

  it("should not show the hint where the microphone keeps going in the background", async () => {
    const scope = await startCall(ANDROID);

    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
  });

  it("should not show the hint before the call is connected", () => {
    const scope = fork({
      values: [
        [callPresenceModel.$backgroundCapability, IOS],
        [callModel.$callPhase, "connecting"],
      ],
    });

    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
  });

  it("should remember the dismissed hint on the device for the next call", async () => {
    const first = await startCall(IOS);
    await dismiss(first);
    expect(first.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
    expect(localStorage.getItem(BACKGROUND_HINT_DISMISSED_KEY)).toBe("1");

    const second = await startCall(IOS);
    expect(second.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
  });

  it("should show the hint, and let it be closed for the call, when the storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const scope = await startCall(IOS);
    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(true);

    await dismiss(scope);

    expect(scope.getState(backgroundHintModel.$isBackgroundHintShown)).toBe(false);
  });
});
