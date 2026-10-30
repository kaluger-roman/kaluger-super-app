import { allSettled, createWatch, fork } from "effector";
import type { Scope, Unit, UnitTargetable } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callEntryModel from "../callEntry.model";
import * as callPresenceModel from "../callPresence.model";
import { LOCAL_GRACE_TIMEOUT_MS, RINGING_GRACE_TIMEOUT_MS } from "../callResume.constants";
import * as callResumeModel from "../callResume.model";
import * as callScreenModel from "../callScreen.model";
import * as callTransportModel from "../callTransport.model";
import * as devicePushModel from "../devicePush.model";
import "../index";
import * as peerConnectionModel from "../peerConnection.model";
import * as peerViewModel from "../peerView.model";
import type { CallSignalingInbound, CallSnapshot } from "../signaling.types";
import { resetCallTransportsForTests, setCallTransport } from "../transport.helpers";
import { getSession, setWebRtcAdapter } from "../webrtc.helpers";
import { installTransport, resetCallFlow } from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import type { FakeAdapter, FakeStream } from "./fakeWebrtc";

const SNAPSHOT: CallSnapshot = {
  callId: "c-1",
  status: "connected",
  direction: "outgoing",
  peerName: "Иван",
  lesson: null,
  iceServers: [{ urls: "stun:fresh" }],
  peerPresence: { presence: "background", audioSuspended: true, videoSuspended: true },
  connectedAt: "2026-10-27T10:00:00.000Z",
};

// Restores and recovery start patronum delays that keep allSettled pending: units are launched
// fire-and-forget and the clock is driven by hand.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const fire = <T>(scope: Scope, unit: UnitTargetable<T>, params: T) =>
  launch(() => allSettled(unit, { scope, params }));

const watch = <T>(scope: Scope, unit: Unit<T>): T[] => {
  const calls: T[] = [];
  createWatch({ unit, fn: (value) => calls.push(value), scope });
  return calls;
};

const inCall = (phase: CallPhase = "active", visible = true): Scope =>
  fork({
    values: [
      [callModel.$callPhase, phase],
      [callModel.$callId, "c-1"],
      [callModel.$callRole, "tutor"],
      [callPresenceModel.$isVisible, visible],
    ],
  });

let sent: CallSignalingInbound[];
let adapter: FakeAdapter;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T10:02:00.000Z"));
  sent = installTransport();
  adapter = createFakeAdapter();
  setWebRtcAdapter(adapter);
});

