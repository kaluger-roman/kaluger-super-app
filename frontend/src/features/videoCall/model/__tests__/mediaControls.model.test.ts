import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { setWebRtcAdapter } from "../webrtc.helpers";
import {
  connectCallerSession,
  installTransport,
  receive,
  resetCallFlow,
  settleMicrotasks,
  startCallerSession,
} from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import { readStore } from "./storeProbe";

describe("features/videoCall/model media controls", () => {
  let sent: CallSignalingInbound[];

  beforeEach(() => {
    sent = installTransport();
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should flip the audio track and broadcast call_media_state on toggleMic", async () => {
    await startCallerSession("call-mic");
    sent.length = 0;

    callModel.toggleMic();
    await settleMicrotasks();

    const mediaState = sent.find((m) => m.type === "call_media_state");
    expect(mediaState).toMatchObject({ micOn: false, callId: "call-mic" });
    expect(readStore(callModel.$selfMediaState).micOn).toBe(false);
  });

  it("should turn the camera off and broadcast when toggled", async () => {
    await startCallerSession("call-cam");
    sent.length = 0;

    callModel.toggleCamera();
    await settleMicrotasks();

    const mediaState = sent.find((m) => m.type === "call_media_state");
    expect(mediaState).toMatchObject({ cameraOn: false });
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("renegotiates with a new offer when the camera is enabled after an audio-only start", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: async (constraints) => {
          if (constraints.video && constraints.audio) {
            throw new Error("NotReadableError");
          }
          if (constraints.video) return createFakeStream(["video"]);
          return createFakeStream(["audio"]);
        },
      })
    );

    await connectCallerSession("call-reneg");
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
    sent.length = 0;

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(true);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      cameraOn: true,
    });
  });

  it("should update $peerMediaState when the peer's call_media_state arrives", async () => {
    await connectCallerSession("call-peer-media");
    const peerMedia = { micOn: false, cameraOn: false, screenSharing: true, cameraAvailable: true };

    receive({ type: "call_media_state", callId: "call-peer-media", ...peerMedia });

    expect(readStore(callModel.$peerMediaState)).toEqual(peerMedia);
  });

  it("should ignore a call_media_state of another call", async () => {
    await connectCallerSession("call-own");
    const before = readStore(callModel.$peerMediaState);

    receive({
      type: "call_media_state",
      callId: "call-other",
      micOn: false,
      cameraOn: false,
      screenSharing: true,
      cameraAvailable: false,
    });

    expect(readStore(callModel.$peerMediaState)).toEqual(before);
  });

  it("should fall back to audio-only when video acquisition fails", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: async (constraints) => {
          if (constraints.video) throw new Error("NotAllowedError");
          return createFakeStream(["audio"]);
        },
      })
    );

    await startCallerSession("call-audio");

    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
    expect(readStore(callModel.$selfMediaState).micOn).toBe(true);
  });

  it("should abort the call when both camera and microphone fail", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: async () => {
          throw new Error("NotAllowedError");
        },
      })
    );

    await startCallerSession("call-x");

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(sent).toContainEqual({
      type: "call_hangup",
      callId: "call-x",
      reason: "media_unavailable",
    });
  });

  it("should keep a mic toggled while the camera was being turned on", async () => {
    let grantCamera: (stream: ReturnType<typeof createFakeStream>) => void = () => undefined;
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: (constraints) => {
          if (constraints.video && constraints.audio) return Promise.reject(new Error("busy"));
          if (constraints.video) {
            return new Promise((resolve) => {
              grantCamera = resolve;
            });
          }
          return Promise.resolve(createFakeStream(["audio"]));
        },
      })
    );
    await connectCallerSession("call-both");

    callModel.toggleCamera();
    await settleMicrotasks();
    callModel.toggleMic();
    await settleMicrotasks();
    grantCamera(createFakeStream(["video"]));
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState)).toMatchObject({ micOn: false, cameraOn: true });
  });
});
