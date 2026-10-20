import { describe, expect, it } from "vitest";

import { getTileContentKind, getVideoFit } from "../VideoTile.helpers";

describe("VideoTile helpers", () => {
  it("should prefer the screen over the camera in a tile", () => {
    expect(getTileContentKind(true, true)).toBe("screen");
    expect(getTileContentKind(true, false)).toBe("video");
    expect(getTileContentKind(false, false)).toBe("placeholder");
  });

  it("should fit a shared screen whole and let the camera fill the tile", () => {
    expect(getVideoFit("screen")).toBe("contain");
    expect(getVideoFit("video")).toBe("cover");
  });
});
