import { describe, expect, it } from "vitest";

import { ZOOM_RESET } from "../callFullscreen.constants";
import type { StageGeometry } from "../callFullscreen.types";
import {
  clampScale,
  clampZoom,
  getContentSize,
  getMaxOffset,
  getNextZoomStep,
  getPrevZoomStep,
  getStageOrientation,
  panBy,
  zoomAt,
  zoomTo,
} from "../callZoom.helpers";

const DESKTOP: StageGeometry = {
  boxWidth: 1440,
  boxHeight: 810,
  videoWidth: 1920,
  videoHeight: 1080,
};
const PHONE: StageGeometry = { boxWidth: 375, boxHeight: 812, videoWidth: 1920, videoHeight: 1080 };

const project = (offset: number, scale: number, point: number) => offset + scale * point;

describe("callZoom helpers", () => {
  it("should keep the scale between 1x and 4x", () => {
    expect(clampScale(0.5)).toBe(1);
    expect(clampScale(2.3)).toBe(2.3);
    expect(clampScale(9)).toBe(4);
  });

  it("should measure the picture as object-fit contain draws it", () => {
    const content = getContentSize(PHONE);
    expect(content.width).toBeCloseTo(375);
    expect(content.height).toBeCloseTo(210.94, 1);
  });

  it("should take the box as the picture until the video metadata arrives", () => {
    expect(getContentSize({ ...PHONE, videoWidth: 0, videoHeight: 0 })).toEqual({
      width: 375,
      height: 812,
    });
  });

  it("should allow no offset at 1x", () => {
    expect(getMaxOffset(1, DESKTOP)).toEqual({ x: 0, y: 0 });
  });

  it("should allow moving the scaled picture up to its edges", () => {
    expect(getMaxOffset(4, DESKTOP)).toEqual({ x: 2160, y: 1215 });
  });

  it("should keep the picture centred on an axis where it is still narrower than the box", () => {
    const max = getMaxOffset(2, PHONE);
    expect(max.x).toBeCloseTo(187.5);
    expect(max.y).toBe(0);
  });

  it("should allow no offset without a geometry", () => {
    expect(getMaxOffset(4, null)).toEqual({ x: 0, y: 0 });
  });

  it("should pull an offset past the edge back to it", () => {
    expect(clampZoom({ scale: 2, offsetX: 5000, offsetY: -5000 }, DESKTOP)).toEqual({
      scale: 2,
      offsetX: 720,
      offsetY: -405,
    });
  });

  it("should drop the offsets at 1x and without a geometry", () => {
    expect(clampZoom({ scale: 1, offsetX: 30, offsetY: 40 }, DESKTOP)).toEqual(ZOOM_RESET);
    expect(clampZoom({ scale: 2, offsetX: 30, offsetY: 40 }, null)).toEqual({
      scale: 2,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("should keep the point under the focus in place while zooming", () => {
    const start = { scale: 1.5, offsetX: 100, offsetY: -50 };
    const focus = { x: 300, y: 120 };
    const point = {
      x: (focus.x - start.offsetX) / start.scale,
      y: (focus.y - start.offsetY) / start.scale,
    };

    const next = zoomAt(start, 2, focus.x, focus.y, DESKTOP);

    expect(next.scale).toBe(3);
    expect(project(next.offsetX, next.scale, point.x)).toBeCloseTo(focus.x);
    expect(project(next.offsetY, next.scale, point.y)).toBeCloseTo(focus.y);
  });

  it("should not zoom past 1x or 4x", () => {
    expect(zoomAt({ scale: 3, offsetX: 0, offsetY: 0 }, 10, 0, 0, DESKTOP).scale).toBe(4);
    expect(zoomAt({ scale: 2, offsetX: 200, offsetY: 100 }, 0.1, 50, 50, DESKTOP)).toEqual(
      ZOOM_RESET
    );
  });

  it("should zoom to an exact scale around the centre", () => {
    expect(zoomTo({ scale: 1.7, offsetX: 0, offsetY: 0 }, 2, 0, 0, DESKTOP)).toEqual({
      scale: 2,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("should pan within the edges", () => {
    const zoom = { scale: 2, offsetX: 0, offsetY: 0 };
    expect(panBy(zoom, 100, -50, DESKTOP)).toEqual({ scale: 2, offsetX: 100, offsetY: -50 });
    expect(panBy(zoom, 5000, 5000, DESKTOP)).toEqual({ scale: 2, offsetX: 720, offsetY: 405 });
  });

  it("should not pan the picture at 1x", () => {
    expect(panBy(ZOOM_RESET, 100, 100, DESKTOP)).toBe(ZOOM_RESET);
  });

  it("should step the buttons by half a scale to the nearest next step", () => {
    expect(getNextZoomStep(1)).toBe(1.5);
    expect(getNextZoomStep(1.7)).toBe(2);
    expect(getNextZoomStep(2)).toBe(2.5);
    expect(getNextZoomStep(4)).toBe(4);
    expect(getPrevZoomStep(1.7)).toBe(1.5);
    expect(getPrevZoomStep(2)).toBe(1.5);
    expect(getPrevZoomStep(1)).toBe(1);
  });

  it("should treat a float error next to a step as the step itself", () => {
    expect(getNextZoomStep(1.4999999)).toBe(2);
    expect(getPrevZoomStep(1.4999999)).toBe(1);
    expect(getPrevZoomStep(1.5000001)).toBe(1);
  });

  it("should tell the stage orientation from the box", () => {
    expect(getStageOrientation(DESKTOP)).toBe("landscape");
    expect(getStageOrientation(PHONE)).toBe("portrait");
    expect(getStageOrientation(null)).toBeNull();
  });
});
