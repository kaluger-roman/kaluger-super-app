import {
  CAMERA_OFF_LABEL,
  CAMERA_UNAVAILABLE_LABEL,
  PINCH_WHEEL_MAX_DELTA_PX,
  PINCH_WHEEL_ZOOM_SENSITIVITY,
  WHEEL_DELTA_LINE,
  WHEEL_DELTA_PAGE,
  WHEEL_LINE_HEIGHT_PX,
  WHEEL_ZOOM_SENSITIVITY,
} from "./VideoTile.constants";
import type {
  GesturePoint,
  TileBackgroundParams,
  TileContentKind,
  TileVariantConfig,
  VideoFit,
  GestureInput,
  VideoLayout,
  ViewportRect,
  WheelZoomInput,
} from "./VideoTile.types";
import type { StageGeometry } from "../../model";
import type { CallMediaState } from "../../videoCall.types";

// A fullscreen shared screen is letterboxed on black, like any video player.
export const getTileBackground = ({ hasVideo, isScreen, bare }: TileBackgroundParams): string => {
  if (isScreen) return bare ? "#000000" : "linear-gradient(160deg, #102a17 0%, #0a1f10 100%)";
  if (hasVideo) return "linear-gradient(140deg, #1f5132 0%, #0c2a17 55%, #06160c 100%)";
  return "#10231a";
};

export const getTileContentKind = ({
  cameraOn,
  screenSharing,
}: CallMediaState): TileContentKind => {
  if (screenSharing) return "screen";
  if (cameraOn) return "video";
  return "placeholder";
};

// A shared screen or window must stay whole whatever its aspect ratio; only the camera may be cropped.
export const getVideoFit = (kind: TileContentKind): VideoFit =>
  kind === "screen" ? "contain" : "cover";

// Only a peer's shared screen gives up room to the pills, and only on a stage tall enough to
// spare it; a camera and the own preview fill the tile.
export const getVideoLayout = (
  kind: TileContentKind,
  config: TileVariantConfig,
  shortStage: boolean
): VideoLayout => (kind === "screen" && config.frameScreen && !shortStage ? "framed" : "overlay");

export const getCameraLabel = (media: CallMediaState): string =>
  media.cameraAvailable ? CAMERA_OFF_LABEL : CAMERA_UNAVAILABLE_LABEL;

// A call never pauses on purpose. iOS Safari pauses inline video on its own (the app goes to the
// background, a tap on the video) and then draws its native play/pause button over it.
// `onBlocked(true)`: the browser wants a user gesture first; an AbortError only means a newer
// stream replaced this play, which plays on its own.
export const resumePlayback = (
  element: HTMLVideoElement,
  onBlocked: (blocked: boolean) => void
): void => {
  if (!element.srcObject || !element.paused) return;
  element.play().then(
    () => onBlocked(false),
    (error: unknown) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") onBlocked(true);
    }
  );
};

export const toCenterOffset = (point: GesturePoint, rect: ViewportRect): GesturePoint => ({
  x: point.x - (rect.left + rect.width / 2),
  y: point.y - (rect.top + rect.height / 2),
});

export const getPointerDistance = (a: GesturePoint, b: GesturePoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const getPointerMidpoint = (a: GesturePoint, b: GesturePoint): GesturePoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const getWheelZoomFactor = (
  { deltaY, deltaMode, ctrlKey }: WheelZoomInput,
  pageHeight: number
): number => {
  let deltaPx = deltaY;
  if (deltaMode === WHEEL_DELTA_LINE) deltaPx = deltaY * WHEEL_LINE_HEIGHT_PX;
  if (deltaMode === WHEEL_DELTA_PAGE) deltaPx = deltaY * pageHeight;
  if (!ctrlKey) return Math.exp(-deltaPx * WHEEL_ZOOM_SENSITIVITY);
  const pinchPx = Math.sign(deltaPx) * Math.min(Math.abs(deltaPx), PINCH_WHEEL_MAX_DELTA_PX);
  return Math.exp(-pinchPx * PINCH_WHEEL_ZOOM_SENSITIVITY);
};

// Layout sizes, so the zoom transform on the video does not count.
export const getStageGeometry = (video: HTMLVideoElement): StageGeometry => ({
  boxWidth: video.clientWidth,
  boxHeight: video.clientHeight,
  videoWidth: video.videoWidth,
  videoHeight: video.videoHeight,
});

// getBoundingClientRect of the video includes its zoom transform; its offsets and client size
// are the untransformed layout box, measured from the offset parent (the tile, not transformed).
export const getVideoLayoutRect = (video: HTMLVideoElement): ViewportRect | null => {
  const frame = video.offsetParent;
  if (!frame) return null;
  const frameRect = frame.getBoundingClientRect();
  return {
    left: frameRect.left + frame.clientLeft + video.offsetLeft,
    top: frameRect.top + frame.clientTop + video.offsetTop,
    width: video.clientWidth,
    height: video.clientHeight,
  };
};

// WebKit's GestureEvent (a trackpad pinch in desktop Safari) is not in the DOM typings.
export const readGesture = (event: Event): GestureInput | null => {
  if (!("scale" in event) || !("clientX" in event) || !("clientY" in event)) return null;
  const { scale, clientX, clientY } = event;
  if (typeof scale !== "number" || typeof clientX !== "number" || typeof clientY !== "number") {
    return null;
  }
  return { scale, point: { x: clientX, y: clientY } };
};
