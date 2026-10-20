import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import {
  callModel,
  dispatchCallSignal,
  getSession,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { connectCallerSession, settleMicrotasks, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakePeerConnection, createFakeStream } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

const audioOnlyGetUserMedia = () =>
  vi.fn(async (constraints: MediaStreamConstraints) => {
    if (constraints.video && constraints.audio) throw new Error("NotReadableError");
    if (constraints.video) return createFakeStream(["video"]);
    return createFakeStream(["audio"]);
  });

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("features/videoCall/model media robustness", () => {
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

  const trackingPeerConnections = () =>
    vi.fn(() => {
      const pc = createFakePeerConnection();
      pcs.push(pc);
      return pc;
    });

  it("should offer a receive-only video transceiver when the caller starts without a camera", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );

    await startCallerSession("audio-1");

    expect(pcs[0].addTransceiver).toHaveBeenCalledWith("video", { direction: "recvonly" });
  });

  it("should tell the peer the camera is unavailable right after an audio-only start", async () => {
    setWebRtcAdapter(createFakeAdapter({ getUserMedia: audioOnlyGetUserMedia() }));

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
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await connectCallerSession("audio-3");
    sent = [];

    callModel.toggleScreenShare();
    await settleMicrotasks();

    const [, videoTransceiver] = pcs[0].getTransceivers();
    expect(pcs[0].addTrack).toHaveBeenCalledTimes(1);
    expect(videoTransceiver.direction).toBe("sendrecv");
    expect(videoTransceiver.sender.replaceTrack).toHaveBeenCalled();
    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
    expect(readStore(callModel.$selfMediaState).screenSharing).toBe(true);
  });

  it("should stop the camera track when the call ends while camera permission is pending", async () => {
    const pendingCamera = deferred<MediaStream>();
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      if (constraints.video && constraints.audio) throw new Error("NotReadableError");
      if (constraints.video) return pendingCamera.promise;
      return createFakeStream(["audio"]);
    });
    setWebRtcAdapter(createFakeAdapter({ getUserMedia }));
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
    const pendingScreen = deferred<MediaStream>();
    setWebRtcAdapter(createFakeAdapter({ getDisplayMedia: vi.fn(() => pendingScreen.promise) }));
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

  it("should reuse the video transceiver when sharing again after an audio-only start", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await startCallerSession("audio-4");

    callModel.toggleScreenShare();
    await settleMicrotasks();
    callModel.toggleScreenShare();
    await settleMicrotasks();
    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(pcs[0].getTransceivers()).toHaveLength(2);
    expect(pcs[0].addTransceiver).toHaveBeenCalledTimes(1);
  });

  it("should keep sharing the screen when the camera is turned on during a share", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await startCallerSession("audio-5");
    callModel.toggleScreenShare();
    await settleMicrotasks();
    const [, videoTransceiver] = pcs[0].getTransceivers();
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
    const pendingCamera = deferred<MediaStream>();
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      if (constraints.video && constraints.audio) throw new Error("NotReadableError");
      if (constraints.video) return pendingCamera.promise;
      return createFakeStream(["audio"]);
    });
    setWebRtcAdapter(createFakeAdapter({ getUserMedia }));
    await startCallerSession("cam-double");

    callModel.toggleCamera();
    callModel.toggleCamera();
    pendingCamera.resolve(createFakeStream(["video"]));
    await settleMicrotasks();

    expect(getUserMedia.mock.calls.filter(([c]) => c.video && !c.audio)).toHaveLength(1);
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(true);
  });

  it("should keep a mic toggle made while the camera permission prompt was open", async () => {
    const pendingCamera = deferred<MediaStream>();
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      if (constraints.video && constraints.audio) throw new Error("NotReadableError");
      if (constraints.video) return pendingCamera.promise;
      return createFakeStream(["audio"]);
    });
    setWebRtcAdapter(createFakeAdapter({ getUserMedia }));
    await startCallerSession("cam-mic");

    callModel.toggleCamera();
    callModel.toggleMic();
    pendingCamera.resolve(createFakeStream(["video"]));
    await settleMicrotasks();

    expect(readStore(callModel.$selfMediaState)).toMatchObject({ micOn: false, cameraOn: true });
  });

  it("should show an error toast when the camera cannot be turned on", async () => {
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      if (constraints.video) throw new Error("NotAllowedError");
      return createFakeStream(["audio"]);
    });
    setWebRtcAdapter(createFakeAdapter({ getUserMedia }));
    await startCallerSession("cam-denied");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.toggleCamera();
    await settleMicrotasks();
    errors.unwatch();

    expect(errors.calls).toContain("Не удалось включить камеру. Проверьте разрешения браузера");
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("should add a remote track that arrives without a stream to the remote stream", async () => {
    setWebRtcAdapter(createFakeAdapter({ createPeerConnection: trackingPeerConnections() }));
    await startCallerSession("track-1");
    const remoteStream = getSession("track-1")?.remoteStream as MediaStream;
    const remoteTrack = { id: "remote-video", kind: "video" } as MediaStreamTrack;

    pcs[0].ontrack?.({ track: remoteTrack, streams: [] } as unknown as RTCTrackEvent);

    expect(remoteStream.addTrack).toHaveBeenCalledWith(remoteTrack);
  });

  it("should build offers with an implicit setLocalDescription", async () => {
    setWebRtcAdapter(createFakeAdapter({ createPeerConnection: trackingPeerConnections() }));

    await startCallerSession("offer-1");

    expect(pcs[0].setLocalDescription).toHaveBeenCalledWith();
    expect(pcs[0].createOffer).not.toHaveBeenCalled();
    expect(sent).toContainEqual({
      type: "webrtc_offer",
      callId: "offer-1",
      sdp: { type: "offer", sdp: "fake-offer" },
    });
  });

  it("should stop the capture and keep sharing off when renegotiation for the screen fails", async () => {
    const screen = createFakeStream(["video"]);
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
        getDisplayMedia: vi.fn(async () => screen),
      })
    );
    await connectCallerSession("screen-fail");
    (pcs[0].setLocalDescription as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
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
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await connectCallerSession("retry-1");
    (pcs[0].setLocalDescription as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("InvalidStateError")
    );
    callModel.toggleScreenShare();
    await settleMicrotasks();
    sent = [];

    callModel.toggleScreenShare();
    await settleMicrotasks();

    expect(sent.some((m) => m.type === "webrtc_offer")).toBe(true);
  });

  it("should release the camera when renegotiating for it fails", async () => {
    const camera = createFakeStream(["video"]);
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video && constraints.audio) throw new Error("NotReadableError");
          if (constraints.video) return camera;
          return createFakeStream(["audio"]);
        }),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await connectCallerSession("cam-fail");
    (pcs[0].setLocalDescription as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("InvalidStateError")
    );

    callModel.toggleCamera();
    await settleMicrotasks();

    expect(camera.getVideoTracks()[0].stop).toHaveBeenCalled();
    expect(getSession("cam-fail")?.cameraTrack).toBeNull();
    expect(readStore(callModel.$selfMediaState).cameraOn).toBe(false);
  });

  it("should postpone its own offer while answering the peer and send it afterwards", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: audioOnlyGetUserMedia(),
        createPeerConnection: trackingPeerConnections(),
      })
    );
    await connectCallerSession("answering-1");
    let releaseRemote: () => void = () => undefined;
    (pcs[0].setRemoteDescription as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseRemote = resolve;
      });
      (pcs[0] as unknown as { signalingState: string }).signalingState = "have-remote-offer";
    });
    sent = [];

    dispatchCallSignal({
      type: "webrtc_offer",
      callId: "answering-1",
      sdp: { type: "offer", sdp: "o" },
    });
    callModel.toggleScreenShare();
    await settleMicrotasks();
    releaseRemote();
    await settleMicrotasks();

    const types = sent.map((m) => m.type);
    expect(types).toContain("webrtc_answer");
    expect(types.lastIndexOf("webrtc_offer")).toBeGreaterThan(types.indexOf("webrtc_answer"));
  });
});
