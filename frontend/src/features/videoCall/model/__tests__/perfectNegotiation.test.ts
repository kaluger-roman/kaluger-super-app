import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { getSession, setWebRtcAdapter } from "../webrtc.helpers";
import {
  installTransport,
  receive,
  resetCallFlow,
  settleMicrotasks,
  startCalleeSession,
  startCallerSession,
} from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import type { FakeAdapter } from "./fakeWebrtc";

describe("features/videoCall perfect negotiation (glare)", () => {
  let sent: CallSignalingInbound[];

  beforeEach(() => {
    sent = installTransport();
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should ignore a glaring offer on the impolite side", async () => {
    setWebRtcAdapter(createFakeAdapter());

    await startCallerSession("c-impolite");

    const session = getSession("c-impolite");
    expect(session?.polite).toBe(false);
    expect(session?.pc.signalingState).toBe("have-local-offer");
    sent.length = 0;

    receive({ type: "webrtc_offer", callId: "c-impolite", sdp: { type: "offer", sdp: "glare" } });
    await settleMicrotasks();

    expect(sent.find((m) => m.type === "webrtc_answer")).toBeUndefined();
    expect(getSession("c-impolite")?.ignoreOffer).toBe(true);
  });

  it("should answer a glaring offer on the polite side and then resend its own offer", async () => {
    const adapter: FakeAdapter = createFakeAdapter({
      getUserMedia: async (constraints) => {
        if (constraints.video && constraints.audio) throw new Error("NotReadableError");
        if (constraints.video) return createFakeStream(["video"]);
        return createFakeStream(["audio"]);
      },
    });
    setWebRtcAdapter(adapter);

    await startCalleeSession("c-polite");

    expect(getSession("c-polite")?.polite).toBe(true);

    callModel.toggleCamera();
    await settleMicrotasks();
    expect(getSession("c-polite")?.pc.signalingState).toBe("have-local-offer");

    const pc = adapter.peerConnections[adapter.peerConnections.length - 1];
    pc.setLocalDescription.mockClear();
    sent.length = 0;

    receive({ type: "webrtc_offer", callId: "c-polite", sdp: { type: "offer", sdp: "glare" } });
    await settleMicrotasks();

    expect(pc.setLocalDescription).not.toHaveBeenCalledWith({ type: "rollback" });
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: "offer", sdp: "glare" });
    const types = sent.map((m) => m.type);
    expect(types).toContain("webrtc_answer");
    expect(types.indexOf("webrtc_offer")).toBeGreaterThan(types.indexOf("webrtc_answer"));
  });
});
