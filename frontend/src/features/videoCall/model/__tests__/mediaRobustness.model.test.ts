import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { getSession, setWebRtcAdapter } from "../webrtc.helpers";
import {
  connectCallerSession,
  installTransport,
  receive,
  resetCallFlow,
  settleMicrotasks,
  startCallerSession,
} from "./callFlow";
import { createFakeAdapter, createFakeStream, createFakeTrack } from "./fakeWebrtc";
import type { FakeAdapter, FakeStream } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

// A device with a microphone but a camera that is busy or still waiting for permission.
const audioOnlyGetUserMedia =
  (camera: () => Promise<FakeStream> = async () => createFakeStream(["video"])) =>
  async (constraints: MediaStreamConstraints): Promise<FakeStream> => {
    if (constraints.video && constraints.audio) throw new Error("NotReadableError");
    if (constraints.video) return camera();
    return createFakeStream(["audio"]);
  };

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("features/videoCall/model media robustness", () => {
  let sent: CallSignalingInbound[];
  let adapter: FakeAdapter;

  beforeEach(() => {
    sent = installTransport();
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  const useAdapter = (overrides: Parameters<typeof createFakeAdapter>[0] = {}) => {
    adapter = createFakeAdapter(overrides);
    setWebRtcAdapter(adapter);
    return adapter;
  };

  it("should offer a receive-only video transceiver when the caller starts without a camera", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });

    await startCallerSession("audio-1");

    expect(adapter.peerConnections[0].addTransceiver).toHaveBeenCalledWith("video", {
      direction: "recvonly",
    });
  });

  it("should tell the peer the camera is unavailable right after an audio-only start", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });

    await startCallerSession("audio-2");

    expect(sent).toContainEqual({
      type: "call_media_state",
      callId: "audio-2",
      micOn: true,
      cameraOn: false,
      screenSharing: false,
      cameraAvailable: false,
    });
    expect(readStore(callModel.$selfMediaState).cameraAvailable).toBe(false);
  });

  it("should add the screen track and renegotiate when sharing without a camera", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await connectCallerSession("audio-3");
    sent.length = 0;

    callModel.toggleScreenShare();
    await settleMicrotasks();

    const [, videoTransceiver] = adapter.peerConnections[0].getTransceivers();
    expect(adapter.peerConnections[0].addTrack).toHaveBeenCalledTimes(1);
    expect(videoTransceiver.direction).toBe("sendrecv");
    expect(videoTransceiver.sender.replaceTrack).toHaveBeenCalled();
    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(true);
  });

  it("should stop the camera track when the call ends while camera permission is pending", async () => {
    const pendingCamera = deferred<FakeStream>();
    useAdapter({ getUserMedia: audioOnlyGetUserMedia(() => pendingCamera.promise) });
    await startCallerSession("cam-race");

    callModel.toggleCamera();
    callModel.hangUp();
    await settleMicrotasks();
    const lateCamera = createFakeStream(["video"]);
    pendingCamera.resolve(lateCamera);
    await settleMicrotasks();

    expect(lateCamera.getVideoTracks()[0].stop).toHaveBeenCalled();
    expect(getSession("cam-race")).toBeUndefined();
  });

  it("should stop the screen capture when the call ends while the picker is open", async () => {
    const pendingScreen = deferred<FakeStream>();
    useAdapter({ getDisplayMedia: () => pendingScreen.promise });
    await startCallerSession("screen-race");

    callModel.toggleScreenShare();
    callModel.hangUp();
    await settleMicrotasks();
    const lateScreen = createFakeStream(["video"]);
    pendingScreen.resolve(lateScreen);
    await settleMicrotasks();

    expect(lateScreen.getVideoTracks()[0].stop).toHaveBeenCalled();
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
  });

  it("should not keep a screen share that finished starting after the call ended", async () => {
    const pendingOffer = deferred<void>();
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await connectCallerSession("screen-late");
    adapter.peerConnections[0].setLocalDescription.mockImplementationOnce(
      () => pendingOffer.promise
    );

    callModel.toggleScreenShare();
    await settleMicrotasks();
    callModel.hangUp();
    await settleMicrotasks();
    pendingOffer.resolve();
    await settleMicrotasks();

    expect(readStore(callModel.$screenStream)).toBeNull();
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
  });

  it("should report a failed answer mid-call once and roll back once", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await connectCallerSession("answer-fail");
    const pc = adapter.peerConnections[0];
    pc.createAnswer.mockRejectedValueOnce(new Error("OperationError"));
    const errors = collectEvents(notificationsModel.showErrorEvent);

    receive({ type: "webrtc_offer", callId: "answer-fail", sdp: { type: "offer", sdp: "o" } });
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toEqual([
      "Не удалось обновить видео собеседника. Если оно пропало, перезвоните",
    ]);
    expect(pc.setLocalDescription).toHaveBeenCalledTimes(2);
    expect(pc.setLocalDescription).toHaveBeenLastCalledWith({ type: "rollback" });
    expect(readStore(callModel.$callPhase)).toBe("active");
  });

  it("should reuse the video transceiver when sharing again after an audio-only start", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await startCallerSession("audio-4");

    callModel.toggleScreenShare();
    await settleMicrotasks();
    callModel.toggleScreenShare();
    await settleMicrotasks();
    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(adapter.peerConnections[0].getTransceivers()).toHaveLength(2);
    expect(adapter.peerConnections[0].addTransceiver).toHaveBeenCalledTimes(1);
  });

  it("should keep sharing the screen when the camera is turned on during a share", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await startCallerSession("audio-5");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    const [, videoTransceiver] = adapter.peerConnections[0].getTransceivers();
    const screenTrack = videoTransceiver.sender.track;

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(videoTransceiver.sender.track).toBe(screenTrack);
    expect(readStore(callModel.$selfMediaState)).toMatchObject({
      cameraOn: true,
      screenSharing: true,
    });

    callModel.toggleScreenShare();
    await settleMicrotasks();
    expect(videoTransceiver.sender.track).toBe(getSession("audio-5")?.cameraTrack);
  });

  it("should acquire the camera only once on a double click", async () => {
    const pendingCamera = deferred<FakeStream>();
    useAdapter({ getUserMedia: audioOnlyGetUserMedia(() => pendingCamera.promise) });
    await startCallerSession("cam-double");

    callModel.toggleCamera();
    callModel.toggleCamera();
    pendingCamera.resolve(createFakeStream(["video"]));
    await settleMicrotasks();

    const cameraRequests = vi
      .mocked(adapter.getUserMedia)
      .mock.calls.filter(([constraints]) => constraints.video && !constraints.audio);
    expect(cameraRequests).toHaveLength(1);
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(true);
  });

  it("should keep a mic toggle made while the camera permission prompt was open", async () => {
    const pendingCamera = deferred<FakeStream>();
    useAdapter({ getUserMedia: audioOnlyGetUserMedia(() => pendingCamera.promise) });
    await startCallerSession("cam-mic");

    callModel.toggleCamera();
    callModel.toggleMic();
    pendingCamera.resolve(createFakeStream(["video"]));
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState)).toMatchObject({ micOn: false, cameraOn: true });
  });

  it("should show an error toast when the camera cannot be turned on", async () => {
    useAdapter({
      getUserMedia: async (constraints) => {
        if (constraints.video) throw new Error("NotAllowedError");
        return createFakeStream(["audio"]);
      },
    });
    await startCallerSession("cam-denied");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.toggleCamera();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toContain("Не удалось включить камеру. Проверьте разрешения браузера");
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("should add a remote track that arrives without a stream to the remote stream", async () => {
    useAdapter();
    await startCallerSession("track-1");
    const remoteStream = readStore(callModel.$remoteStream);
    const remoteTrack = createFakeTrack("video");

    adapter.peerConnections[0].ontrack?.({ track: remoteTrack, streams: [] });

    expect(remoteStream?.getTrackById(remoteTrack.id)).toBe(remoteTrack);
  });

  it("should build offers with an implicit setLocalDescription", async () => {
    useAdapter();

    await startCallerSession("offer-1");

    expect(adapter.peerConnections[0].setLocalDescription).toHaveBeenCalledWith();
    expect(adapter.peerConnections[0].createOffer).not.toHaveBeenCalled();
    expect(sent).toContainEqual({
      type: "webrtc_offer",
      callId: "offer-1",
      sdp: { type: "offer", sdp: "fake-offer" },
    });
  });

  it("should stop the capture and keep sharing off when renegotiation for the screen fails", async () => {
    const screen = createFakeStream(["video"]);
    useAdapter({ getUserMedia: audioOnlyGetUserMedia(), getDisplayMedia: async () => screen });
    await connectCallerSession("screen-fail");
    adapter.peerConnections[0].setLocalDescription.mockRejectedValueOnce(
      new Error("InvalidStateError")
    );

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(screen.getVideoTracks()[0].stop).toHaveBeenCalled();
    expect(getSession("screen-fail")?.screenStream).toBeNull();
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(false);
    expect(readStore(callModel.$callPhase)).toBe("active");
  });

  it("should renegotiate again when sharing is retried after a failed renegotiation", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await connectCallerSession("retry-1");
    adapter.peerConnections[0].setLocalDescription.mockRejectedValueOnce(
      new Error("InvalidStateError")
    );
    callModel.toggleScreenShare();
    await settleMicrotasks();
    sent.length = 0;

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
  });

  it("should release the camera when renegotiating for it fails", async () => {
    const camera = createFakeStream(["video"]);
    useAdapter({ getUserMedia: audioOnlyGetUserMedia(async () => camera) });
    await connectCallerSession("cam-fail");
    adapter.peerConnections[0].setLocalDescription.mockRejectedValueOnce(
      new Error("InvalidStateError")
    );

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(camera.getVideoTracks()[0].stop).toHaveBeenCalled();
    expect(getSession("cam-fail")?.cameraTrack).toBeNull();
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("should postpone its own offer while answering the peer and send it afterwards", async () => {
    useAdapter({ getUserMedia: audioOnlyGetUserMedia() });
    await connectCallerSession("answering-1");
    let releaseRemote: () => void = () => undefined;
    adapter.peerConnections[0].setRemoteDescription.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseRemote = resolve;
      });
      adapter.peerConnections[0].signalingState = "have-remote-offer";
    });
    sent.length = 0;

    receive({ type: "webrtc_offer", callId: "answering-1", sdp: { type: "offer", sdp: "o" } });
    callModel.toggleScreenShare();
    await settleMicrotasks();
    releaseRemote();
    await settleMicrotasks();

    const types = sent.map((m) => m.type);
    expect(types).toContain("webrtc_answer");
    expect(types.lastIndexOf("webrtc_offer")).toBeGreaterThan(types.indexOf("webrtc_answer"));
  });
});
