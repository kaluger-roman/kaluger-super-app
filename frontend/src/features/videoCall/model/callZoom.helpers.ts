import type { CallZoom } from "../videoCall.types";
import {
  ZOOM_MAX_SCALE,
  ZOOM_MIN_SCALE,
  ZOOM_RESET,
  ZOOM_STEP,
  ZOOM_STEP_EPSILON,
} from "./callFullscreen.constants";
import type {
  ContentSize,
  OffsetLimit,
  StageGeometry,
  StageOrientation,
} from "./callFullscreen.types";

export const clampScale = (scale: number): number =>
  Math.min(ZOOM_MAX_SCALE, Math.max(ZOOM_MIN_SCALE, scale));

// The picture as `object-fit: contain` draws it; until the metadata arrives it is the box itself.
export const getContentSize = ({
  boxWidth,
  boxHeight,
  videoWidth,
  videoHeight,
}: StageGeometry): ContentSize => {
  if (videoWidth <= 0 || videoHeight <= 0) return { width: boxWidth, height: boxHeight };
  const fit = Math.min(boxWidth / videoWidth, boxHeight / videoHeight);
  return { width: videoWidth * fit, height: videoHeight * fit };
};

export const getMaxOffset = (scale: number, geometry: StageGeometry | null): OffsetLimit => {
  if (!geometry) return { x: 0, y: 0 };
  const content = getContentSize(geometry);
  return {
    x: Math.max(0, (scale * content.width - geometry.boxWidth) / 2),
    y: Math.max(0, (scale * content.height - geometry.boxHeight) / 2),
  };
};

const clampOffset = (offset: number, max: number): number =>
  max > 0 ? Math.min(max, Math.max(-max, offset)) : 0;

export const clampZoom = (zoom: CallZoom, geometry: StageGeometry | null): CallZoom => {
  const scale = clampScale(zoom.scale);
  // Wheel and pinch steps multiply: there and back again may leave 1.0000000000000002.
  if (scale - ZOOM_MIN_SCALE < ZOOM_STEP_EPSILON) return ZOOM_RESET;
  const max = getMaxOffset(scale, geometry);
  return {
    scale,
    offsetX: clampOffset(zoom.offsetX, max.x),
    offsetY: clampOffset(zoom.offsetY, max.y),
  };
};

// The point under the focus stays put: t₁ = p − (s₁ / s₀)·(p − t₀).
export const zoomTo = (
  zoom: CallZoom,
  scale: number,
  focusX: number,
  focusY: number,
  geometry: StageGeometry | null
): CallZoom => {
  const nextScale = clampScale(scale);
  const ratio = nextScale / zoom.scale;
  return clampZoom(
    {
      scale: nextScale,
      offsetX: focusX - ratio * (focusX - zoom.offsetX),
      offsetY: focusY - ratio * (focusY - zoom.offsetY),
    },
    geometry
  );
};

export const zoomAt = (
  zoom: CallZoom,
  factor: number,
  focusX: number,
  focusY: number,
  geometry: StageGeometry | null
): CallZoom => zoomTo(zoom, zoom.scale * factor, focusX, focusY, geometry);

export const panBy = (
  zoom: CallZoom,
  dx: number,
  dy: number,
  geometry: StageGeometry | null
): CallZoom =>
  zoom.scale > ZOOM_MIN_SCALE
    ? clampZoom({ ...zoom, offsetX: zoom.offsetX + dx, offsetY: zoom.offsetY + dy }, geometry)
    : zoom;

export const getNextZoomStep = (scale: number): number =>
  Math.min(
    ZOOM_MAX_SCALE,
    Math.floor(scale / ZOOM_STEP + ZOOM_STEP_EPSILON) * ZOOM_STEP + ZOOM_STEP
  );

export const getPrevZoomStep = (scale: number): number =>
  Math.max(
    ZOOM_MIN_SCALE,
    Math.ceil(scale / ZOOM_STEP - ZOOM_STEP_EPSILON) * ZOOM_STEP - ZOOM_STEP
  );

export const getStageOrientation = (geometry: StageGeometry | null): StageOrientation | null => {
  if (!geometry) return null;
  return geometry.boxHeight > geometry.boxWidth ? "portrait" : "landscape";
};
