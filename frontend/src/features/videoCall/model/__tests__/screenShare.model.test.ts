import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { notificationsModel } from "@shared";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { setWebRtcAdapter } from "../webrtc.helpers";
import { installTransport, resetCallFlow, settleMicrotasks, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import type { FakeAdapter, FakeStream } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

describe("features/videoCall/model screen share", () => {
  let sent: CallSignalingInbound[];
  let displayStream: FakeStream;
  let getDisplayMedia: Mock<() => Promise<FakeStream>>;
  let adapter: FakeAdapter;

  beforeEach(() => {
    sent = installTransport();
    displayStream = createFakeStream(["video"]);
    getDisplayMedia = vi.fn(async () => displayStream);
    adapter = createFakeAdapter({ getDisplayMedia });
    setWebRtcAdapter(adapter);
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should not start sharing while the own media is still being acquired", async () => {
    adapter = createFakeAdapter({
      getDisplayMedia,
      getUserMedia: () => new Promise(() => undefined),
    });
    setWebRtcAdapter(adapter);
    await startCallerSession("call-pending-media");

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(readStore(callModel.$screenStream)).toBeNull();
  });

  it("should start sharing and broadcast screenSharing:true", async () => {
    await startCallerSession("call-1");
    sent.length = 0;

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(true);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: true,
      cameraAvailable: true,
    });
  });

  it("should revert to camera when the native Stop (ended) fires", async () => {
    await startCallerSession("call-2");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    sent.length = 0;

    displayStream.getVideoTracks()[0].dispatchEnded();
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: false,
      cameraAvailable: true,
    });
  });

  it("should block sharing with an info toast when the peer is already sharing", async () => {
    await startCallerSession("call-3");
    callModel.peerMediaStateChanged({
      micOn: true,
      cameraOn: true,
      screenSharing: true,
      cameraAvailable: true,
    });
    sent.length = 0;
    getDisplayMedia.mockClear();
    const toasts = collectEvents(notificationsModel.showInfoEvent);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    toasts.unwatch();

    expect(toasts.calls).toContain("Собеседник уже демонстрирует экран");
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
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

  it("should show an error toast when the screen share cannot start", async () => {
    getDisplayMedia.mockRejectedValueOnce(new DOMException("busy", "NotReadableError"));
    await startCallerSession("call-5");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toContain("Не удалось начать демонстрацию экрана");
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
  });

  it("should stay silent when the user closes the screen picker", async () => {
    getDisplayMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    await startCallerSession("call-6");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toHaveLength(0);
  });

  it("should report screenSharing:false and warn when restoring the camera track fails", async () => {
    await startCallerSession("call-7");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    const [videoTransceiver] = adapter.peerConnections[0]
      .getTransceivers()
      .filter((transceiver) => transceiver.receiver.track.kind === "video");
    videoTransceiver.sender.replaceTrack.mockRejectedValueOnce(new Error("replace failed"));
    sent.length = 0;
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    errors.unwatch();

    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
    expect(readStore(callModel.$screenStream)).toBeNull();
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: false,
    });
    expect(errors.calls).toContain("Не удалось вернуть камеру после демонстрации экрана");
  });

  it("should preview the shared screen in the own tile while sharing", async () => {
    await startCallerSession("call-8");
    const camera = readStore(callModel.$localTileStream);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    expect(readStore(callModel.$localTileStream)).toBe(displayStream);

    callModel.toggleScreenShare();
    await settleMicrotasks();
    expect(readStore(callModel.$localTileStream)).toBe(camera);
  });
});