afterEach(async () => {
  resetCallFlow();
  await vi.runOnlyPendingTimersAsync();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("features/videoCall/model/callResume.model — restore", () => {
  it("should bring back the incoming screen of a call still ringing", async () => {
    const scope = fork();

    await fire(scope, callResumeModel.callStateReceived, {
      role: "student",
      call: { ...SNAPSHOT, status: "ringing", direction: "incoming", connectedAt: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$incomingCall)).toEqual({
      callId: "c-1",
      callerName: "Иван",
      role: "student",
      lesson: null,
    });
    expect(scope.getState(callModel.$iceServers)).toEqual(SNAPSHOT.iceServers);
    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("incoming");
  });

  it("should bring back the dialing screen of an outgoing call still ringing", async () => {
    const scope = fork();

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, status: "ringing", connectedAt: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    expect(scope.getState(callModel.$callId)).toBe("c-1");
    expect(scope.getState(callModel.$callRole)).toBe("tutor");
    expect(scope.getState(callModel.$outgoingCallPeer)).toEqual({ name: "Иван", role: "student" });
    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("outgoing");
    expect(sent.some((message) => message.type === "call_invite")).toBe(false);
    // The server counts the caller as away until it hears from this page.
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });

  it("should rebuild a connected outgoing call and ask the peer to rebuild its side", async () => {
    const scope = fork();

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(scope.getState(callModel.$callPhase)).toBe("active");
    expect(scope.getState(callModel.$callDurationSeconds)).toBe(120);
    expect(scope.getState(callModel.$outgoingCallPeer)).toEqual({ name: "Иван", role: "student" });
    expect(scope.getState(callModel.$activePeerName)).toBe("Иван");
    expect(scope.getState(callPresenceModel.$peerPresence)).toEqual(SNAPSHOT.peerPresence);
    expect(scope.getState(callPresenceModel.$mediaConnectionLost)).toBe(true);
    expect(scope.getState(callModel.$localStream)).not.toBeNull();
    expect(getSession("c-1")?.polite).toBe(false);
    expect(adapter.createPeerConnection).toHaveBeenCalledWith(
      expect.objectContaining({ iceServers: [{ urls: "stun:fresh" }] })
    );
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });
    expect(sent.some((message) => message.type === "webrtc_offer")).toBe(false);
  });

  it("should rebuild an accepted incoming call as the polite side, still connecting", async () => {
    const scope = fork();

    await fire(scope, callResumeModel.callStateReceived, {
      role: "student",
      call: { ...SNAPSHOT, status: "accepted", direction: "incoming", connectedAt: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(scope.getState(callModel.$callDurationSeconds)).toBe(0);
    expect(scope.getState(callModel.$incomingCall)?.callerName).toBe("Иван");
    expect(scope.getState(callPresenceModel.$mediaConnectionLost)).toBe(false);
    expect(getSession("c-1")?.polite).toBe(true);
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });
  });
});

describe("features/videoCall/model/callResume.model — the same call", () => {
  it("should resume a call that kept its connection without restarting the session", async () => {
    const scope = inCall("active");
    await allSettled(peerConnectionModel.addLocalMediaFx, {
      scope,
      params: { callId: "c-1", role: "tutor", iceServers: [], polite: false },
    });
    expect(scope.getState(callModel.$localStream)).not.toBeNull();

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
    expect(scope.getState(callModel.$callPhase)).toBe("active");
  });

  it.each([
    ["away", { presence: "background", audioSuspended: true, videoSuspended: true }],
    ["reconnecting", { presence: "disconnected", audioSuspended: false, videoSuspended: false }],
  ] as const)(
    "should drop the peer's stale %s state that the snapshot of the same call no longer has (regression: the banner and the placeholder stayed over live video)",
    async (_state, stale) => {
      const scope = inCall("active");
      await fire(scope, callPresenceModel.peerPresenceReceived, stale);
      expect(scope.getState(peerViewModel.$peerInterruption)).not.toBeNull();

      await fire(scope, callResumeModel.callStateReceived, {
        role: "tutor",
        call: {
          ...SNAPSHOT,
          peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
        },
      });

      expect(scope.getState(peerViewModel.$peerInterruption)).toBeNull();
      expect(scope.getState(callPresenceModel.$peerPresence).presence).toBe("on_screen");
    }
  );

  it("should not make the peer rebuild for a page that still waits for the first offer", async () => {
    const scope = inCall("connecting");

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });

  it("should not restart a session of a call that still rings", async () => {
    const scope = inCall("outgoing");

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, status: "ringing" },
    });

    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });
});

