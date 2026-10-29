import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callPresenceModel from "../callPresence.model";
import "../index";
import { setAudioSessionType } from "../peerAudio.helpers";
import * as peerAudioModel from "../peerAudio.model";
import * as peerSessionModel from "../peerSession.model";
import { resetWebRtcAdapter, setWebRtcAdapter } from "../webrtc.helpers";
import { createFakeAdapter, createFakeStream, createFakeTrack } from "./fakeWebrtc";
import type { FakeStream } from "./fakeWebrtc";

const asStream = (stream: FakeStream) => stream as unknown as MediaStream;

type FakeAudioElement = {
  srcObject: MediaStream | null;
  paused: boolean;
  play: ReturnType<typeof vi.fn>;
};

// A new `srcObject` reloads the element, which pauses it, as in a browser.
const createAudioElement = (): FakeAudioElement => {
  let source: MediaStream | null = null;
  const element: FakeAudioElement = {
    get srcObject() {
      return source;
    },
    set srcObject(stream: MediaStream | null) {
      if (stream !== source) element.paused = true;
      source = stream;
    },
    paused: true,
    play: vi.fn(async () => {
      element.paused = false;
    }),
  };
  return element;
};

type AudioScope = { blocked?: boolean; visible?: boolean; phase?: CallPhase };

// A mounted call screen <audio> that already has the peer's voice.
const withAudio = (
  element: FakeAudioElement,
  { blocked = false, visible = true, phase = "idle" }: AudioScope = {}
) => {
  const stream = asStream(createFakeStream(["audio"]));
  element.srcObject = stream;
  return fork({
    values: [
      [peerAudioModel.$peerAudioElement, element as unknown as HTMLAudioElement],
      [peerAudioModel.$peerAudioStream, stream],
      [peerAudioModel.$peerAudioBlocked, blocked],
      [callPresenceModel.$isVisible, visible],
      [callModel.$callPhase, phase],
    ],
  });
};

const blockPlay = (element: FakeAudioElement, name = "NotAllowedError") =>
  element.play.mockImplementationOnce(async () => {
    throw new DOMException("refused", name);
  });

const attachMedia = (scope: Scope, remote: FakeStream) =>
  allSettled(callModel.localMediaAttached, {
    scope,
    params: { localStream: asStream(createFakeStream()), remoteStream: asStream(remote) },
  });

beforeEach(() => {
  setWebRtcAdapter(createFakeAdapter());
});

afterEach(() => {
  resetWebRtcAdapter();
  Reflect.deleteProperty(navigator, "audioSession");
  vi.restoreAllMocks();
});

