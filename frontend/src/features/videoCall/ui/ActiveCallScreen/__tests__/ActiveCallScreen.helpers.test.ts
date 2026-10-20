import { describe, expect, it } from "vitest";

import { isAudioOnly, toBanner, toLocalTileStream } from "../ActiveCallScreen.helpers";

const media = { micOn: true, cameraOn: false, screenSharing: false, cameraAvailable: true };

describe("ActiveCallScreen helpers", () => {
  it("should treat a missing camera as audio-only", () => {
    expect(isAudioOnly({ ...media, cameraAvailable: false })).toBe(true);
  });

  it("should not treat a camera switched off by the user as audio-only", () => {
    expect(isAudioOnly(media)).toBe(false);
  });

  it("should turn a status message into a banner", () => {
    expect(toBanner({ kind: "error", text: "Ошибка" })).toEqual({
      variant: "error",
      text: "Ошибка",
    });
    expect(toBanner(null)).toBeNull();
  });

  it("should show the screen capture in the own tile while sharing", () => {
    const camera = {} as MediaStream;
    const screen = {} as MediaStream;
    expect(toLocalTileStream({ localStream: camera, screenStream: screen })).toBe(screen);
    expect(toLocalTileStream({ localStream: camera, screenStream: null })).toBe(camera);
  });
});
