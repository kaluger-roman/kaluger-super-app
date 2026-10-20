import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { notificationsModel } from "@shared";

import {
  callModel,
  getSession,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { settleMicrotasks, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

describe("features/videoCall/model screen share", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;
  let displayStream: MediaStream;
  let getDisplayMedia: Mock<() => Promise<MediaStream>>;

  beforeEach(() => {
    sent = [];
    displayStream = createFakeStream(["video"]);
    getDisplayMedia = vi.fn(async () => displayStream);
    setCallTransport((message) => sent.push(message));
    setWebRtcAdapter(createFakeAdapter({ getDisplayMedia }));
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
    sent = [];

    const screenTrack = displayStream.getVideoTracks()[0] as unknown as {
      dispatchEnded: () => void;
    };
    screenTrack.dispatchEnded();
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
    sent = [];
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

  it("should report screenSharing:false even when restoring the camera track fails", async () => {
    await startCallerSession("call-7");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    const sender = getSession("call-7")?.videoTransceiver?.sender as unknown as {
      replaceTrack: Mock;
    };
    sender.replaceTrack.mockRejectedValueOnce(new Error("replace failed"));
    sent = [];

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
    expect(sent.find((m) => m.type === "call_media_state")).toMatchObject({
      screenSharing: false,
    });
  });
});