describe("features/videoCall/model/peerAudio.model — the peer's voice", () => {
  it("should play the peer's audio tracks alone, also those that arrive later", async () => {
    const scope = fork();
    const remote = createFakeStream(["video"]);

    await attachMedia(scope, remote);
    const audio = scope.getState(peerAudioModel.$peerAudioStream);
    expect(audio?.getTracks()).toEqual([]);

    const voice = createFakeTrack("audio");
    remote.addTrack(voice);
    await allSettled(peerSessionModel.remoteTrackAdded, {
      scope,
      params: voice as unknown as MediaStreamTrack,
    });

    const withVoice = scope.getState(peerAudioModel.$peerAudioStream);
    expect(withVoice).not.toBe(audio);
    expect(withVoice?.getTracks()).toEqual([voice]);
  });

  it("should put a voice that arrives after the element got its stream on it as a new stream (regression)", async () => {
    const element = createAudioElement();
    const scope = fork();
    const remote = createFakeStream(["video"]);
    await attachMedia(scope, remote);
    await allSettled(peerAudioModel.peerAudioElementChanged, {
      scope,
      params: element as unknown as HTMLAudioElement,
    });
    const empty = element.srcObject;

    const voice = createFakeTrack("audio");
    remote.addTrack(voice);
    await allSettled(peerSessionModel.remoteTrackAdded, {
      scope,
      params: voice as unknown as MediaStreamTrack,
    });

    expect(element.srcObject).not.toBe(empty);
    expect(element.srcObject?.getTracks()).toEqual([voice]);
    expect(element.paused).toBe(false);
  });

  it("should keep the stream when no new voice arrived", async () => {
    const scope = fork();
    const remote = createFakeStream(["audio"]);
    await attachMedia(scope, remote);
    const audio = scope.getState(peerAudioModel.$peerAudioStream);

    const video = createFakeTrack("video");
    remote.addTrack(video);
    await allSettled(peerSessionModel.remoteTrackAdded, {
      scope,
      params: video as unknown as MediaStreamTrack,
    });

    expect(scope.getState(peerAudioModel.$peerAudioStream)).toBe(audio);
  });

  it("should take a new stream when the peer's connection was rebuilt", async () => {
    const scope = fork();
    await attachMedia(scope, createFakeStream(["audio", "video"]));
    const before = scope.getState(peerAudioModel.$peerAudioStream);
    const rebuilt = createFakeStream(["audio"]);

    await allSettled(peerSessionModel.remoteStreamReplaced, { scope, params: asStream(rebuilt) });

    const after = scope.getState(peerAudioModel.$peerAudioStream);
    expect(after).not.toBe(before);
    expect(after?.getTracks()).toEqual(rebuilt.getAudioTracks());
  });

  it("should put the peer's voice on the mounted element and start it", async () => {
    const element = createAudioElement();
    const stream = asStream(createFakeStream(["audio"]));
    const scope = fork({ values: [[peerAudioModel.$peerAudioStream, stream]] });

    await allSettled(peerAudioModel.peerAudioElementChanged, {
      scope,
      params: element as unknown as HTMLAudioElement,
    });

    expect(element.srcObject).toBe(stream);
    expect(element.play).toHaveBeenCalledTimes(1);
  });

  it("should take the voice off the element when the call ends", async () => {
    const element = createAudioElement();
    const scope = fork();
    await attachMedia(scope, createFakeStream(["audio"]));
    await allSettled(peerAudioModel.peerAudioElementChanged, {
      scope,
      params: element as unknown as HTMLAudioElement,
    });
    expect(element.srcObject).not.toBeNull();

    await allSettled(callModel.callEndedLocally, { scope });

    expect(element.srcObject).toBeNull();
  });

  it("should ask for a tap when the browser refuses to start the sound", async () => {
    const element = createAudioElement();
    blockPlay(element);
    const scope = withAudio(element);

    await allSettled(peerAudioModel.continueCallClicked, { scope });

    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(true);
  });

  it("should not ask for a tap when a newer stream aborted the start", async () => {
    const element = createAudioElement();
    blockPlay(element, "AbortError");
    const scope = withAudio(element);

    await allSettled(peerAudioModel.continueCallClicked, { scope });

    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(false);
  });

  it("should start the sound inside the tap and stop asking", async () => {
    const element = createAudioElement();
    const scope = withAudio(element, { blocked: true });

    const clicked = allSettled(peerAudioModel.continueCallClicked, { scope });
    expect(element.play).toHaveBeenCalledTimes(1);
    await clicked;

    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(false);
  });

  it("should leave a playing sound alone", async () => {
    const element = createAudioElement();
    const scope = withAudio(element);
    element.paused = false;

    await allSettled(peerAudioModel.continueCallClicked, { scope });

    expect(element.play).not.toHaveBeenCalled();
  });

  it("should resume the voice the system paused (regression)", async () => {
    const element = createAudioElement();
    const scope = withAudio(element);

    await allSettled(peerAudioModel.peerAudioPaused, { scope });

    expect(element.play).toHaveBeenCalledTimes(1);
    expect(element.paused).toBe(false);
  });

  it("should not start anything once the element is gone", async () => {
    const element = createAudioElement();
    const scope = withAudio(element);
    await allSettled(peerAudioModel.peerAudioElementChanged, { scope, params: null });

    await allSettled(peerAudioModel.peerAudioPaused, { scope });

    expect(element.play).not.toHaveBeenCalled();
  });

  it("should try the sound again when the page comes back to a call", async () => {
    const element = createAudioElement();
    const idle = withAudio(element, { visible: false });
    await allSettled(callPresenceModel.visibilityChanged, { scope: idle, params: true });
    expect(element.play).not.toHaveBeenCalled();

    const inCall = withAudio(element, { visible: false, phase: "active" });
    await allSettled(callPresenceModel.visibilityChanged, { scope: inCall, params: true });

    expect(element.play).toHaveBeenCalledTimes(1);
  });

  it("should forget the stream and the blocked sound when the call ends", async () => {
    const scope = fork({ values: [[peerAudioModel.$peerAudioBlocked, true]] });
    await attachMedia(scope, createFakeStream(["audio"]));

    await allSettled(callModel.callEndedLocally, { scope });

    expect(scope.getState(peerAudioModel.$peerAudioBlocked)).toBe(false);
    expect(scope.getState(peerAudioModel.$peerAudioStream)).toBeNull();
  });
});

describe("features/videoCall/model/peerAudio.model — audio session", () => {
  it("should hold the device's audio for the call and give it back after", async () => {
    const session = { type: "auto" };
    Object.defineProperty(navigator, "audioSession", { configurable: true, value: session });
    const scope = fork();

    await attachMedia(scope, createFakeStream(["audio"]));
    expect(session.type).toBe("play-and-record");

    await allSettled(callModel.callEndedLocally, { scope });
    expect(session.type).toBe("auto");
  });

  it("should leave a browser without an audio session alone", () => {
    expect("audioSession" in navigator).toBe(false);

    expect(() => setAudioSessionType("play-and-record")).not.toThrow();
  });

  it("should swallow the browser's refusal of the session type", () => {
    const setType = vi.fn<(value: string) => void>(() => {
      throw new TypeError("unsupported");
    });
    const session = {
      get type() {
        return "auto";
      },
      set type(value: string) {
        setType(value);
      },
    };
    Object.defineProperty(navigator, "audioSession", { configurable: true, value: session });

    expect(() => setAudioSessionType("play-and-record")).not.toThrow();
    expect(setType).toHaveBeenCalledWith("play-and-record");
  });
});
