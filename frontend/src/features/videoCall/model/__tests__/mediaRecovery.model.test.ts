import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import {
  CAMERA_BUSY_TEXT,
  CAMERA_FAILED_TEXT,
  CONNECTION_FAILED_TEXT,
  MIC_AND_CAMERA_BUSY_TEXT,
  MIC_BUSY_TEXT,
  RENEGOTIATION_FAILED_TEXT,
} from "../call.constants";
import * as callPresenceModel from "../callPresence.model";
import * as callResumeModel from "../callResume.model";
import { callModel } from "../index";
import { ICE_DISCONNECTED_RESTART_MS, MEDIA_RECOVERY_TIMEOUT_MS } from "../mediaRecovery.constants";
import * as peerConnectionModel from "../peerConnection.model";
import * as resumeSendModel from "../resumeSend.model";
import type { CallSignalingInbound } from "../signaling.types";
import { getSession, setWebRtcAdapter } from "../webrtc.helpers";
import {
  connectCallerSession,
  installTransport,
  receive,
  resetCallFlow,
  ringCurrentInvite,
  settleMicrotasks,
  startCalleeSession,
  startCallerSession,
} from "./callFlow";
import {
  createFakeAdapter,
  createFakeStream,
  endTrackBySystem,
  setTrackMutedBySystem,
  triggerConnectionState,
  triggerIceState,
} from "./fakeWebrtc";
import type { FakeAdapter, FakeStream, FakeTrack } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

// Only timeouts are faked: the call flow settles through setImmediate.
const useRecoveryTimers = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

const offersOf = (sent: CallSignalingInbound[]) =>
  sent.filter((message) => message.type === "webrtc_offer");

