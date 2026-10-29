import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import {
  CAMERA_BUSY_TEXT,
  CONNECTION_FAILED_TEXT,
  MIC_AND_CAMERA_BUSY_TEXT,
  MIC_BUSY_TEXT,
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
  settleMicrotasks,
  startCalleeSession,
} from "./callFlow";
import {
  createFakeAdapter,
  createFakeStream,
  endTrackBySystem,
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

  describe("a rebuild for the peer's restart that meets the ICE restart of the own return", () => {
    // The page came back (call_resume without a session restart) and the server answers with the
    // peer's restart it missed while away.
    const returnAndHearPeerRestart = (callId: string) => {
      void resumeSendModel.sendResumeFx({ callId, role: "tutor", sessionRestart: false });
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

      returnAndHearPeerRestart("roll");
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

      returnAndHearPeerRestart("making");
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

      returnAndHearPeerRestart("closed");
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

  it("should leave tracks that still run alone", async () => {
    await activeWith(async () => createFakeStream(["audio"]));
    const calls = vi.mocked(adapter.getUserMedia).mock.calls.length;

    callPresenceModel.visibilityChanged(false);
    callPresenceModel.visibilityChanged(true);
    await settleMicrotasks();

    expect(vi.mocked(adapter.getUserMedia).mock.calls.length).toBe(calls);
  });
});
