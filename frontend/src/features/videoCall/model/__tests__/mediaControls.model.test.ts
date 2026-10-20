import { allSettled, fork } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel, setCallTransport, setWebRtcAdapter, stopAllSessions } from "../index";
import { connectCallerSession, settleMicrotasks, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import { readStore } from "./storeProbe";

describe("features/videoCall/model media controls", () => {
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

  it("should flip the audio track and broadcast call_media_state on toggleMic", async () => {
    await startCallerSession("call-mic");
    sent = [];

    callModel.toggleMic();
    await settleMicrotasks();

    const mediaState = sent.find((m) => m.type === "call_media_state");
    expect(mediaState).toMatchObject({ micOn: false, callId: "call-mic" });
    expect(readStore(callModel.$selfMediaState).micOn).toBe(false);
  });

  it("should turn the camera off and broadcast when toggled", async () => {
    await startCallerSession("call-cam");
    sent = [];

    callModel.toggleCamera();
    await settleMicrotasks();

    const mediaState = sent.find((m) => m.type === "call_media_state");
    expect(mediaState).toMatchObject({ cameraOn: false });
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("renegotiates with a new offer when the camera is enabled after an audio-only start", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video && constraints.audio) {
            throw new Error("NotReadableError");
          }
          if (constraints.video) return createFakeStream(["video"]);
          return createFakeStream(["audio"]);
        }),
      })
    );

    await connectCallerSession("call-reneg");
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
    sent = [];

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(true);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      cameraOn: true,
    });
  });

  it("should update $peerMediaState when an inbound call_media_state arrives", async () => {
    const scope = fork();
    await allSettled(callModel.peerMediaStateChanged, {
      scope,
      params: { micOn: false, cameraOn: false, screenSharing: false, cameraAvailable: true },
    });
    expect(scope.getState(callModel.$peerMediaState)).toEqual({
      micOn: false,
      cameraOn: false,
      screenSharing: false,
      cameraAvailable: true,
    });
  });

  it("should fall back to audio-only when video acquisition fails", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video) throw new Error("NotAllowedError");
          return createFakeStream(["audio"]);
        }),
      })
    );

    await startCallerSession("call-audio");

    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
    expect(readStore(callModel.$selfMediaState).micOn).toBe(true);
  });

  it("should abort the call when both camera and microphone fail", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async () => {
          throw new Error("NotAllowedError");
        }),
      })
    );

    await startCallerSession("call-x");

    expect(readStore(callModel.$callStatusMessage)).toEqual({
      kind: "error",
      text: "Нет доступа к камере и микрофону",
    });
  });
});
