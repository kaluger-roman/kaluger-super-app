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

describe("features/videoCall/model screen share", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;
  let displayStream: MediaStream;

  beforeEach(() => {
    sent = [];
    displayStream = createFakeStream(["video"]);
    setCallTransport((message) => sent.push(message));
    setWebRtcAdapter(
      createFakeAdapter({ getDisplayMedia: vi.fn(async () => displayStream) })
    );
  });

  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  it("should start sharing and broadcast screenSharing:true", async () => {
    await startCallerSession("call-1");
    sent = [];

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(callModel.$selfMediaState.getState().screenSharing).toBe(true);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: true,
    });
  });

  it("should revert to camera when the native Stop (ended) fires", async () => {
    await startCallerSession("call-2");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    sent = [];

    const screenTrack = displayStream.getVideoTracks()[0] as unknown as {
      dispatchEnded: () => void;
    };
    screenTrack.dispatchEnded();
    await settleMicrotasks();

    expect(callModel.$selfMediaState.getState().screenSharing).toBe(false);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: false,
    });
  });

  it("should block sharing with an info message when the peer is already sharing", async () => {
    await startCallerSession("call-3");
    callModel.peerMediaStateChanged({
      micOn: true,
      cameraOn: true,
      screenSharing: true,
    });
    sent = [];

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(callModel.$selfMediaState.getState().screenSharing).toBe(false);
    expect(sent.find((m) => m.type === "call_media_state")).toBeUndefined();
  });

  it("should stop the screen share when the call ends", async () => {
    await startCallerSession("call-4");
    callModel.toggleScreenShare();
    await settleMicrotasks();

    callModel.hangUp();
    await settleMicrotasks();

    const screenTrack = displayStream.getVideoTracks()[0];
    expect(screenTrack.stop).toHaveBeenCalled();
  });
});
