import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  dispatchCallSignal,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { sendCallSignal } from "../signaling.helpers";
import { startCalleeSession, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakePeerConnection, createFakeStream } from "./fakeWebrtc";
import { readStore } from "./storeProbe";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("features/videoCall/model client signaling", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;

  beforeEach(() => {
    sent = [];
    setCallTransport((message) => sent.push(message));
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
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

      await startCallerSession("c-ice");

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

      await startCalleeSession("c-callee", [{ urls: "stun:stun.example:3478" }]);

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

      await startCallerSession("c-fail");
      sent = [];

      (pc as unknown as { connectionState: RTCPeerConnectionState }).connectionState = "failed";
      pc?.onconnectionstatechange?.(undefined as unknown as Event);
      await flush();

      expect(sent.some((m) => m.type === "call_hangup")).toBe(true);
      expect(readStore(callModel.$callPhase)).toBe("idle");
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
