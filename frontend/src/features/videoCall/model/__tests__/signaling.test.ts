import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import { callModel } from "../index";
import { parseCallSignal } from "../signaling.helpers";
import type { CallSignalingInbound } from "../signaling.types";
import { resetCallTransportsForTests, setCallTransport } from "../transport.helpers";
import { setWebRtcAdapter } from "../webrtc.helpers";
import {
  installTransport,
  receive,
  resetCallFlow,
  settleMicrotasks,
  startCalleeSession,
  startCallerSession,
} from "./callFlow";
import { createFakeAdapter, createFakeStream, triggerConnectionState } from "./fakeWebrtc";
import type { FakeAdapter } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

describe("features/videoCall/model parseCallSignal", () => {
  it("should keep a well-formed signal and drop fields it does not know", () => {
    expect(
      parseCallSignal({ type: "call_ringing", callId: "c-1", inviteId: "i-1", extra: true })
    ).toEqual({ type: "call_ringing", callId: "c-1", inviteId: "i-1" });
  });

  it("should reject a signal with a missing or mistyped field", () => {
    expect(parseCallSignal({ type: "call_ringing", callId: "c-1" })).toBeNull();
    expect(parseCallSignal({ type: "call_ended", callId: "c-1", reason: "bored" })).toBeNull();
    expect(
      parseCallSignal({ type: "call_accepted", callId: "c-1", iceServers: [{ urls: 1 }] })
    ).toBeNull();
    expect(
      parseCallSignal({
        type: "call_media_state",
        callId: "c-1",
        micOn: true,
        cameraOn: true,
        screenSharing: false,
      })
    ).toBeNull();
  });

  it("should accept a reply addressed by inviteId or by callId", () => {
    expect(parseCallSignal({ type: "call_busy", inviteId: "i-1" })).toEqual({
      type: "call_busy",
      inviteId: "i-1",
    });
    expect(parseCallSignal({ type: "call_unavailable", reason: "offline", callId: "c-1" })).toEqual(
      { type: "call_unavailable", reason: "offline", callId: "c-1" }
    );
    expect(parseCallSignal({ type: "call_error", message: "Ошибка" })).toBeNull();
  });

  it("should not take a lesson event for a call signal", () => {
    expect(parseCallSignal({ type: "lesson_status_updated", lessonId: "l-1" })).toBeNull();
    expect(parseCallSignal("call_busy")).toBeNull();
  });
});

describe("features/videoCall/model client signaling", () => {
  let sent: CallSignalingInbound[];
  let adapter: FakeAdapter;

  beforeEach(() => {
    sent = installTransport();
    adapter = createFakeAdapter();
    setWebRtcAdapter(adapter);
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should acquire media and send a webrtc_offer when the caller receives call_accepted", async () => {
    await startCallerSession("c-1", [{ urls: "stun:example" }]);

    const offer = sent.find((m) => m.type === "webrtc_offer");
    expect(offer).toMatchObject({ type: "webrtc_offer", callId: "c-1" });
    expect(offer).toHaveProperty("sdp");
  });

  it("should answer when the callee receives a webrtc_offer", async () => {
    await startCalleeSession("c-2", [{ urls: "stun:example" }]);

    const answer = sent.find((m) => m.type === "webrtc_answer");
    expect(answer).toMatchObject({ type: "webrtc_answer", callId: "c-2" });
  });

  it("should buffer inbound ICE until the remote description is set, then flush it", async () => {
    await startCallerSession("c-ice");
    const { addIceCandidate } = adapter.peerConnections[0];

    receive({ type: "webrtc_ice", callId: "c-ice", candidate: { candidate: "x" } });
    await settleMicrotasks();
    expect(addIceCandidate).not.toHaveBeenCalled();

    receive({ type: "webrtc_answer", callId: "c-ice", sdp: { type: "answer", sdp: "x" } });
    await settleMicrotasks();
    expect(addIceCandidate).toHaveBeenCalledTimes(1);
    expect(addIceCandidate).toHaveBeenCalledWith({ candidate: "x" });
  });

  it("should log an ICE candidate that fails outside an ignored offer", async () => {
    await startCallerSession("c-ice-fail");
    receive({ type: "webrtc_answer", callId: "c-ice-fail", sdp: { type: "answer", sdp: "x" } });
    await settleMicrotasks();
    adapter.peerConnections[0].addIceCandidate.mockRejectedValueOnce(new Error("bad candidate"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    receive({ type: "webrtc_ice", callId: "c-ice-fail", candidate: { candidate: "y" } });
    await settleMicrotasks();

    expect(logged).toHaveBeenCalledWith("Failed to apply ICE candidate:", expect.any(Error));
  });

  it("should seed the callee PeerConnection with ICE servers delivered in call_incoming", async () => {
    await startCalleeSession("c-callee", [{ urls: "stun:stun.example:3478" }]);

    const [config] = vi.mocked(adapter.createPeerConnection).mock.calls[0];
    expect(config.iceServers).toHaveLength(1);
    expect(config.iceServers?.[0]).toMatchObject({ urls: "stun:stun.example:3478" });
  });

  it("should end the call when its signal finds no socket for the call's role", async () => {
    resetCallTransportsForTests();
    setCallTransport("student", (message) => sent.push(message), "student-socket");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    receive({ type: "call_incoming", callId: "c-no-socket", callerName: "Анна", iceServers: [] });
    callModel.acceptCall();
    await settleMicrotasks();
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(errors.calls).toContain("Нет связи с сервером. Проверьте интернет и попробуйте снова");
    expect(sent).toEqual([]);
  });

  it("should notify the peer with call_hangup and end the call when the connection fails", async () => {
    await startCallerSession("c-fail");
    sent.length = 0;

    triggerConnectionState(adapter.peerConnections[0], "failed");
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "call_hangup")).toBe(true);
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });
});

describe("fakeWebrtc helper", () => {
  it("should create a stream with audio and video tracks", () => {
    const stream = createFakeStream();
    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(1);
  });
});
