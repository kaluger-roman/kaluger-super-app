import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callNotificationOpenModel from "../callNotificationOpen.model";
import * as callPresenceModel from "../callPresence.model";
import * as callResumeModel from "../callResume.model";
import { CALL_STATE_REPLY_TIMEOUT_MS } from "../callSync.constants";
import "../index";
import type { CallRole, CallSignalingInbound, CallSnapshot } from "../signaling.types";
import { setWebRtcAdapter } from "../webrtc.helpers";
import { installTransport, resetCallFlow } from "./callFlow";
import { createFakeAdapter } from "./fakeWebrtc";

const SYNC: CallSignalingInbound = { type: "call_sync" };
const ACCEPTED: CallSnapshot = {
  callId: "c-1",
  status: "accepted",
  direction: "outgoing",
  peerName: "Иван",
  lesson: null,
  iceServers: [],
  peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  connectedAt: null,
};

// The reply check starts a patronum delay that keeps allSettled pending.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const watchStale = (scope: Scope): CallRole[] => {
  const calls: CallRole[] = [];
  createWatch({ unit: callResumeModel.transportStale, fn: (role) => calls.push(role), scope });
  return calls;
};

const page = (visible: boolean, phase: CallPhase = "active", callId: string | null = "c-1") =>
  fork({
    values: [
      [callPresenceModel.$isVisible, visible],
      [callModel.$callPhase, phase],
      [callModel.$callId, phase === "idle" ? null : callId],
      [callModel.$callRole, phase === "idle" ? null : "tutor"],
    ],
  });

let sent: CallSignalingInbound[];
const syncs = () => sent.filter((message) => message.type === "call_sync");

beforeEach(() => {
  vi.useFakeTimers();
  sent = installTransport();
});

afterEach(async () => {
  resetCallFlow();
  await vi.runOnlyPendingTimersAsync();
  vi.useRealTimers();
});

describe("features/videoCall/model/callSync.model — when to ask", () => {
  it("should ask on every socket when the page comes back on screen, and not when it leaves", async () => {
    const scope = page(true, "idle");

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: false }));
    expect(syncs()).toEqual([]);

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: true }));
    expect(syncs()).toEqual([SYNC, SYNC]);
  });

  it("should ask on a socket that is ready again while the page is on screen", async () => {
    const scope = page(true, "idle");

    await launch(() => allSettled(callPresenceModel.transportReady, { scope, params: "student" }));

    expect(syncs()).toEqual([SYNC]);
    expect(sent.some((message) => message.type === "call_resume")).toBe(false);
  });

  it("should ask about the page's own call on a socket back while the page is hidden", async () => {
    const scope = page(false);

    await launch(() => allSettled(callPresenceModel.transportReady, { scope, params: "tutor" }));

    expect(syncs()).toEqual([SYNC]);
  });

  it("should ask about an invite whose socket closed before call_ringing, even while hidden", async () => {
    const scope = page(false, "outgoing", null);

    await launch(() => allSettled(callModel.transportDisconnected, { scope, params: "tutor" }));
    await launch(() => allSettled(callPresenceModel.transportReady, { scope, params: "tutor" }));

    expect(syncs()).toEqual([SYNC]);
  });

  it("should not bring back a call nobody looks at: a hidden page without a call does not ask", async () => {
    const hiddenIdle = page(false, "idle");
    const otherRole = page(false);

    await launch(() =>
      allSettled(callPresenceModel.transportReady, { scope: hiddenIdle, params: "tutor" })
    );
    await launch(() =>
      allSettled(callPresenceModel.transportReady, { scope: otherRole, params: "student" })
    );

    expect(syncs()).toEqual([]);
  });
});

describe("features/videoCall/model/callSync.model — is the socket alive", () => {
  it("should take a socket that does not answer call_sync for dead", async () => {
    const scope = page(false);
    const stale = watchStale(scope);

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: true }));
    await vi.advanceTimersByTimeAsync(CALL_STATE_REPLY_TIMEOUT_MS - 1);
    expect(stale).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(stale).toEqual(["tutor"]);
  });

  it("should trust a socket that answered in time", async () => {
    const scope = page(false);
    const stale = watchStale(scope);

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: true }));
    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: null },
      })
    );
    await vi.advanceTimersByTimeAsync(CALL_STATE_REPLY_TIMEOUT_MS);

    expect(stale).toEqual([]);
  });

  it("should not check the socket outside a call", async () => {
    const scope = page(false, "idle");
    const stale = watchStale(scope);

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: true }));
    await vi.advanceTimersByTimeAsync(CALL_STATE_REPLY_TIMEOUT_MS);

    expect(stale).toEqual([]);
  });

  it("should take the sockets asked about a tapped notification's call for dead when they do not answer (regression: the tap did nothing over a sleeping socket)", async () => {
    const scope = page(true, "idle");
    const stale = watchStale(scope);

    await launch(() =>
      allSettled(callNotificationOpenModel.notificationOpened, { scope, params: "c-9" })
    );
    expect(syncs()).toEqual([SYNC, SYNC]);
    await vi.advanceTimersByTimeAsync(CALL_STATE_REPLY_TIMEOUT_MS - 1);
    expect(stale).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(stale).toEqual(["tutor", "student"]);
    expect(scope.getState(callNotificationOpenModel.$pendingNotificationCallId)).toBe("c-9");
  });

  it("should reopen only the socket that did not answer about a tapped notification's call", async () => {
    const scope = page(true, "idle");
    const stale = watchStale(scope);

    await launch(() =>
      allSettled(callNotificationOpenModel.notificationOpened, { scope, params: "c-9" })
    );
    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "student", call: null },
      })
    );
    await vi.advanceTimersByTimeAsync(CALL_STATE_REPLY_TIMEOUT_MS);

    expect(stale).toEqual(["tutor"]);
  });
});

