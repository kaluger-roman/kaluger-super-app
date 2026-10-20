import { describe, expect, it } from "vitest";

import { TILE_VARIANTS } from "../VideoTile.constants";
import {
  getCameraLabel,
  getTileContentKind,
  getVideoFit,
  getVideoLayout,
} from "../VideoTile.helpers";

const media = (overrides: Partial<Parameters<typeof getTileContentKind>[0]> = {}) => ({
  micOn: true,
  cameraOn: true,
  screenSharing: false,
  cameraAvailable: true,
  ...overrides,
});

describe("VideoTile helpers", () => {
  it("should prefer the screen over the camera in a tile", () => {
    expect(getTileContentKind(media({ screenSharing: true }))).toBe("screen");
    expect(getTileContentKind(media())).toBe("video");
    expect(getTileContentKind(media({ cameraOn: false }))).toBe("placeholder");
  });

  it("should fit a shared screen whole and let the camera fill the tile", () => {
    expect(getVideoFit("screen")).toBe("contain");
    expect(getVideoFit("video")).toBe("cover");
  });

  it("should frame only the peer's shared screen between the pills", () => {
    expect(getVideoLayout("screen", TILE_VARIANTS.remote, false)).toBe("framed");
    expect(getVideoLayout("video", TILE_VARIANTS.remote, false)).toBe("overlay");
    expect(getVideoLayout("screen", TILE_VARIANTS.self, false)).toBe("overlay");
    expect(getVideoLayout("screen", TILE_VARIANTS.selfCompact, false)).toBe("overlay");
  });

  it("should overlay the pills on the peer's shared screen on a short stage", () => {
    expect(getVideoLayout("screen", TILE_VARIANTS.remote, true)).toBe("overlay");
  });

  it("should say whether the camera is off or missing", () => {
    expect(getCameraLabel(media({ cameraOn: false }))).toBe("Камера выключена");
    expect(getCameraLabel(media({ cameraOn: false, cameraAvailable: false }))).toBe(
      "Камера недоступна"
    );
  });

  it("should keep the own PiP free of the main tile minimum height", () => {
    expect(TILE_VARIANTS.remote.minHeight).toBeGreaterThan(0);
    expect(TILE_VARIANTS.self.minHeight).toBe(0);
    expect(TILE_VARIANTS.selfCompact.minHeight).toBe(0);
  });
});
