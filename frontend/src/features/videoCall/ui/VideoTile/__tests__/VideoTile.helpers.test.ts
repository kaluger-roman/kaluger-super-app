import { describe, expect, it, vi } from "vitest";

import {
  PINCH_WHEEL_MAX_DELTA_PX,
  PINCH_WHEEL_ZOOM_SENSITIVITY,
  TILE_VARIANTS,
  WHEEL_LINE_HEIGHT_PX,
  WHEEL_ZOOM_SENSITIVITY,
} from "../VideoTile.constants";
import {
  getCameraLabel,
  getPointerDistance,
  getPointerMidpoint,
  getStageGeometry,
  getTileBackground,
  getTileContentKind,
  getVideoFit,
  getVideoLayout,
  getVideoLayoutRect,
  getWheelZoomFactor,
  readGesture,
  toCenterOffset,
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

  it("should letterbox a fullscreen shared screen on black", () => {
    expect(getTileBackground({ hasVideo: true, isScreen: true, bare: true })).toBe("#000000");
    expect(getTileBackground({ hasVideo: true, isScreen: true, bare: false })).toMatch(
      /^linear-gradient/
    );
  });

  it("should give the camera and the placeholder their own backgrounds", () => {
    const camera = getTileBackground({ hasVideo: true, isScreen: false, bare: false });
    expect(camera).toMatch(/^linear-gradient/);
    expect(getTileBackground({ hasVideo: true, isScreen: false, bare: true })).toBe(camera);
    expect(getTileBackground({ hasVideo: false, isScreen: false, bare: false })).toBe("#10231a");
  });

  it("should measure a point from the centre of the box", () => {
    expect(
      toCenterOffset({ x: 200, y: 50 }, { left: 100, top: 0, width: 400, height: 200 })
    ).toEqual({ x: -100, y: -50 });
  });

  it("should measure the distance and the midpoint between two fingers", () => {
    expect(getPointerDistance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
    expect(getPointerMidpoint({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({ x: 20, y: 40 });
  });

  it("should zoom in on a wheel turned away from the user and out on the opposite", () => {
    const zoomIn = getWheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }, 800);
    expect(zoomIn).toBeCloseTo(Math.exp(100 * WHEEL_ZOOM_SENSITIVITY));
    expect(zoomIn).toBeGreaterThan(1);
    expect(getWheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false }, 800)).toBeLessThan(1);
  });

  it("should zoom faster on a trackpad pinch", () => {
    expect(getWheelZoomFactor({ deltaY: -10, deltaMode: 0, ctrlKey: true }, 800)).toBeCloseTo(
      Math.exp(10 * PINCH_WHEEL_ZOOM_SENSITIVITY)
    );
  });

  it("should cap a ctrl + wheel step, so a mouse wheel notch with ctrl held does not jump", () => {
    const pinch = (deltaY: number, deltaMode = 0) =>
      getWheelZoomFactor({ deltaY, deltaMode, ctrlKey: true }, 800);

    expect(pinch(-100)).toBeCloseTo(
      Math.exp(PINCH_WHEEL_MAX_DELTA_PX * PINCH_WHEEL_ZOOM_SENSITIVITY)
    );
    expect(pinch(-3, 1)).toBeCloseTo(pinch(-100));
    expect(pinch(100)).toBeCloseTo(1 / pinch(-100));
  });

  it("should zoom a ctrl + wheel no less for a larger delta (regression: no jump at the cap)", () => {
    const deltas = [-2, -5, -9.5, -10, -10.5, -20, -100];
    const factors = deltas.map((deltaY) =>
      getWheelZoomFactor({ deltaY, deltaMode: 0, ctrlKey: true }, 800)
    );

    factors.slice(1).forEach((factor, index) => {
      expect(factor).toBeGreaterThanOrEqual(factors[index]);
    });
  });

  it("should turn wheel lines and pages into pixels", () => {
    expect(getWheelZoomFactor({ deltaY: -1, deltaMode: 1, ctrlKey: false }, 800)).toBeCloseTo(
      Math.exp(WHEEL_LINE_HEIGHT_PX * WHEEL_ZOOM_SENSITIVITY)
    );
    expect(getWheelZoomFactor({ deltaY: -1, deltaMode: 2, ctrlKey: false }, 800)).toBeCloseTo(
      Math.exp(800 * WHEEL_ZOOM_SENSITIVITY)
    );
  });

  it("should read the layout size of the video and its picture", () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      clientWidth: { value: 1440 },
      clientHeight: { value: 810 },
      videoWidth: { value: 1920 },
      videoHeight: { value: 1080 },
    });

    expect(getStageGeometry(video)).toEqual({
      boxWidth: 1440,
      boxHeight: 810,
      videoWidth: 1920,
      videoHeight: 1080,
    });
  });

  it("should read a WebKit gesture event and nothing else", () => {
    const gesture = (init: Record<string, unknown>) =>
      Object.assign(new Event("gesturechange"), init);

    expect(readGesture(gesture({ scale: 1.5, clientX: 10, clientY: 20 }))).toEqual({
      scale: 1.5,
      point: { x: 10, y: 20 },
    });
    expect(readGesture(gesture({ clientX: 10, clientY: 20 }))).toBeNull();
    expect(readGesture(gesture({ scale: "1.5", clientX: 10, clientY: 20 }))).toBeNull();
    expect(readGesture(gesture({ scale: 1.5 }))).toBeNull();
  });

  it("should measure the video's layout box from its offset parent, not its drawn box", () => {
    const frame = document.createElement("div");
    const video = document.createElement("video");
    frame.append(video);
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 50, width: 1000, height: 600 })
    );
    vi.spyOn(video, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: -400, y: -200, width: 2000, height: 1200 })
    );
    Object.defineProperties(frame, {
      clientLeft: { value: 2 },
      clientTop: { value: 3 },
    });
    Object.defineProperties(video, {
      offsetParent: { value: frame, configurable: true },
      offsetLeft: { value: 10 },
      offsetTop: { value: 20 },
      clientWidth: { value: 960 },
      clientHeight: { value: 540 },
    });

    expect(getVideoLayoutRect(video)).toEqual({ left: 112, top: 73, width: 960, height: 540 });

    Object.defineProperty(video, "offsetParent", { value: null });
    expect(getVideoLayoutRect(video)).toBeNull();
  });
});