describe("features/videoCall/model/callSync.model — an accept before call_state", () => {
  const acceptOf = (callId: string) => ({
    role: "tutor" as const,
    message: { type: "call_accepted" as const, callId, iceServers: [] },
  });
  const accepted = (callId: string) =>
    launch(() => allSettled(callModel.signalReceived, { scope, params: acceptOf(callId) }));
  const hangups = () => sent.filter((message) => message.type === "call_hangup");
  let scope: Scope;

  beforeEach(async () => {
    setWebRtcAdapter(createFakeAdapter());
    scope = page(true, "idle");
    await launch(() => allSettled(callPresenceModel.transportReady, { scope, params: "tutor" }));
    expect(syncs()).toEqual([SYNC]);
  });

  it("should let call_state restore a call accepted while a reloaded caller asked about it", async () => {
    await accepted("c-1");
    expect(hangups()).toEqual([]);

    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: ACCEPTED },
      })
    );

    expect(hangups()).toEqual([]);
    expect(scope.getState(callModel.$callId)).toBe("c-1");
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });
  });

  it("should ask again about an accept of an unknown call once call_state came, not hang up", async () => {
    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: null },
      })
    );
    sent.length = 0;

    await accepted("stale-1");

    expect(hangups()).toEqual([]);
    expect(syncs()).toEqual([SYNC]);
  });

  it("should ask again about an accept of an unknown call once the asking socket closed", async () => {
    await launch(() => allSettled(callModel.transportDisconnected, { scope, params: "tutor" }));
    sent.length = 0;

    await accepted("stale-1");

    expect(hangups()).toEqual([]);
    expect(syncs()).toEqual([SYNC]);
  });

  it("should not ask twice while the answer to the first call_sync is still on its way", async () => {
    sent.length = 0;

    await accepted("c-1");
    await accepted("c-1");

    expect(syncs()).toEqual([]);
  });
});

describe("features/videoCall/model/callSync.model — an accept of a call the page does not hold", () => {
  const acceptOn = (scope: Scope) =>
    launch(() =>
      allSettled(callModel.signalReceived, {
        scope,
        params: {
          role: "tutor",
          message: { type: "call_accepted", callId: "c-1", iceServers: [] },
        },
      })
    );

  it("should leave the call to a hidden page only once it is looked at, never hang it up (regression: a hidden tab let in by 4004 killed the call)", async () => {
    setWebRtcAdapter(createFakeAdapter());
    const scope = page(false, "idle");
    await launch(() => allSettled(callPresenceModel.transportReady, { scope, params: "tutor" }));

    sent.length = 0;

    await acceptOn(scope);

    expect(sent).toEqual([]);
    expect(scope.getState(callModel.$callPhase)).toBe("idle");

    await launch(() => allSettled(callPresenceModel.visibilityChanged, { scope, params: true }));
    expect(syncs()).toEqual([SYNC, SYNC]);
    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: ACCEPTED },
      })
    );

    expect(scope.getState(callModel.$callId)).toBe("c-1");
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(sent.filter((message) => message.type === "call_hangup")).toEqual([]);
  });

  it("should ask the server at once on a page that is looked at, and restore the call", async () => {
    setWebRtcAdapter(createFakeAdapter());
    const scope = page(true, "idle");

    await acceptOn(scope);

    expect(sent.filter((message) => message.type === "call_hangup")).toEqual([]);
    expect(syncs()).toEqual([SYNC]);

    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: ACCEPTED },
      })
    );

    expect(scope.getState(callModel.$callId)).toBe("c-1");
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(sent.filter((message) => message.type === "call_hangup")).toEqual([]);
  });

  it("should repeat its own hangup when the accepted call is one the page already hung up", async () => {
    setWebRtcAdapter(createFakeAdapter());
    const scope = page(true, "active");
    await launch(() => allSettled(callModel.hangUp, { scope }));
    sent.length = 0;

    await acceptOn(scope);
    expect(syncs()).toEqual([SYNC]);
    await launch(() =>
      allSettled(callResumeModel.callStateReceived, {
        scope,
        params: { role: "tutor", call: { ...ACCEPTED, status: "connected" } },
      })
    );

    expect(sent).toContainEqual({ type: "call_hangup", callId: "c-1" });
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });
});
