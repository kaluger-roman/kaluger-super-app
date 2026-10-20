import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  dispatchCallSignal,
  getSession,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { settleMicrotasks, startCalleeSession, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakePeerConnection, createFakeStream } from "./fakeWebrtc";

const lastPc = (pcs: RTCPeerConnection[]): RTCPeerConnection => {
  const pc = pcs[pcs.length - 1];
  if (!pc) throw new Error("no peer connection created");
  return pc;
};

const setLocalDescriptionMock = (pc: RTCPeerConnection) =>
  pc.setLocalDescription as unknown as ReturnType<typeof vi.fn>;

describe("features/videoCall perfect negotiation (glare)", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;
  let pcs: RTCPeerConnection[];

  beforeEach(() => {
    sent = [];
    pcs = [];
    setCallTransport((message) => sent.push(message));
  });

  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  it("should ignore a glaring offer on the impolite side", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        createPeerConnection: vi.fn(() => {
          const pc = createFakePeerConnection();
          pcs.push(pc);
          return pc;
        }),
      })
    );

    await startCallerSession("c-impolite");

    const session = getSession("c-impolite");
    expect(session?.polite).toBe(false);
    expect(session?.pc.signalingState).toBe("have-local-offer");
    sent = [];

    dispatchCallSignal({
      type: "webrtc_offer",
      callId: "c-impolite",
      sdp: { type: "offer", sdp: "glare" },
    });
    await settleMicrotasks();

    expect(sent.find((m) => m.type === "webrtc_answer")).toBeUndefined();
  });

  it("should answer a glaring offer on the polite side and then resend its own offer", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video && constraints.audio) {
            throw new Error("NotReadableError");
          }
          if (constraints.video) return createFakeStream(["video"]);
          return createFakeStream(["audio"]);
        }),
        createPeerConnection: vi.fn(() => {
          const pc = createFakePeerConnection();
          pcs.push(pc);
          return pc;
        }),
      })
    );

    await startCalleeSession("c-polite");

    expect(getSession("c-polite")?.polite).toBe(true);

    callModel.toggleCamera();
    await settleMicrotasks();
    expect(getSession("c-polite")?.pc.signalingState).toBe("have-local-offer");

    const pc = lastPc(pcs);
    setLocalDescriptionMock(pc).mockClear();
    sent = [];

    dispatchCallSignal({
      type: "webrtc_offer",
      callId: "c-polite",
      sdp: { type: "offer", sdp: "glare" },
    });
    await settleMicrotasks();

    expect(setLocalDescriptionMock(pc)).not.toHaveBeenCalledWith({ type: "rollback" });
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: "offer", sdp: "glare" });
    const types = sent.map((m) => m.type);
    expect(types).toContain("webrtc_answer");
    expect(types.indexOf("webrtc_offer")).toBeGreaterThan(types.indexOf("webrtc_answer"));
  });
});