describe("features/videoCall/model media recovery", () => {
  let sent: CallSignalingInbound[];
  let adapter: FakeAdapter;

  const useAdapter = (overrides: Parameters<typeof createFakeAdapter>[0] = {}) => {
    adapter = createFakeAdapter(overrides);
    setWebRtcAdapter(adapter);
  };

  const activeCaller = async (callId: string) => {
    await connectCallerSession(callId);
    const pc = adapter.peerConnections[0];
    triggerConnectionState(pc, "connected");
    await settleMicrotasks();
    sent.length = 0;
    return pc;
  };

  const returnToServer = (callId: string) => {
    void resumeSendModel.sendResumeFx({ callId, role: "tutor", sessionRestart: false });
  };

  beforeEach(() => {
    sent = installTransport();
    useAdapter();
  });

  afterEach(() => {
    resetCallFlow();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should end a call whose connection fails before it ever connected (FR-008a)", async () => {
    await startCalleeSession("never");
    const errors = collectEvents(notificationsModel.showErrorEvent);
    expect(readStore(callModel.$callPhase)).toBe("connecting");

    triggerConnectionState(adapter.peerConnections[0], "failed");
    await settleMicrotasks();
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(sent).toContainEqual({ type: "call_hangup", callId: "never" });
    expect(errors.calls).toContain(CONNECTION_FAILED_TEXT);
  });

  it("should keep an active call whose connection failed and restart ICE as the caller", async () => {
    const pc = await activeCaller("fail-active");

    triggerConnectionState(pc, "failed");
    await settleMicrotasks();

    expect(readStore(callModel.$callPhase)).toBe("active");
    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(true);
    expect(pc.restartIce).toHaveBeenCalledTimes(1);
    expect(offersOf(sent)).toHaveLength(1);
    expect(sent.some((message) => message.type === "call_hangup")).toBe(false);
  });

  it("should restart ICE once when both ICE and the connection report the failure (regression: two restart offers)", async () => {
    const pc = await activeCaller("both-fail");

    triggerIceState(pc, "failed");
    triggerConnectionState(pc, "failed");
    await settleMicrotasks();

    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(true);
    expect(pc.restartIce).toHaveBeenCalledTimes(1);
    expect(offersOf(sent)).toHaveLength(1);

    receive({ type: "webrtc_answer", callId: "both-fail", sdp: { type: "answer", sdp: "answer" } });
    await settleMicrotasks();

    expect(offersOf(sent)).toHaveLength(1);
  });

  it("should make an offer asked for while another is being made only once that one is answered", async () => {
    const pc = await activeCaller("making-two");
    let release: () => void = () => undefined;
    pc.setLocalDescription.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    void peerConnectionModel.sendOfferFx("making-two");
    void peerConnectionModel.sendOfferFx("making-two");
    await settleMicrotasks();
    pc.localDescription = { type: "offer", sdp: "first" };
    pc.signalingState = "have-local-offer";
    release();
    await settleMicrotasks();

    expect(offersOf(sent)).toEqual([
      { type: "webrtc_offer", callId: "making-two", sdp: { type: "offer", sdp: "first" } },
    ]);

    receive({
      type: "webrtc_answer",
      callId: "making-two",
      sdp: { type: "answer", sdp: "answer" },
    });
    await settleMicrotasks();

    expect(offersOf(sent)).toHaveLength(2);
    expect(getSession("making-two")?.offerPending).toBe(false);
  });

  it("should leave the ICE restart to the caller on the callee's side", async () => {
    await startCalleeSession("callee-fail");
    const pc = adapter.peerConnections[0];
    triggerConnectionState(pc, "connected");
    await settleMicrotasks();
    sent.length = 0;

    triggerConnectionState(pc, "failed");
    await settleMicrotasks();

    expect(readStore(callModel.$callPhase)).toBe("active");
    expect(pc.restartIce).not.toHaveBeenCalled();
    expect(offersOf(sent)).toEqual([]);
  });

  it("should roll back an offer the absent peer never answered before restarting", async () => {
    const pc = await activeCaller("rollback");
    pc.signalingState = "have-local-offer";

    triggerConnectionState(pc, "failed");
    await settleMicrotasks();

    expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: "rollback" });
    expect(pc.restartIce).toHaveBeenCalled();
    expect(offersOf(sent)).toHaveLength(1);
  });

  it("should show the media as back once the connection is up again", async () => {
    const pc = await activeCaller("back");
    triggerConnectionState(pc, "failed");
    await settleMicrotasks();

    triggerConnectionState(pc, "connected");
    await settleMicrotasks();

    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(false);
    expect(sent).toContainEqual({ type: "call_connected", callId: "back" });
  });

  it("should restart ICE that stays disconnected, not a short blip", async () => {
    useRecoveryTimers();
    const pc = await activeCaller("blip");

    triggerIceState(pc, "disconnected");
    await vi.advanceTimersByTimeAsync(ICE_DISCONNECTED_RESTART_MS - 1);
    triggerIceState(pc, "connected");
    await vi.advanceTimersByTimeAsync(ICE_DISCONNECTED_RESTART_MS);
    expect(pc.restartIce).not.toHaveBeenCalled();
    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(false);

    pc.connectionState = "disconnected";
    triggerIceState(pc, "disconnected");
    await vi.advanceTimersByTimeAsync(ICE_DISCONNECTED_RESTART_MS);
    await settleMicrotasks();

    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(true);
    expect(pc.restartIce).toHaveBeenCalledTimes(1);
    expect(offersOf(sent)).toHaveLength(1);
  });

  it("should end the call when the media does not come back within the grace period", async () => {
    useRecoveryTimers();
    const pc = await activeCaller("gone");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    triggerConnectionState(pc, "failed");
    await vi.advanceTimersByTimeAsync(MEDIA_RECOVERY_TIMEOUT_MS - 1);
    expect(readStore(callModel.$callPhase)).toBe("active");

    await vi.advanceTimersByTimeAsync(1);
    await settleMicrotasks();
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(errors.calls).toContain(CONNECTION_FAILED_TEXT);
    expect(sent).toContainEqual({ type: "call_hangup", callId: "gone" });
  });

  it("should not end a call whose media came back in time", async () => {
    useRecoveryTimers();
    const pc = await activeCaller("saved");

    triggerConnectionState(pc, "failed");
    await vi.advanceTimersByTimeAsync(MEDIA_RECOVERY_TIMEOUT_MS / 2);
    triggerConnectionState(pc, "connected");
    await vi.advanceTimersByTimeAsync(MEDIA_RECOVERY_TIMEOUT_MS);

    expect(readStore(callModel.$callPhase)).toBe("active");
  });

  it("should rebuild the connection with the same tracks when the peer restarted its own", async () => {
    const pc = await activeCaller("rebuild");
    const session = getSession("rebuild");
    const localTracks = session?.localStream?.getTracks() ?? [];
    const oldRemote = readStore(callModel.$remoteStream);

    receive({ type: "call_peer_resumed", callId: "rebuild", sessionRestart: true });
    await settleMicrotasks();

    const next = adapter.peerConnections[1];
    expect(pc.close).toHaveBeenCalled();
    expect(next).toBeDefined();
    expect(getSession("rebuild")?.pc).toBe(next);
    expect(
      localTracks.every((track) => !(track as unknown as FakeTrack).stop.mock.calls.length)
    ).toBe(true);
    expect(next.addTrack).toHaveBeenCalledTimes(localTracks.length);
    expect(readStore(callModel.$remoteStream)).not.toBe(oldRemote);
    expect(readStore(callModel.$localStream)).toBe(session?.localStream);
    expect(offersOf(sent)).toHaveLength(1);
    expect(readStore(callPresenceModel.$mediaConnectionLost)).toBe(true);
  });

  it("should build a connection and make the offer when it has none to rebuild yet", async () => {
    useAdapter({ getUserMedia: async () => createFakeStream(["audio"]) });
    receive({
      type: "call_incoming",
      callId: "early",
      callerName: "Анна",
      lesson: null,
      iceServers: [],
    });
    callModel.acceptCall();
    await settleMicrotasks();
    expect(getSession("early")).toBeUndefined();
    sent.length = 0;

    receive({ type: "call_peer_resumed", callId: "early", sessionRestart: true });
    await settleMicrotasks();

    expect(getSession("early")?.polite).toBe(true);
    expect(getSession("early")?.localStream).not.toBeNull();
    expect(adapter.peerConnections[0].addTransceiver).toHaveBeenCalledWith("video", {
      direction: "recvonly",
    });
    expect(offersOf(sent)).toHaveLength(1);
    expect(readStore(callModel.$callPhase)).toBe("connecting");
  });

  it("should put the own tracks on the rebuilt connection when it was rebuilt during getUserMedia", async () => {
    let release: () => void = () => undefined;
    useAdapter({
      getUserMedia: () =>
        new Promise<FakeStream>((resolve) => {
          release = () => resolve(createFakeStream());
        }),
    });
    receive({
      type: "call_incoming",
      callId: "slow",
      callerName: "Анна",
      lesson: null,
      iceServers: [],
    });
    callModel.acceptCall();
    receive({ type: "webrtc_offer", callId: "slow", sdp: { type: "offer", sdp: "initial" } });
    await settleMicrotasks();
    const session = getSession("slow");

    receive({ type: "call_peer_resumed", callId: "slow", sessionRestart: true });
    await settleMicrotasks();
    release();
    await settleMicrotasks();

    const [first, rebuilt] = adapter.peerConnections;
    expect(getSession("slow")).toBe(session);
    expect(session?.pc).toBe(rebuilt);
    expect(first.addTrack).not.toHaveBeenCalled();
    expect(rebuilt.addTrack).toHaveBeenCalledTimes(2);
    expect(readStore(callModel.$callPhase)).toBe("connecting");
  });

  it("should restart ICE after the peer came back on the same connection, if needed", async () => {
    const pc = await activeCaller("warm");

    receive({ type: "call_peer_resumed", callId: "warm", sessionRestart: false });
    await settleMicrotasks();
    expect(pc.restartIce).not.toHaveBeenCalled();

    pc.connectionState = "disconnected";
    receive({ type: "call_peer_resumed", callId: "warm", sessionRestart: false });
    await settleMicrotasks();
    expect(pc.restartIce).toHaveBeenCalledTimes(1);
  });

  describe("the return of the own page to the server", () => {
    const answerEveryOffer = (callId: string) => {
      offersOf(sent).forEach((_, index) =>
        receive({ type: "webrtc_answer", callId, sdp: { type: "answer", sdp: `answer-${index}` } })
      );
    };

    it("should restart ICE only once the server took the page back", async () => {
      const pc = await activeCaller("back-ice");
      pc.connectionState = "disconnected";

      returnToServer("back-ice");
      await settleMicrotasks();

      expect(sent).toContainEqual({
        type: "call_resume",
        callId: "back-ice",
        sessionRestart: false,
      });
      expect(offersOf(sent)).toEqual([]);
      expect(pc.restartIce).not.toHaveBeenCalled();

      receive({ type: "call_resumed", callId: "back-ice" });
      await settleMicrotasks();

      expect(pc.restartIce).toHaveBeenCalledTimes(1);
      expect(offersOf(sent)).toHaveLength(1);
    });

    it("should make one offer, from the rebuilt connection, when the server first asks to rebuild for the peer's restart missed while away (regression #138)", async () => {
      const pc = await activeCaller("missed");
      pc.connectionState = "disconnected";
      const errors = collectEvents(notificationsModel.showErrorEvent);

      returnToServer("missed");
      await settleMicrotasks();
      receive({ type: "call_peer_resumed", callId: "missed", sessionRestart: true });
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "missed" });
      await settleMicrotasks();
      answerEveryOffer("missed");
      await settleMicrotasks();
      errors.unwatch();

      const rebuilt = adapter.peerConnections[1];
      expect(errors.calls).not.toContain(RENEGOTIATION_FAILED_TEXT);
      expect(offersOf(sent)).toHaveLength(1);
      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(rebuilt.restartIce).not.toHaveBeenCalled();
      expect(getSession("missed")?.pc).toBe(rebuilt);
      expect(rebuilt.signalingState).toBe("stable");
    });

    it("should take no confirmation for a return never sent", async () => {
      const pc = await activeCaller("unsent");
      pc.connectionState = "disconnected";

      receive({ type: "call_resumed", callId: "unsent" });
      await settleMicrotasks();

      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toEqual([]);
    });

    it("should take no confirmation for the return of another call", async () => {
      const pc = await activeCaller("own");
      pc.connectionState = "disconnected";

      returnToServer("own");
      await settleMicrotasks();
      callResumeModel.resumed("other");
      await settleMicrotasks();

      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toEqual([]);

      receive({ type: "call_resumed", callId: "own" });
      await settleMicrotasks();

      expect(pc.restartIce).toHaveBeenCalledTimes(1);
    });

    it("should not restart ICE for a return that restarts its own session", async () => {
      const pc = await activeCaller("own-restart");
      pc.connectionState = "disconnected";

      void resumeSendModel.sendResumeFx({
        callId: "own-restart",
        role: "tutor",
        sessionRestart: true,
      });
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "own-restart" });
      await settleMicrotasks();

      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toEqual([]);
    });

    it("should make the first offer again when it went out before the return", async () => {
      await startCallerSession("lost-first");
      const pc = adapter.peerConnections[0];
      sent.length = 0;

      returnToServer("lost-first");
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "lost-first" });
      await settleMicrotasks();

      expect(readStore(callModel.$callPhase)).toBe("connecting");
      expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: "rollback" });
      expect(pc.restartIce).toHaveBeenCalledTimes(1);
      expect(offersOf(sent)).toHaveLength(1);
    });

    it("should leave alone the first offer made after the return", async () => {
      callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
      ringCurrentInvite("late-first");
      returnToServer("late-first");
      await settleMicrotasks();
      receive({ type: "call_accepted", callId: "late-first", iceServers: [] });
      await settleMicrotasks();
      const pc = adapter.peerConnections[0];

      receive({ type: "call_resumed", callId: "late-first" });
      await settleMicrotasks();

      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toHaveLength(1);
    });

    it("should leave alone the first offer whose media came in after the return", async () => {
      let release: () => void = () => undefined;
      useAdapter({
        getUserMedia: () =>
          new Promise<FakeStream>((resolve) => {
            release = () => resolve(createFakeStream());
          }),
      });
      callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
      ringCurrentInvite("slow-media");
      receive({ type: "call_accepted", callId: "slow-media", iceServers: [] });
      await settleMicrotasks();
      returnToServer("slow-media");
      await settleMicrotasks();
      release();
      await settleMicrotasks();
      const pc = adapter.peerConnections[0];

      receive({ type: "call_resumed", callId: "slow-media" });
      await settleMicrotasks();

      expect(pc.setLocalDescription).not.toHaveBeenCalledWith({ type: "rollback" });
      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toHaveLength(1);
    });

    it("should keep a restart offer made while the return waited for the server", async () => {
      const pc = await activeCaller("window");
      pc.connectionState = "disconnected";
      const errors = collectEvents(notificationsModel.showErrorEvent);

      returnToServer("window");
      await settleMicrotasks();
      triggerConnectionState(pc, "failed");
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "window" });
      await settleMicrotasks();
      answerEveryOffer("window");
      await settleMicrotasks();
      errors.unwatch();

      expect(pc.setLocalDescription).not.toHaveBeenCalledWith({ type: "rollback" });
      expect(pc.restartIce).toHaveBeenCalledTimes(1);
      expect(offersOf(sent)).toHaveLength(1);
      expect(errors.calls).not.toContain(RENEGOTIATION_FAILED_TEXT);
    });

    it("should restart ICE once for one return confirmed twice", async () => {
      const pc = await activeCaller("twice");
      pc.connectionState = "disconnected";

      returnToServer("twice");
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "twice" });
      await settleMicrotasks();
      receive({ type: "call_resumed", callId: "twice" });
      await settleMicrotasks();

      expect(pc.restartIce).toHaveBeenCalledTimes(1);
      expect(offersOf(sent)).toHaveLength(1);
    });

    it("should forget a return still to be confirmed when the call ends", async () => {
      const first = await activeCaller("again");
      first.connectionState = "disconnected";
      returnToServer("again");
      await settleMicrotasks();

      callModel.hangUp();
      await settleMicrotasks();
      await connectCallerSession("again");
      const next = adapter.peerConnections[1];
      next.connectionState = "disconnected";
      sent.length = 0;

      receive({ type: "call_resumed", callId: "again" });
      await settleMicrotasks();

      expect(next.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toEqual([]);
    });
  });

  describe("a rebuild for the peer's restart that meets the ICE restart of the own return", () => {
    const returnAndGetConfirmed = async (callId: string) => {
      returnToServer(callId);
      await settleMicrotasks();
      receive({ type: "call_resumed", callId });
    };

    const hold = () => {
      let release: (fail?: Error) => void = () => undefined;
      const held = new Promise<void>((resolve, reject) => {
        release = (fail) => (fail ? reject(fail) : resolve());
      });
      return { held, release };
    };

    it("should drop an ICE restart still rolling back the old connection's offer", async () => {
      const pc = await activeCaller("roll");
      pc.connectionState = "disconnected";
      pc.signalingState = "have-local-offer";
      const rollback = hold();
      pc.setLocalDescription.mockImplementationOnce(() => rollback.held);

      await returnAndGetConfirmed("roll");
      await settleMicrotasks();
      receive({ type: "call_peer_resumed", callId: "roll", sessionRestart: true });
      await settleMicrotasks();
      rollback.release();
      await settleMicrotasks();

      const rebuilt = adapter.peerConnections[1];
      expect(pc.restartIce).not.toHaveBeenCalled();
      expect(rebuilt.restartIce).not.toHaveBeenCalled();
      expect(offersOf(sent)).toHaveLength(1);

      receive({ type: "webrtc_answer", callId: "roll", sdp: { type: "answer", sdp: "answer" } });
      await settleMicrotasks();

      expect(offersOf(sent)).toHaveLength(1);
      expect(getSession("roll")?.offerPending).toBe(false);
    });

    it("should not send the offer the old connection was still making", async () => {
      const pc = await activeCaller("making");
      pc.connectionState = "disconnected";
      const making = hold();
      pc.setLocalDescription.mockImplementationOnce(() => making.held);

      await returnAndGetConfirmed("making");
      await settleMicrotasks();
      expect(pc.restartIce).toHaveBeenCalledTimes(1);
      receive({ type: "call_peer_resumed", callId: "making", sessionRestart: true });
      await settleMicrotasks();
      expect(offersOf(sent)).toHaveLength(1);

      pc.localDescription = { type: "offer", sdp: "old-connection" };
      making.release();
      await settleMicrotasks();

      expect(offersOf(sent)).toEqual([
        { type: "webrtc_offer", callId: "making", sdp: { type: "offer", sdp: "fake-offer" } },
      ]);
      expect(getSession("making")?.pc).toBe(adapter.peerConnections[1]);
      expect(getSession("making")?.makingOffer).toBe(false);
    });

    it("should not take the closed connection's failed offer for a failed negotiation", async () => {
      const pc = await activeCaller("closed");
      pc.connectionState = "disconnected";
      const making = hold();
      pc.setLocalDescription.mockImplementationOnce(() => making.held);
      const failures = collectEvents(peerConnectionModel.sendOfferFx.fail);

      await returnAndGetConfirmed("closed");
      await settleMicrotasks();
      receive({ type: "call_peer_resumed", callId: "closed", sessionRestart: true });
      await settleMicrotasks();
      making.release(new Error("InvalidStateError: the connection is closed"));
      await settleMicrotasks();
      failures.unwatch();

      expect(failures.calls).toEqual([]);
      expect(offersOf(sent)).toHaveLength(1);
      expect(readStore(callModel.$callPhase)).toBe("active");
    });
  });

  it("should ignore a resume of another call", async () => {
    const pc = await activeCaller("mine");
    pc.connectionState = "disconnected";

    receive({ type: "call_peer_resumed", callId: "other", sessionRestart: true });
    await settleMicrotasks();

    expect(adapter.peerConnections).toHaveLength(1);
    expect(pc.restartIce).not.toHaveBeenCalled();
  });

  it("should take the fresh ICE servers of the snapshot", async () => {
    const pc = await activeCaller("fresh");

    callResumeModel.snapshotMatched({
      callId: "fresh",
      status: "connected",
      direction: "outgoing",
      peerName: "Иван",
      lesson: null,
      iceServers: [{ urls: "turn:new", username: "u", credential: "c" }],
      peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
      connectedAt: null,
    });
    await settleMicrotasks();

    expect(pc.setConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        iceServers: [{ urls: "turn:new", username: "u", credential: "c" }],
      })
    );
  });
});

