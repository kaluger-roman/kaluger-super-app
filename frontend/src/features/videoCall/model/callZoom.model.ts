import { combine, createEvent, createStore, sample } from "effector";

import type { CallZoom } from "../videoCall.types";
import * as callModel from "./call.model";
import { ZOOM_MAX_SCALE, ZOOM_MIN_SCALE, ZOOM_RESET } from "./callFullscreen.constants";
import * as callFullscreenModel from "./callFullscreen.model";
import type { PanPayload, StageGeometry, ZoomAtPayload } from "./callFullscreen.types";
import {
  clampZoom,
  getNextZoomStep,
  getPrevZoomStep,
  getStageOrientation,
  panBy,
  zoomAt,
  zoomTo,
} from "./callZoom.helpers";
import * as peerViewModel from "./peerView.model";

// One store, not three: scale and offsets change together and the offsets are bound by the scale.
export const $zoom = createStore<CallZoom>(ZOOM_RESET);
export const $stageGeometry = createStore<StageGeometry | null>(null);
export const $stageOrientation = $stageGeometry.map(getStageOrientation);
// Only the shown screen: an interrupted peer's tile shows the placeholder instead.
export const $isZoomAvailable = combine(
  callFullscreenModel.$isFullscreen,
  peerViewModel.$shownPeerMedia,
  (isFullscreen, peerMedia) => isFullscreen && peerMedia.screenSharing
);
export const $isZoomed = $zoom.map(({ scale }) => scale > ZOOM_MIN_SCALE);
export const $canZoomIn = $zoom.map(({ scale }) => scale < ZOOM_MAX_SCALE);
export const $canZoomOut = $zoom.map(({ scale }) => scale > ZOOM_MIN_SCALE);
const $zoomInput = combine({ zoom: $zoom, geometry: $stageGeometry });

export const zoomInClicked = createEvent();
export const zoomOutClicked = createEvent();
export const zoomReset = createEvent();
export const zoomedAt = createEvent<ZoomAtPayload>();
export const panned = createEvent<PanPayload>();
export const stageGeometryChanged = createEvent<StageGeometry | null>();

sample({ clock: stageGeometryChanged, target: $stageGeometry });

sample({
  clock: zoomInClicked,
  source: $zoomInput,
  filter: $isZoomAvailable,
  fn: ({ zoom, geometry }) => zoomTo(zoom, getNextZoomStep(zoom.scale), 0, 0, geometry),
  target: $zoom,
});
sample({
  clock: zoomOutClicked,
  source: $zoomInput,
  filter: $isZoomAvailable,
  fn: ({ zoom, geometry }) => zoomTo(zoom, getPrevZoomStep(zoom.scale), 0, 0, geometry),
  target: $zoom,
});
sample({
  clock: zoomedAt,
  source: $zoomInput,
  filter: $isZoomAvailable,
  fn: ({ zoom, geometry }, { factor, focusX, focusY }) =>
    zoomAt(zoom, factor, focusX, focusY, geometry),
  target: $zoom,
});
sample({
  clock: panned,
  source: $zoomInput,
  filter: $isZoomAvailable,
  fn: ({ zoom, geometry }, { dx, dy }) => panBy(zoom, dx, dy, geometry),
  target: $zoom,
});

sample({
  clock: $stageGeometry.updates,
  source: $zoom,
  fn: (zoom, geometry) => clampZoom(zoom, geometry),
  target: $zoom,
});

const zoomUnavailable = sample({
  clock: $isZoomAvailable.updates,
  filter: (available) => !available,
});

// A turned phone shows the picture at another size: the old offsets would point elsewhere.
sample({
  clock: [zoomReset, zoomUnavailable, $stageOrientation.updates, callModel.callTerminated],
  fn: () => ZOOM_RESET,
  target: $zoom,
});
