import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OUTGOING_REVEAL_DELAY_MS } from "../call.constants";
import * as callModel from "../call.model";
import * as callRequestModel from "../callRequest.model";
import * as callScreenModel from "../callScreen.model";
// The whole call wiring, as in the app: with a transport installed the invite goes out and the
// call stays outgoing, whatever other test files loaded before.
import "../index";
import { installTransport, resetCallFlow } from "./callFlow";

// patronum `delay` keeps the scope busy until its timer fires, so units are launched
// fire-and-forget and the clock is driven explicitly.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const startCall = (scope: Scope) =>
  launch(() => allSettled(callModel.callStarted, { scope, params: { peerName: "Анна" } }));

beforeEach(() => {
  vi.useFakeTimers();
  installTransport();
});

afterEach(() => {
  resetCallFlow();
  vi.useRealTimers();
});

describe("features/videoCall/model callScreen", () => {
  it("should start only one call while one is going on (regression: second invite while the screen is hidden)", async () => {
    const scope = fork();
    const started: unknown[] = [];
    createWatch({ unit: callModel.callStarted, fn: (params) => started.push(params), scope });

    await launch(() =>
      allSettled(callRequestModel.callRequested, { scope, params: { peerName: "Анна" } })
    );
    await launch(() =>
      allSettled(callRequestModel.callRequested, { scope, params: { peerName: "Анна" } })
    );

    expect(started).toHaveLength(1);
  });

  it("should keep a just-started call unseen until the server confirms it rings", async () => {
    const scope = fork();
    await startCall(scope);
    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("idle");

    await launch(() => allSettled(callModel.callRinging, { scope, params: "c-1" }));

    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("outgoing");
  });

  it("should show the dialing screen after a short wait on a slow network", async () => {
    const scope = fork();
    await startCall(scope);

    await vi.advanceTimersByTimeAsync(OUTGOING_REVEAL_DELAY_MS);

    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("outgoing");
  });

  it("should never show a call refused at once (regression: screen flash for an offline tutor)", async () => {
    const scope = fork();
    await startCall(scope);
    await launch(() =>
      allSettled(callModel.callFailed, { scope, params: "Репетитор сейчас не в сети" })
    );

    await vi.advanceTimersByTimeAsync(OUTGOING_REVEAL_DELAY_MS);

    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("idle");
  });

  it("should not reveal a new call early because of an older call's timer", async () => {
    const scope = fork();
    await startCall(scope);
    await launch(() => allSettled(callModel.callFailed, { scope, params: "x" }));
    await vi.advanceTimersByTimeAsync(OUTGOING_REVEAL_DELAY_MS - 100);

    await startCall(scope);
    await vi.advanceTimersByTimeAsync(100);

    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("idle");
  });
});