describe("features/videoCall/model/callResume.model — ended without the page", () => {
  it("should end a live call the server no longer has, without signals, and say so", async () => {
    const scope = inCall("active");
    const ended = watch(scope, callResumeModel.returnedToEndedCall);
    const infos = watch(scope, notificationsModel.showInfoEvent);

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: null });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(ended).toHaveLength(1);
    expect(infos).toEqual(["Звонок завершён"]);
    expect(sent).toEqual([]);
  });

  it("should not touch a new call when an empty snapshot arrives before call_ringing", async () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "outgoing"],
        [callModel.$callRole, "tutor"],
      ],
    });

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: null });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });

  it("should show the participant's new incoming call that came while the page held an old one (regression: the new call rang unseen and went missed)", async () => {
    const scope = inCall("active");
    await allSettled(peerConnectionModel.addLocalMediaFx, {
      scope,
      params: { callId: "c-1", role: "tutor", iceServers: [], polite: false },
    });
    sent.length = 0;
    const infos = watch(scope, notificationsModel.showInfoEvent);

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: {
        ...SNAPSHOT,
        callId: "c-2",
        status: "ringing",
        direction: "incoming",
        connectedAt: null,
      },
    });

    expect(infos).toEqual(["Звонок завершён"]);
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$callId)).toBe("c-2");
    expect(scope.getState(callModel.$incomingCall)).toEqual({
      callId: "c-2",
      callerName: "Иван",
      role: "tutor",
      lesson: null,
    });
    expect(scope.getState(callModel.$localStream)).toBeNull();
    expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("incoming");
    // Nothing for the old call; the restored one tells the server the page is back.
    expect(sent).toEqual([{ type: "call_resume", callId: "c-2", sessionRestart: false }]);
  });

  it("should restore the participant's newer call only after the page's own call has ended", async () => {
    const scope = inCall("active");
    const order: string[] = [];
    createWatch({ unit: callModel.callTerminated, fn: () => order.push("ended"), scope });
    createWatch({ unit: callEntryModel.resumeRequested, fn: () => order.push("restore"), scope });
    createWatch({ unit: callModel.callRestored, fn: () => order.push("restored"), scope });

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, callId: "c-2", status: "ringing", direction: "incoming" },
    });

    expect(order).toEqual(["ended", "restore", "restored"]);
    expect(scope.getState(callModel.$callId)).toBe("c-2");
  });

  it("should end the call when another window took it over, silently", async () => {
    const scope = inCall("active");
    const ended = watch(scope, callResumeModel.returnedToEndedCall);

    await fire(scope, callResumeModel.transportWaiting, "student");
    expect(scope.getState(callModel.$callPhase)).toBe("active");

    await fire(scope, callResumeModel.transportWaiting, "tutor");
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(ended).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe("features/videoCall/model/callResume.model — connection taken elsewhere", () => {
  it.each([true, false])(
    "should drop a still ringing call when another page took the connection, silently (refused: %s) (regression: incoming screen kept with «Восстанавливаем связь…»)",
    async (refused) => {
      const scope = inCall("incoming");
      const ended = watch(scope, callResumeModel.returnedToEndedCall);

      await fire(scope, callResumeModel.transportTakenElsewhere, { role: "student", refused });
      expect(scope.getState(callModel.$callPhase)).toBe("incoming");

      await fire(scope, callResumeModel.transportTakenElsewhere, { role: "tutor", refused });
      expect(scope.getState(callModel.$callPhase)).toBe("idle");
      expect(ended).toEqual([]);
      expect(sent).toEqual([]);
    }
  );

  it.each<CallPhase>(["outgoing", "connecting", "active"])(
    "should end a %s call at once when its reconnect is refused, and say so (regression: «Восстанавливаем связь…» for 190 s)",
    async (phase) => {
      const scope = inCall(phase);
      const infos = watch(scope, notificationsModel.showInfoEvent);
      await fire(scope, callModel.transportDisconnected, "tutor");

      await fire(scope, callResumeModel.transportTakenElsewhere, {
        role: "student",
        refused: true,
      });
      expect(scope.getState(callModel.$callPhase)).toBe(phase);

      await fire(scope, callResumeModel.transportTakenElsewhere, { role: "tutor", refused: true });
      expect(scope.getState(callModel.$callPhase)).toBe("idle");
      expect(scope.getState(callResumeModel.$isOwnTransportLost)).toBe(false);
      expect(infos).toEqual(["Звонок завершён"]);
      expect(sent).toEqual([]);
    }
  );

  it("should let a call go silently to the page that took a registered connection", async () => {
    const scope = inCall("active");
    const ended = watch(scope, callResumeModel.returnedToEndedCall);

    await fire(scope, callResumeModel.transportTakenElsewhere, { role: "tutor", refused: false });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(ended).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe("features/videoCall/model/callResume.model — own connection", () => {
  it("should keep the call while its socket is lost and end it after the local limit", async () => {
    const scope = inCall("active");
    const ended = watch(scope, callResumeModel.returnedToEndedCall);

    await fire(scope, callModel.transportDisconnected, "tutor");
    expect(scope.getState(callResumeModel.$isOwnTransportLost)).toBe(true);
    await vi.advanceTimersByTimeAsync(LOCAL_GRACE_TIMEOUT_MS - 1);
    expect(scope.getState(callModel.$callPhase)).toBe("active");

    await vi.advanceTimersByTimeAsync(1);
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(ended).toHaveLength(1);
  });

  it("should not end the call once its socket is back", async () => {
    const scope = inCall("active");

    await fire(scope, callModel.transportDisconnected, "tutor");
    await fire(scope, callPresenceModel.transportReady, "tutor");
    expect(scope.getState(callResumeModel.$isOwnTransportLost)).toBe(false);
    await vi.advanceTimersByTimeAsync(LOCAL_GRACE_TIMEOUT_MS);

    expect(scope.getState(callModel.$callPhase)).toBe("active");
  });

  it.each<CallPhase>(["incoming", "outgoing"])(
    "should wait for a %s call that still rang no longer than the server rings it (regression: ringtone for 190 s)",
    async (phase) => {
      const scope = inCall(phase);
      const ended = watch(scope, callResumeModel.returnedToEndedCall);

      await fire(scope, callModel.transportDisconnected, "tutor");
      await vi.advanceTimersByTimeAsync(RINGING_GRACE_TIMEOUT_MS - 1);
      expect(scope.getState(callModel.$callPhase)).toBe(phase);

      await vi.advanceTimersByTimeAsync(1);
      expect(scope.getState(callModel.$callPhase)).toBe("idle");
      expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("idle");
      expect(ended).toHaveLength(1);
      expect(sent).toEqual([]);
    }
  );

  it("should keep the full wait for a call answered before its socket was lost", async () => {
    const scope = inCall("connecting");

    await fire(scope, callModel.transportDisconnected, "tutor");
    await vi.advanceTimersByTimeAsync(RINGING_GRACE_TIMEOUT_MS);

    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
  });

  it("should ignore the loss of the other role's socket", async () => {
    const scope = inCall("active");

    await fire(scope, callModel.transportDisconnected, "student");

    expect(scope.getState(callResumeModel.$isOwnTransportLost)).toBe(false);
  });
});

describe("features/videoCall/model/callResume.model — lost signals while away", () => {
  const ACCEPTED: CallSnapshot = { ...SNAPSHOT, status: "accepted", connectedAt: null };
  const offersSent = () => sent.filter((message) => message.type === "webrtc_offer");

  it("should connect a caller whose call was accepted while it was away, with one offer", async () => {
    const scope = inCall("outgoing");

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: ACCEPTED });

    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(scope.getState(callModel.$iceServers)).toEqual(ACCEPTED.iceServers);
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
    expect(offersSent()).toHaveLength(1);
    expect(getSession("c-1")?.polite).toBe(false);
  });

  it("should send again an answer that was lost with the socket", async () => {
    const scope = inCall("connecting");

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, status: "ringing", direction: "incoming", connectedAt: null },
    });

    expect(sent).toContainEqual({ type: "call_accept", callId: "c-1" });
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
  });

  it("should name this device in an answer sent again", async () => {
    const scope = fork({
      values: [
        [callModel.$callPhase, "connecting"],
        [callModel.$callId, "c-1"],
        [callModel.$callRole, "tutor"],
        [callPresenceModel.$isVisible, true],
        [devicePushModel.$pushEndpoint, "https://push.example.com/own-device"],
      ],
    });

    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, status: "ringing", direction: "incoming", connectedAt: null },
    });

    expect(sent).toContainEqual({
      type: "call_accept",
      callId: "c-1",
      pushEndpoint: "https://push.example.com/own-device",
    });
  });

  it("should tell the peer the own media state again after a resume", async () => {
    const media = { micOn: false, cameraOn: true, screenSharing: false, cameraAvailable: true };
    const scope = fork({
      values: [
        [callModel.$callPhase, "active"],
        [callModel.$callId, "c-1"],
        [callModel.$callRole, "tutor"],
        [callModel.$selfMediaState, media],
        [callModel.$localStream, createFakeStream() as unknown as MediaStream],
      ],
    });

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(sent).toContainEqual({ type: "call_media_state", callId: "c-1", ...media });
  });

  it.each([false, true])(
    "should tell a peer that came back the own media state again (session restart: %s)",
    async (sessionRestart) => {
      const media = { micOn: true, cameraOn: false, screenSharing: true, cameraAvailable: true };
      const scope = fork({
        values: [
          [callModel.$callPhase, "active"],
          [callModel.$callId, "c-1"],
          [callModel.$callRole, "tutor"],
          [callModel.$selfMediaState, media],
          [callModel.$localStream, createFakeStream() as unknown as MediaStream],
        ],
      });

      await fire(scope, callResumeModel.peerResumed, { callId: "c-1", sessionRestart });

      expect(sent).toContainEqual({ type: "call_media_state", callId: "c-1", ...media });
    }
  );

  it("should not send a media state the page does not have yet when the peer comes back", async () => {
    const scope = inCall("connecting");

    await fire(scope, callResumeModel.peerResumed, { callId: "c-1", sessionRestart: false });

    expect(sent.some((message) => message.type === "call_media_state")).toBe(false);
  });

  it("should not end a call when a signal fails while its socket is being restored", async () => {
    const scope = inCall("active");
    resetCallTransportsForTests();
    await fire(scope, callModel.transportDisconnected, "tutor");

    await fire(scope, callTransportModel.signalQueued, {
      role: "tutor",
      message: { type: "webrtc_ice", callId: "c-1", candidate: { candidate: "c" } },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("active");
  });

  it("should still end a call whose signal fails with its socket in place", async () => {
    const scope = inCall("active");
    setCallTransport(
      "tutor",
      () => {
        throw new Error("broken");
      },
      "tutor-socket"
    );

    await fire(scope, callTransportModel.signalQueued, {
      role: "tutor",
      message: { type: "webrtc_ice", callId: "c-1", candidate: { candidate: "c" } },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });
});

describe("features/videoCall/model/callResume.model — an invite without call_ringing", () => {
  const dialing = () =>
    fork({
      values: [
        [callModel.$callPhase, "outgoing"],
        [callModel.$callRole, "tutor"],
        [callModel.$inviteId, "invite-1"],
      ],
    });

  it("should end the call once the server, asked on the new socket, has none", async () => {
    const scope = dialing();
    const ended = watch(scope, callResumeModel.returnedToEndedCall);

    await fire(scope, callModel.transportDisconnected, "tutor");
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: null });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(ended).toHaveLength(1);
  });

  it("should take the call over from the snapshot when the invite did reach the server", async () => {
    const scope = dialing();

    await fire(scope, callModel.transportDisconnected, "tutor");
    await fire(scope, callResumeModel.callStateReceived, {
      role: "tutor",
      call: { ...SNAPSHOT, status: "ringing", connectedAt: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    expect(scope.getState(callModel.$callId)).toBe("c-1");
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });

  it("should still let a snapshot taken before the invite pass when the socket stayed", async () => {
    const scope = dialing();

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: null });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });

  describe("canceled before its snapshot came (regression)", () => {
    const RINGING: CallSnapshot = { ...SNAPSHOT, status: "ringing", connectedAt: null };

    const canceledInDoubt = async () => {
      const scope = dialing();
      await fire(scope, callModel.transportDisconnected, "tutor");
      await fire(scope, callModel.cancelCall, undefined);
      sent.length = 0;
      return scope;
    };

    it("should cancel the call the server still rings instead of restoring it", async () => {
      const scope = await canceledInDoubt();
      expect(scope.getState(callModel.$callPhase)).toBe("idle");

      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: RINGING });

      expect(scope.getState(callModel.$callPhase)).toBe("idle");
      expect(scope.getState(callScreenModel.$shownCallPhase)).toBe("idle");
      expect(sent).toEqual([{ type: "call_cancel", callId: "c-1" }]);
    });

    it("should end the call the callee answered meanwhile instead of restoring it", async () => {
      const scope = await canceledInDoubt();

      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

      expect(scope.getState(callModel.$callPhase)).toBe("idle");
      expect(sent).toEqual([{ type: "call_cancel", callId: "c-1" }]);
    });

    it("should cancel only once and let later calls of the role be restored", async () => {
      const scope = await canceledInDoubt();
      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: null });

      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: RINGING });

      expect(sent.some((message) => message.type === "call_cancel")).toBe(false);
      expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    });

    it("should cancel it even while the page rings on the other role's socket", async () => {
      const scope = await canceledInDoubt();

      await fire(scope, callResumeModel.callStateReceived, {
        role: "student",
        call: { ...RINGING, callId: "c-2", direction: "incoming" },
      });
      expect(scope.getState(callModel.$callPhase)).toBe("incoming");
      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: RINGING });

      expect(sent.filter((message) => message.type === "call_cancel")).toEqual([
        { type: "call_cancel", callId: "c-1" },
      ]);
      expect(scope.getState(callModel.$callId)).toBe("c-2");
    });

    it("should leave it to the server once a new invite replaced the canceled one", async () => {
      const scope = await canceledInDoubt();
      await fire(scope, callModel.callStarted, {
        studentId: "s-1",
        peerName: "Иван",
        lesson: null,
      });
      await fire(scope, callModel.cancelCall, undefined);
      sent.length = 0;

      await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: RINGING });

      expect(sent.some((message) => message.type === "call_cancel")).toBe(false);
    });
  });
});

