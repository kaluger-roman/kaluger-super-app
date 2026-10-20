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

// Only a peer's shared screen gives up room to the pills; a camera and the own preview fill the tile.
export const getVideoLayout = (kind: TileContentKind, config: TileVariantConfig): VideoLayout =>
  kind === "screen" && config.frameScreen ? "framed" : "overlay";

export const getCameraLabel = (media: CallMediaState): string =>
  media.cameraAvailable ? CAMERA_OFF_LABEL : CAMERA_UNAVAILABLE_LABEL;
