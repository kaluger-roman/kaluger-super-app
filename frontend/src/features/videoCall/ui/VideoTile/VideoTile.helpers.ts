import type { TileContentKind, VideoFit } from "./VideoTile.types";

export const getTileContentKind = (cameraOn: boolean, screenSharing: boolean): TileContentKind => {
  if (screenSharing) return "screen";
  if (cameraOn) return "video";
  return "placeholder";
};

// A shared screen or window must stay whole whatever its aspect ratio; only the camera may be cropped.
export const getVideoFit = (kind: TileContentKind): VideoFit =>
  kind === "screen" ? "contain" : "cover";

// The own PiP is too small to give up space for the pills, so only a peer's shared screen is padded.
export const shouldPadVideo = (kind: TileContentKind, isSelf: boolean): boolean =>
  kind === "screen" && !isSelf;
