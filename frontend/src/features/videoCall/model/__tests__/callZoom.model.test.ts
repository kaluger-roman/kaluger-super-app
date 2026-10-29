import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { describe, expect, it } from "vitest";

import type { CallMediaState } from "../../videoCall.types";
import * as callModel from "../call.model";
import { ZOOM_RESET } from "../callFullscreen.constants";
import * as callFullscreenModel from "../callFullscreen.model";
import type { StageGeometry } from "../callFullscreen.types";
import * as callPresenceModel from "../callPresence.model";
import * as callZoomModel from "../callZoom.model";

const DESKTOP: StageGeometry = {
  boxWidth: 1440,
  boxHeight: 810,
  videoWidth: 1920,
  videoHeight: 1080,
};

const peerMedia = (screenSharing: boolean): CallMediaState => ({
  micOn: true,
  cameraOn: true,
  screenSharing,
  cameraAvailable: true,
});

// The geometry arrives as an event, as from the video: derived stores follow it like in the app.
const createScope = async ({ fullscreen = true, sharing = true } = {}) => {
  const scope = fork({
    values: [
      [callFullscreenModel.$isFullscreen, fullscreen],
      [callModel.$peerMediaState, peerMedia(sharing)],
    ],
  });
  await allSettled(callZoomModel.stageGeometryChanged, { scope, params: DESKTOP });
  return scope;
};

const zoomIn = (scope: Scope) => allSettled(callZoomModel.zoomInClicked, { scope });
const zoomOut = (scope: Scope) => allSettled(callZoomModel.zoomOutClicked, { scope });
const zoomOf = (scope: Scope) => scope.getState(callZoomModel.$zoom);

const zoomTwice = async (scope: Scope) => {
  await zoomIn(scope);
  await zoomIn(scope);
  await allSettled(callZoomModel.panned, { scope, params: { dx: 300, dy: 200 } });
};

describe("features/videoCall/model callZoom", () => {
  it("should step the scale up by half and stop at 4x", async () => {
    const scope = await createScope();

    await zoomIn(scope);
    await zoomIn(scope);
    await zoomIn(scope);
    expect(zoomOf(scope).scale).toBe(2.5);
    expect(scope.getState(callZoomModel.$isZoomed)).toBe(true);

    await zoomIn(scope);
    await zoomIn(scope);
    await zoomIn(scope);
    expect(zoomOf(scope).scale).toBe(4);
    expect(scope.getState(callZoomModel.$canZoomIn)).toBe(false);
    expect(scope.getState(callZoomModel.$canZoomOut)).toBe(true);
  });

  it("should step the scale down to 1x with the offsets dropped", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await zoomOut(scope);
    await zoomOut(scope);
    await zoomOut(scope);

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
    expect(scope.getState(callZoomModel.$canZoomOut)).toBe(false);
    expect(scope.getState(callZoomModel.$isZoomed)).toBe(false);
  });

  it("should return to the original size on reset", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callZoomModel.zoomReset, { scope });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should zoom around the gesture point within the edges", async () => {
    const scope = await createScope();

    await allSettled(callZoomModel.zoomedAt, {
      scope,
      params: { factor: 2, focusX: 200, focusY: 100 },
    });

    expect(zoomOf(scope)).toEqual({ scale: 2, offsetX: -200, offsetY: -100 });
  });

  it("should stop the pan at the picture edge", async () => {
    const scope = await createScope();
    await zoomIn(scope);
    await zoomIn(scope);

    await allSettled(callZoomModel.panned, { scope, params: { dx: 5000, dy: -5000 } });

    expect(zoomOf(scope)).toEqual({ scale: 2, offsetX: 720, offsetY: -405 });
  });

  it.each([
    ["outside the mode", { fullscreen: false, sharing: true }],
    ["without the peer's screen", { fullscreen: true, sharing: false }],
  ])("should ignore every zoom input %s", async (_, options) => {
    const scope = await createScope(options);

    await zoomIn(scope);
    await allSettled(callZoomModel.zoomedAt, {
      scope,
      params: { factor: 3, focusX: 0, focusY: 0 },
    });
    await allSettled(callZoomModel.panned, { scope, params: { dx: 50, dy: 50 } });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
    expect(scope.getState(callZoomModel.$isZoomAvailable)).toBe(false);
  });

  it("should reset on leaving the mode", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callFullscreenModel.fullscreenToggled, { scope });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should reset when the peer stops sharing the screen", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callModel.peerMediaStateChanged, { scope, params: peerMedia(false) });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should take the zoom away while the sharing peer is interrupted (regression)", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callPresenceModel.$peerPresence, {
      scope,
      params: { presence: "background", audioSuspended: true, videoSuspended: true },
    });

    expect(scope.getState(callZoomModel.$isZoomAvailable)).toBe(false);
    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
    await zoomIn(scope);
    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should reset when the call ends", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callModel.hangUp, { scope });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
  });

  it("should reset when the stage turns", async () => {
    const scope = await createScope();
    await zoomTwice(scope);

    await allSettled(callZoomModel.stageGeometryChanged, {
      scope,
      params: { boxWidth: 810, boxHeight: 1440, videoWidth: 1920, videoHeight: 1080 },
    });

    expect(zoomOf(scope)).toEqual(ZOOM_RESET);
    expect(scope.getState(callZoomModel.$stageOrientation)).toBe("portrait");
  });

  it("should keep the scale and pull the offsets into a narrower box", async () => {
    const scope = await createScope();
    await zoomTwice(scope);
    expect(zoomOf(scope)).toEqual({ scale: 2, offsetX: 300, offsetY: 200 });

    await allSettled(callZoomModel.stageGeometryChanged, {
      scope,
      params: { boxWidth: 1000, boxHeight: 810, videoWidth: 1920, videoHeight: 1080 },
    });

    const zoom = zoomOf(scope);
    expect(zoom.scale).toBe(2);
    expect(zoom.offsetX).toBe(300);
    expect(zoom.offsetY).toBeCloseTo((2 * 562.5 - 810) / 2);
  });

  it("should forget the geometry when the video stops being zoomable", async () => {
    const scope = await createScope();

    await allSettled(callZoomModel.stageGeometryChanged, { scope, params: null });

    expect(scope.getState(callZoomModel.$stageGeometry)).toBeNull();
  });

  it("should land exactly on 100% after zooming there and back by the wheel (regression)", async () => {
    const scope = await createScope();
    const wheel = (factor: number) =>
      allSettled(callZoomModel.zoomedAt, { scope, params: { factor, focusX: 0, focusY: 0 } });
    // Two wheel notches of deltaY 200 there and back leave 1.0000000000000002 unsnapped.
    await wheel(Math.exp(0.4));
    await wheel(Math.exp(0.4));
    await wheel(Math.exp(-0.4));
    await wheel(Math.exp(-0.4));

    expect(scope.getState(callZoomModel.$zoom)).toEqual(ZOOM_RESET);
    expect(scope.getState(callZoomModel.$isZoomed)).toBe(false);
  });
});