describe("features/videoCall/model/callResume.model — a call ended here", () => {
  it("should not bring back a call hung up before the snapshot came, and repeat the hangup", async () => {
    const scope = inCall("active");
    await fire(scope, callModel.hangUp, undefined);
    sent.length = 0;

    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(adapter.createPeerConnection).not.toHaveBeenCalled();
    expect(sent).toEqual([{ type: "call_hangup", callId: "c-1" }]);
  });

  it("should not show again an incoming call just rejected", async () => {
    const ringing: CallSnapshot = {
      ...SNAPSHOT,
      status: "ringing",
      direction: "incoming",
      connectedAt: null,
    };
    const scope = fork();
    await fire(scope, callResumeModel.callStateReceived, { role: "student", call: ringing });
    await fire(scope, callModel.rejectCall, undefined);
    sent.length = 0;

    await fire(scope, callResumeModel.callStateReceived, { role: "student", call: ringing });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(scope.getState(callModel.$incomingCall)).toBeNull();
    expect(sent).toEqual([{ type: "call_reject", callId: "c-1" }]);
  });
});

describe("features/videoCall/model/callResume.model — a restore the peer did not hear of", () => {
  it("should ask the peer to rebuild on the next resume when the first call_resume was lost", async () => {
    let grantMedia: () => void = () => undefined;
    const media = new Promise<FakeStream>((resolve) => {
      grantMedia = () => resolve(createFakeStream());
    });
    setWebRtcAdapter(createFakeAdapter({ getUserMedia: () => media }));
    const scope = fork();
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(scope.getState(callModel.$callPhase)).toBe("active");

    resetCallTransportsForTests();
    await fire(scope, callModel.transportDisconnected, "tutor");
    await launch(grantMedia);
    expect(scope.getState(callModel.$localStream)).not.toBeNull();
    expect(sent.some((message) => message.type === "call_resume")).toBe(false);

    sent = installTransport();
    await fire(scope, callPresenceModel.transportReady, "tutor");
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });

    sent.length = 0;
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });

  it("should ask again after a call_resume went into a socket that died before the server confirmed it (regression: no media after a cold restore)", async () => {
    const scope = fork();
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });

    await fire(scope, callModel.transportDisconnected, "tutor");
    sent.length = 0;
    await fire(scope, callPresenceModel.transportReady, "tutor");
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });
  });

  it("should ask again after a socket that stopped answering, but not after the server confirmed", async () => {
    const scope = fork();
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    await fire(scope, callResumeModel.transportStale, "tutor");
    sent.length = 0;
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });

    await fire(scope, callModel.signalReceived, {
      role: "tutor",
      message: { type: "call_restart_announced", callId: "c-1" },
    });
    await fire(scope, callModel.transportDisconnected, "tutor");
    sent.length = 0;
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });
    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: false });
  });

  it("should not take a confirmation of another call", async () => {
    const scope = fork();
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    await fire(scope, callModel.signalReceived, {
      role: "tutor",
      message: { type: "call_restart_announced", callId: "c-0" },
    });
    await fire(scope, callModel.transportDisconnected, "tutor");
    sent.length = 0;
    await fire(scope, callResumeModel.callStateReceived, { role: "tutor", call: SNAPSHOT });

    expect(sent).toContainEqual({ type: "call_resume", callId: "c-1", sessionRestart: true });
  });
});
