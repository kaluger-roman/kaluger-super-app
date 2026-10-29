import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getBackgroundMediaCapability,
  readLocalTrackMutes,
  toPresenceFlags,
  toSelfPresence,
  watchLocalTrackMutes,
} from "../callPresence.helpers";
import { createFakeStream, createFakeTrack, setTrackMutedBySystem } from "./fakeWebrtc";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const IOS = { audio: false, video: false };
const ANDROID = { audio: true, video: false };
const DESKTOP = { audio: true, video: true };
const LIVE = { micMuted: false, cameraMuted: false };

const asStream = (stream: unknown) => stream as MediaStream;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("features/videoCall/model/callPresence.helpers — background media capability", () => {
  it.each([
    ["iPhone", IPHONE_UA, "", 5, IOS],
    ["iPad that reports a Mac", DESKTOP_UA, "MacIntel", 5, IOS],
    ["Android", ANDROID_UA, "Linux armv8l", 5, ANDROID],
    ["desktop", DESKTOP_UA, "MacIntel", 0, DESKTOP],
  ])("should know what keeps going in the background on %s", (_, ua, platform, touch, expected) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
    vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
    vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(touch);

    expect(getBackgroundMediaCapability()).toEqual(expected);
  });
});

describe("features/videoCall/model/callPresence.helpers — presence flags", () => {
  it("should report nothing suspended on screen while the tracks run", () => {
    expect(toPresenceFlags(true, IOS, LIVE)).toEqual({
      audioSuspended: false,
      videoSuspended: false,
    });
  });

  it("should report what the platform stops in the background", () => {
    expect(toPresenceFlags(false, IOS, LIVE)).toEqual({
      audioSuspended: true,
      videoSuspended: true,
    });
    expect(toPresenceFlags(false, ANDROID, LIVE)).toEqual({
      audioSuspended: false,
      videoSuspended: true,
    });
    expect(toPresenceFlags(false, DESKTOP, LIVE)).toEqual({
      audioSuspended: false,
      videoSuspended: false,
    });
  });

  it("should report a track the system muted, on screen and in the background", () => {
    expect(toPresenceFlags(true, DESKTOP, { micMuted: true, cameraMuted: false })).toEqual({
      audioSuspended: true,
      videoSuspended: false,
    });
    expect(toPresenceFlags(false, ANDROID, { micMuted: true, cameraMuted: false })).toEqual({
      audioSuspended: true,
      videoSuspended: true,
    });
    expect(toPresenceFlags(true, DESKTOP, { micMuted: false, cameraMuted: true })).toEqual({
      audioSuspended: false,
      videoSuspended: true,
    });
  });

  it("should put the presence and the flags together", () => {
    expect(toSelfPresence({ visible: false, capability: ANDROID, mutes: LIVE })).toEqual({
      presence: "background",
      audioSuspended: false,
      videoSuspended: true,
    });
  });
});

describe("features/videoCall/model/callPresence.helpers — local tracks", () => {
  it("should read whether the microphone and the camera are muted", () => {
    const stream = createFakeStream();
    stream.getAudioTracks()[0].muted = true;

    expect(readLocalTrackMutes(asStream(stream))).toEqual({ micMuted: true, cameraMuted: false });
    expect(readLocalTrackMutes(asStream(createFakeStream([])))).toEqual(LIVE);
  });

  it("should report every mute and unmute once, also of a track added later", () => {
    const stream = createFakeStream(["audio"]);
    const onChange = vi.fn();

    watchLocalTrackMutes(asStream(stream), onChange);
    watchLocalTrackMutes(asStream(stream), onChange);
    setTrackMutedBySystem(stream.getAudioTracks()[0], true);
    expect(onChange).toHaveBeenCalledTimes(1);

    const camera = createFakeTrack("video");
    stream.addTrack(camera);
    watchLocalTrackMutes(asStream(stream), onChange);
    setTrackMutedBySystem(camera, true);
    setTrackMutedBySystem(stream.getAudioTracks()[0], false);

    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
