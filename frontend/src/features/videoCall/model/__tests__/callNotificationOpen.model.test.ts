import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as callModel from "../call.model";
import { readOpenedCallId } from "../callNotificationOpen.helpers";
import * as callNotificationOpenModel from "../callNotificationOpen.model";
import * as callResumeModel from "../callResume.model";
import "../index";
import type { CallRole, CallSignalingInbound, CallSnapshot } from "../signaling.types";
import { resetCallTransportsForTests, setCallTransport } from "../transport.helpers";

const SNAPSHOT: CallSnapshot = {
  callId: "c-7",
  status: "ringing",
  direction: "incoming",
  peerName: "Анна Петрова",
  lesson: null,
  iceServers: [],
  peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  connectedAt: null,
};

const watchStale = (scope: Scope): unknown[] => {
  const calls: unknown[] = [];
  createWatch({
    unit: callNotificationOpenModel.staleCallNotificationOpened,
    fn: (value) => calls.push(value),
    scope,
  });
  return calls;
};

const pending = (scope: Scope) =>
  scope.getState(callNotificationOpenModel.$pendingNotificationCallId);

// A pending notification starts the check of the socket asked about it: a patronum delay that keeps
// allSettled pending. Units are launched fire-and-forget and the clock is driven by hand.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const open = (scope: Scope, callId = "c-7") =>
  launch(() => allSettled(callNotificationOpenModel.notificationOpened, { scope, params: callId }));

const callState = (scope: Scope, call: CallSnapshot | null, role: CallRole = "student") =>
  launch(() => allSettled(callResumeModel.callStateReceived, { scope, params: { role, call } }));

let sent: CallSignalingInbound[];

beforeEach(() => {
  vi.useFakeTimers();
  sent = [];
  setCallTransport("student", (message) => sent.push(message), "student-socket");
});

afterEach(async () => {
  await vi.runOnlyPendingTimersAsync();
  vi.useRealTimers();
  resetCallTransportsForTests();
  window.history.replaceState(null, "", "/");
});

describe("features/videoCall/model/callNotificationOpen.model — opening", () => {
  it("should take the call from the address and remove it from there", async () => {
    window.history.replaceState({ idx: 3 }, "", "/student/cabinet/schedule?call=c-7&tab=week#top");
    const scope = fork();

    await launch(() => allSettled(callNotificationOpenModel.readCallIdFromUrlFx, { scope }));

    expect(pending(scope)).toBe("c-7");
    expect(window.location.pathname).toBe("/student/cabinet/schedule");
    expect(window.location.search).toBe("?tab=week");
    expect(window.location.hash).toBe("#top");
    expect(window.history.state).toEqual({ idx: 3 });
  });

  it("should leave an address without a call alone", async () => {
    window.history.replaceState(null, "", "/dashboard?tab=week");
    const scope = fork();

    await launch(() => allSettled(callNotificationOpenModel.readCallIdFromUrlFx, { scope }));

    expect(pending(scope)).toBeNull();
    expect(window.location.search).toBe("?tab=week");
  });

  it("should take the call the service worker hands over and ignore other messages", async () => {
    const scope = fork();

    await launch(() =>
      allSettled(callNotificationOpenModel.serviceWorkerMessageReceived, {
        scope,
        params: { type: "something_else", callId: "c-1" },
      })
    );
    expect(pending(scope)).toBeNull();

    await launch(() =>
      allSettled(callNotificationOpenModel.serviceWorkerMessageReceived, {
        scope,
        params: { type: "call_notification_opened", callId: "c-7" },
      })
    );
    expect(pending(scope)).toBe("c-7");
  });

  it("should ask the server about the call right away", async () => {
    await open(fork());

    expect(sent).toEqual([{ type: "call_sync" }]);
  });

  it("should do nothing when the incoming call is already on the screen", async () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "incoming"],
        [callModel.$callId, "c-7"],
      ],
    });
    const stale = watchStale(scope);

    await open(scope);
    await callState(scope, SNAPSHOT);

    expect(pending(scope)).toBeNull();
    expect(sent).toEqual([]);
    expect(stale).toEqual([]);
  });
});

describe("features/videoCall/model/callNotificationOpen.model — the server's answer", () => {
  it("should leave the incoming call of a matching snapshot to the call restore", async () => {
    const scope = fork();
    const stale = watchStale(scope);
    await open(scope);

    await callState(scope, SNAPSHOT);

    expect(pending(scope)).toBeNull();
    expect(stale).toEqual([]);
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$callId)).toBe("c-7");
  });

  it("should say the call is over when the server has no call", async () => {
    const scope = fork();
    const stale = watchStale(scope);
    await open(scope);

    await callState(scope, null);

    expect(stale).toHaveLength(1);
    expect(pending(scope)).toBeNull();
  });

  it("should say the call is over when the server has another call", async () => {
    const scope = fork();
    const stale = watchStale(scope);
    await open(scope);

    await callState(scope, { ...SNAPSHOT, callId: "c-8" });

    expect(stale).toHaveLength(1);
  });

  it("should wait for the snapshot of the other session in the tab before saying the call is over (regression: false «Звонок уже завершён»)", async () => {
    setCallTransport("tutor", (message) => sent.push(message), "tutor-socket");
    const scope = fork();
    const stale = watchStale(scope);
    await open(scope);

    await callState(scope, null, "tutor");
    expect(stale).toEqual([]);
    expect(pending(scope)).toBe("c-7");

    await callState(scope, SNAPSHOT, "student");

    expect(stale).toEqual([]);
    expect(pending(scope)).toBeNull();
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$callId)).toBe("c-7");
  });

  it("should say the call is over once every session asked has answered without it", async () => {
    setCallTransport("tutor", (message) => sent.push(message), "tutor-socket");
    const scope = fork();
    const stale = watchStale(scope);
    await open(scope);

    await callState(scope, null, "tutor");
    await callState(scope, null, "student");

    expect(stale).toHaveLength(1);
    expect(pending(scope)).toBeNull();
  });

  it("should not react to snapshots while no notification was opened", async () => {
    const scope = fork();
    const stale = watchStale(scope);

    await callState(scope, null);

    expect(stale).toEqual([]);
  });
});

describe("features/videoCall/model/callNotificationOpen.helpers", () => {
  it("should read only a well-formed message of the service worker", () => {
    expect(readOpenedCallId({ type: "call_notification_opened", callId: "c-1" })).toBe("c-1");
    expect(readOpenedCallId({ type: "call_notification_opened", callId: "" })).toBeNull();
    expect(readOpenedCallId({ type: "call_notification_opened", callId: 7 })).toBeNull();
    expect(readOpenedCallId({ type: "call_notification_opened" })).toBeNull();
    expect(readOpenedCallId("call_notification_opened")).toBeNull();
    expect(readOpenedCallId(null)).toBeNull();
  });
});
