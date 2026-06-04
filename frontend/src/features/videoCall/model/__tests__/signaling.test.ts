import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  dispatchCallSignal,
  setCallTransport,
  setWebRtcAdapter,
} from "../index";
import { sendCallSignal } from "../signaling";
import {
  createFakeAdapter,
  createFakePeerConnection,
  createFakeStream,
} from "./fakeWebrtc";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("features/videoCall/model client signaling", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;

  beforeEach(() => {
    sent = [];
    setCallTransport((message) => sent.push(message));
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  describe("outbound sendCallSignal payloads", () => {
    it("should send a tutor call_invite with targetStudentId", () => {
      sendCallSignal({ type: "call_invite", targetStudentId: "stu-1" });
      expect(sent[0]).toEqual({ type: "call_invite", targetStudentId: "stu-1" });
    });

    it("should send call_accept with the callId", () => {
      sendCallSignal({ type: "call_accept", callId: "c-1" });
      expect(sent[0]).toEqual({ type: "call_accept", callId: "c-1" });
    });
  });

  describe("inbound dispatchCallSignal negotiation", () => {
    it("should acquire media and send a webrtc_offer when the caller receives call_accepted", async () => {
      dispatchCallSignal({
        type: "call_accepted",
        callId: "c-1",
        iceServers: [{ urls: "stun:example" }],
      });
      await flush();

      const offer = sent.find((m) => m.type === "webrtc_offer");
      expect(offer).toMatchObject({ type: "webrtc_offer", callId: "c-1" });
      expect(offer).toHaveProperty("sdp");
    });

    it("should answer when the callee receives a webrtc_offer", async () => {
      dispatchCallSignal({
        type: "call_ringing",
        callId: "c-2",
        iceServers: [{ urls: "stun:example" }],
      });
      dispatchCallSignal({
        type: "webrtc_offer",
        callId: "c-2",
        sdp: { type: "offer", sdp: "x" },
      });
      await flush();

      const answer = sent.find((m) => m.type === "webrtc_answer");
      expect(answer).toMatchObject({ type: "webrtc_answer", callId: "c-2" });
    });

    it("buffers inbound ICE until the remote description is set, then flushes", async () => {
      let pc: RTCPeerConnection | undefined;
      setWebRtcAdapter(
        createFakeAdapter({
          createPeerConnection: vi.fn(() => {
            pc = createFakePeerConnection();
            return pc;
          }),
        })
      );

      dispatchCallSignal({ type: "call_ringing", callId: "c-ice", iceServers: [] });
      dispatchCallSignal({
        type: "call_accepted",
        callId: "c-ice",
        iceServers: [],
      });
      await flush();

      const addIce = pc!.addIceCandidate as unknown as ReturnType<typeof vi.fn>;
      dispatchCallSignal({
        type: "webrtc_ice",
        callId: "c-ice",
        candidate: { candidate: "x" },
      });
      await flush();
      expect(addIce).not.toHaveBeenCalled();

      dispatchCallSignal({
        type: "webrtc_answer",
        callId: "c-ice",
        sdp: { type: "answer", sdp: "x" },
      });
      await flush();
      expect(addIce).toHaveBeenCalledTimes(1);
      expect(addIce).toHaveBeenCalledWith({ candidate: "x" });
    });

    it("seeds the callee PeerConnection with ICE servers delivered in call_incoming", async () => {
      let config: RTCConfiguration | undefined;
      setWebRtcAdapter(
        createFakeAdapter({
          createPeerConnection: vi.fn((c: RTCConfiguration) => {
            config = c;
            return createFakePeerConnection();
          }),
        })
      );

      dispatchCallSignal({
        type: "call_incoming",
        callId: "c-callee",
        callerName: "Анна",
        iceServers: [{ urls: "stun:stun.example:3478" }],
      });
      dispatchCallSignal({
        type: "webrtc_offer",
        callId: "c-callee",
        sdp: { type: "offer", sdp: "x" },
      });
      await flush();

      expect(config?.iceServers).toHaveLength(1);
      expect(config?.iceServers?.[0]).toMatchObject({
        urls: "stun:stun.example:3478",
      });
    });

    it("notifies the peer with call_hangup and ends the call when the connection fails", async () => {
      let pc: RTCPeerConnection | undefined;
      setWebRtcAdapter(
        createFakeAdapter({
          createPeerConnection: vi.fn(() => {
            pc = createFakePeerConnection();
            return pc;
          }),
        })
      );

      dispatchCallSignal({ type: "call_ringing", callId: "c-fail", iceServers: [] });
      dispatchCallSignal({
        type: "call_accepted",
        callId: "c-fail",
        iceServers: [],
      });
      await flush();
      sent = [];

      (
        pc as unknown as { connectionState: RTCPeerConnectionState }
      ).connectionState = "failed";
      pc?.onconnectionstatechange?.(undefined as unknown as Event);
      await flush();

      expect(sent.some((m) => m.type === "call_hangup")).toBe(true);
      expect(callModel.$callPhase.getState()).toBe("idle");
    });
  });
});

describe("fakeWebrtc helper", () => {
  it("creates a stream with audio and video tracks", () => {
    const stream = createFakeStream();
    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(1);
  });
});
