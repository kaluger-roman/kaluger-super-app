type TileContentKind = "screen" | "video" | "placeholder";

export const getTileContentKind = (
  cameraOn: boolean,
  screenSharing: boolean,
): TileContentKind => {
  if (screenSharing) return "screen";
  if (cameraOn) return "video";
  return "placeholder";
};
