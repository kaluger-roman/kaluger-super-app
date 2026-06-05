import { allSettled, fork } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  dispatchCallSignal,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";

const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const startCallerSession = async (callId: string): Promise<void> => {
  dispatchCallSignal({ type: "call_ringing", callId, iceServers: [] });
  dispatchCallSignal({ type: "call_accepted", callId, iceServers: [] });
  await settleMicrotasks();
};

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
    expect(callModel.$selfMediaState.getState().micOn).toBe(false);
  });

  it("should turn the camera off and broadcast when toggled", async () => {
    await startCallerSession("call-cam");
    sent = [];

    callModel.toggleCamera();
    await settleMicrotasks();

    const mediaState = sent.find((m) => m.type === "call_media_state");
    expect(mediaState).toMatchObject({ cameraOn: false });
    expect(callModel.$selfMediaState.getState().cameraOn).toBe(false);
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

    await startCallerSession("call-reneg");
    expect(callModel.$selfMediaState.getState().cameraOn).toBe(false);
    sent = [];

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
    expect(callModel.$selfMediaState.getState().cameraOn).toBe(true);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      cameraOn: true,
    });
  });

  it("should update $peerMediaState when an inbound call_media_state arrives", async () => {
    const scope = fork();
    await allSettled(callModel.peerMediaStateChanged, {
      scope,
      params: { micOn: false, cameraOn: false, screenSharing: false },
    });
    expect(scope.getState(callModel.$peerMediaState)).toEqual({
      micOn: false,
      cameraOn: false,
      screenSharing: false,
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

    expect(callModel.$selfMediaState.getState().cameraOn).toBe(false);
    expect(callModel.$selfMediaState.getState().micOn).toBe(true);
  });

  it("should abort the call when both camera and microphone fail", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async () => {
          throw new Error("NotAllowedError");
        }),
      })
    );

    dispatchCallSignal({ type: "call_ringing", callId: "call-x", iceServers: [] });
    dispatchCallSignal({ type: "call_accepted", callId: "call-x", iceServers: [] });
    await settleMicrotasks();

    expect(callModel.$callStatusMessage.getState()).toEqual({
      kind: "error",
      text: "Нет доступа к камере и микрофону",
    });
  });
});
