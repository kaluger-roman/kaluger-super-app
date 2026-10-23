import { CAMERA_OFF_LABEL, CAMERA_UNAVAILABLE_LABEL } from "./VideoTile.constants";
import type { TileContentKind, TileVariantConfig, VideoFit, VideoLayout } from "./VideoTile.types";
import type { CallMediaState } from "../../videoCall.types";

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