const deviceBusy = async (): Promise<FakeStream> => {
  throw Object.assign(new Error("busy"), { name: "NotReadableError" });
};

const deviceDenied = async (): Promise<FakeStream> => {
  throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
};

describe("features/videoCall/model track recovery (FR-007)", () => {
  let sent: CallSignalingInbound[];
  let adapter: FakeAdapter;

  beforeEach(() => {
    sent = installTransport();
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  const activeWith = async (
    micStream: () => Promise<FakeStream>,
    cameraStream: () => Promise<FakeStream> = async () => createFakeStream(["video"])
  ) => {
    adapter = createFakeAdapter({
      getUserMedia: async (constraints) => {
        if (constraints.audio && constraints.video) return createFakeStream();
        return constraints.video ? cameraStream() : micStream();
      },
    });
    setWebRtcAdapter(adapter);
    await connectCallerSession("tracks");
    sent.length = 0;
    const session = getSession("tracks");
    const audio = session?.localStream?.getAudioTracks()[0] as unknown as FakeTrack;
    return { session, audio, pc: adapter.peerConnections[0] };
  };

  it("should get a microphone the system stopped again and keep it muted by the user", async () => {
    const { session, audio, pc } = await activeWith(async () => createFakeStream(["audio"]));
    callModel.toggleMic();
    await settleMicrotasks();
    expect(audio.enabled).toBe(false);

    endTrackBySystem(audio);
    await settleMicrotasks();

    const fresh = session?.localStream?.getAudioTracks()[0];
    expect(fresh).toBeDefined();
    expect(fresh).not.toBe(audio);
    expect(fresh?.enabled).toBe(false);
    expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(true);
    expect(readStore(callModel.$selfMediaState).micOn).toBe(false);
  });

  it("should get the stopped tracks again when the page comes back", async () => {
    const { session, audio } = await activeWith(async () => createFakeStream(["audio"]));
    audio.readyState = "ended";

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();

    expect(session?.localStream?.getAudioTracks()[0]).not.toBe(audio);
    expect(session?.localStream?.getAudioTracks()[0]?.readyState).toBe("live");
  });

  it("should say the microphone is busy and keep the call", async () => {
    const busy = Object.assign(new Error("busy"), { name: "NotReadableError" });
    const { audio } = await activeWith(async () => {
      throw busy;
    });
    const errors = collectEvents(notificationsModel.showErrorEvent);

    endTrackBySystem(audio);
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([MIC_BUSY_TEXT]);
    expect(readStore(callModel.$callPhase)).toBe("active");
    expect(sent.some((message) => message.type === "call_hangup")).toBe(false);
  });

  it("should say the camera is busy when another app holds it, not the microphone", async () => {
    const { session } = await activeWith(async () => createFakeStream(["audio"]), deviceBusy);
    const errors = collectEvents(notificationsModel.showErrorEvent);

    endTrackBySystem(session?.cameraTrack as unknown as FakeTrack);
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([CAMERA_BUSY_TEXT]);
    expect(readStore(callModel.$callPhase)).toBe("active");
  });

  it("should try a busy camera again when the user toggles the camera (regression)", async () => {
    let cameraHeld = true;
    const { session, pc } = await activeWith(
      async () => createFakeStream(["audio"]),
      async () => (cameraHeld ? deviceBusy() : createFakeStream(["video"]))
    );
    const camera = session?.cameraTrack as unknown as FakeTrack;
    endTrackBySystem(camera);
    await settleMicrotasks();
    expect(session?.cameraTrack).toBe(camera);

    cameraHeld = false;
    callModel.toggleCamera();
    await settleMicrotasks();

    const fresh = session?.localStream?.getVideoTracks()[0];
    expect(fresh).not.toBe(camera);
    expect(fresh?.readyState).toBe("live");
    expect(session?.cameraTrack).toBe(fresh);
    expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(true);
    expect(fresh?.enabled).toBe(readStore(callModel.$selfMediaState).cameraOn);
  });

  it("should bring the camera back even when the microphone is busy (regression)", async () => {
    const { session, audio } = await activeWith(deviceBusy);
    const camera = session?.cameraTrack as unknown as FakeTrack;
    const errors = collectEvents(notificationsModel.showErrorEvent);
    audio.readyState = "ended";
    camera.readyState = "ended";

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();
    errors.unwatch();

    const fresh = session?.localStream?.getVideoTracks()[0];
    expect(fresh).not.toBe(camera);
    expect(fresh?.readyState).toBe("live");
    expect(session?.cameraTrack).toBe(fresh);
    expect(errors.calls).toEqual([MIC_BUSY_TEXT]);
  });

  it("should name both devices once when another app holds both", async () => {
    const { session, audio } = await activeWith(deviceBusy, deviceBusy);
    const errors = collectEvents(notificationsModel.showErrorEvent);
    audio.readyState = "ended";
    (session?.cameraTrack as unknown as FakeTrack).readyState = "ended";

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([MIC_AND_CAMERA_BUSY_TEXT]);
  });

  it("should name busy devices once when they end together with the return to the page (regression)", async () => {
    const { session, audio } = await activeWith(deviceBusy, deviceBusy);
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    endTrackBySystem(audio);
    endTrackBySystem(session?.cameraTrack as unknown as FakeTrack);
    await settleMicrotasks();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([MIC_AND_CAMERA_BUSY_TEXT]);
  });

  it("should leave tracks that still run alone", async () => {
    await activeWith(async () => createFakeStream(["audio"]));
    const calls = vi.mocked(adapter.getUserMedia).mock.calls.length;

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();

    expect(vi.mocked(adapter.getUserMedia).mock.calls.length).toBe(calls);
  });

  describe("a track the system muted without ending it (iOS stop recording)", () => {
    const toggleTwice = async (toggle: () => void) => {
      toggle();
      await settleMicrotasks();
      toggle();
      await settleMicrotasks();
    };

    const gumCalls = () => vi.mocked(adapter.getUserMedia).mock.calls.length;

    it("should get the camera again when the user turns it back on (regression)", async () => {
      const { session, pc } = await activeWith(async () => createFakeStream(["audio"]));
      const camera = session?.cameraTrack as unknown as FakeTrack;
      setTrackMutedBySystem(camera, true);
      await settleMicrotasks();
      expect(readStore(callPresenceModel.$localTrackMutes).cameraMuted).toBe(true);

      await toggleTwice(callModel.toggleCamera);

      const fresh = session?.cameraTrack;
      expect(fresh).toBeDefined();
      expect(fresh).not.toBe(camera);
      expect(fresh?.readyState).toBe("live");
      expect(session?.localStream?.getVideoTracks()).toEqual([fresh]);
      expect(camera.stop).toHaveBeenCalled();
      expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(true);
      expect(fresh?.enabled).toBe(true);
      expect(readStore(callModel.$selfMediaState).cameraOn).toBe(true);
      expect(readStore(callPresenceModel.$localTrackMutes).cameraMuted).toBe(false);
    });

    it("should get the microphone again when the user turns it back on (regression)", async () => {
      const { session, audio, pc } = await activeWith(async () => createFakeStream(["audio"]));
      setTrackMutedBySystem(audio, true);
      await settleMicrotasks();
      expect(readStore(callPresenceModel.$localTrackMutes).micMuted).toBe(true);

      await toggleTwice(callModel.toggleMic);

      const fresh = session?.localStream?.getAudioTracks()[0];
      expect(fresh).toBeDefined();
      expect(fresh).not.toBe(audio);
      expect(fresh?.readyState).toBe("live");
      expect(audio.stop).toHaveBeenCalled();
      expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(true);
      expect(fresh?.enabled).toBe(true);
      expect(readStore(callModel.$selfMediaState).micOn).toBe(true);
      expect(readStore(callPresenceModel.$localTrackMutes).micMuted).toBe(false);
    });

    it("should leave a muted camera the user just turned off alone", async () => {
      const { session } = await activeWith(async () => createFakeStream(["audio"]));
      const camera = session?.cameraTrack as unknown as FakeTrack;
      setTrackMutedBySystem(camera, true);
      const calls = gumCalls();

      callModel.toggleCamera();
      await settleMicrotasks();

      expect(gumCalls()).toBe(calls);
      expect(session?.cameraTrack).toBe(camera);
      expect(camera.stop).not.toHaveBeenCalled();
    });

    it("should not replace a muted camera on the return to the page", async () => {
      const { session } = await activeWith(async () => createFakeStream(["audio"]));
      const camera = session?.cameraTrack as unknown as FakeTrack;
      setTrackMutedBySystem(camera, true);
      const calls = gumCalls();

      callPresenceModel.visibilityChanged(false);
      callPresenceModel.visibilityChanged(true);
      await settleMicrotasks();

      expect(gumCalls()).toBe(calls);
      expect(session?.cameraTrack).toBe(camera);
      expect(camera.stop).not.toHaveBeenCalled();
    });

    it("should keep a camera toggle made while the fresh camera was being swapped in", async () => {
      const { session, pc } = await activeWith(async () => createFakeStream(["audio"]));
      const cameraTrack = session?.cameraTrack;
      const camera = cameraTrack as unknown as FakeTrack;
      const sender = pc.getSenders().find((candidate) => candidate.track === cameraTrack);
      let releaseSwap: () => void = () => undefined;
      const swapped = new Promise<void>((resolve) => {
        releaseSwap = resolve;
      });
      sender?.replaceTrack.mockImplementationOnce(async (next) => {
        await swapped;
        sender.track = next;
      });
      setTrackMutedBySystem(camera, true);
      callModel.toggleCamera();
      await settleMicrotasks();
      callModel.toggleCamera();
      await settleMicrotasks();

      callModel.toggleCamera();
      await settleMicrotasks();
      releaseSwap();
      await settleMicrotasks();

      const fresh = session?.cameraTrack;
      expect(fresh).not.toBe(camera);
      expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
      expect(fresh?.enabled).toBe(false);
    });

    it("should bring back a camera turned on while the microphone was being recovered", async () => {
      let releaseMic: () => void = () => undefined;
      let micHeld = false;
      const { session, audio } = await activeWith(async () => {
        if (!micHeld) return createFakeStream(["audio"]);
        await new Promise<void>((resolve) => {
          releaseMic = resolve;
        });
        return createFakeStream(["audio"]);
      });
      const camera = session?.cameraTrack as unknown as FakeTrack;
      callModel.toggleCamera();
      await settleMicrotasks();
      callModel.toggleMic();
      await settleMicrotasks();
      setTrackMutedBySystem(camera, true);
      setTrackMutedBySystem(audio, true);
      micHeld = true;

      callModel.toggleMic();
      await settleMicrotasks();
      callModel.toggleCamera();
      await settleMicrotasks();
      expect(session?.cameraTrack).toBe(camera);

      releaseMic();
      await settleMicrotasks();
      await settleMicrotasks();

      expect(session?.localStream?.getAudioTracks()[0]).not.toBe(audio);
      expect(session?.cameraTrack).not.toBe(camera);
      expect(session?.cameraTrack?.readyState).toBe("live");
      expect(session?.cameraTrack?.enabled).toBe(true);
    });

    it("should leave the muted camera alone and stay silent about it when the microphone is toggled", async () => {
      const { session } = await activeWith(async () => createFakeStream(["audio"]), deviceDenied);
      const camera = session?.cameraTrack as unknown as FakeTrack;
      setTrackMutedBySystem(camera, true);
      const errors = collectEvents(notificationsModel.showErrorEvent);
      const calls = gumCalls();

      await toggleTwice(callModel.toggleMic);
      errors.unwatch();

      expect(gumCalls()).toBe(calls);
      expect(session?.cameraTrack).toBe(camera);
      expect(camera.stop).not.toHaveBeenCalled();
      expect(errors.calls).toEqual([]);
    });

    it("should keep the shared screen on the connection and send the fresh camera after the share", async () => {
      const { session, pc } = await activeWith(async () => createFakeStream(["audio"]));
      const camera = session?.cameraTrack as unknown as FakeTrack;
      callModel.toggleScreenShare();
      await settleMicrotasks();
      const screen = session?.screenStream?.getVideoTracks()[0];
      expect(screen).toBeDefined();
      setTrackMutedBySystem(camera, true);

      await toggleTwice(callModel.toggleCamera);

      const fresh = session?.cameraTrack;
      expect(fresh).not.toBe(camera);
      expect(fresh?.readyState).toBe("live");
      expect(camera.stop).toHaveBeenCalled();
      expect(screen?.readyState).toBe("live");
      expect(pc.getSenders().some((sender) => sender.track === screen)).toBe(true);
      expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(false);

      callModel.toggleScreenShare();
      await settleMicrotasks();

      expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
      expect(pc.getSenders().some((sender) => sender.track === fresh)).toBe(true);
    });
  });

  it("should say the camera could not be turned on when the user turns on a camera the browser refuses (regression)", async () => {
    const { session } = await activeWith(async () => createFakeStream(["audio"]), deviceDenied);
    const errors = collectEvents(notificationsModel.showErrorEvent);

    endTrackBySystem(session?.cameraTrack as unknown as FakeTrack);
    await settleMicrotasks();
    callModel.toggleCamera();
    await settleMicrotasks();
    expect(errors.calls).toEqual([]);

    callModel.toggleCamera();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([CAMERA_FAILED_TEXT]);
    expect(readStore(callModel.$callPhase)).toBe("active");
    expect(sent.some((message) => message.type === "call_hangup")).toBe(false);
  });

  it("should stay silent when the browser refuses a stopped camera on the return to the page", async () => {
    const { session } = await activeWith(async () => createFakeStream(["audio"]), deviceDenied);
    const errors = collectEvents(notificationsModel.showErrorEvent);
    (session?.cameraTrack as unknown as FakeTrack).readyState = "ended";

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([]);
    expect(readStore(callModel.$callPhase)).toBe("active");
  });
});
