export type TileContentKind = "screen" | "video" | "placeholder";

export type VideoFit = "contain" | "cover";

// "framed": the video sits between the pills; "overlay": the pills float over a full-tile video.
export type VideoLayout = "framed" | "overlay";

export type TileVariant = "remote" | "self" | "selfCompact";

export type TileVariantConfig = {
  avatarSize: number;
  selfAvatar: boolean;
  showCameraLabel: boolean;
  frameScreen: boolean;
  minHeight: number;
  inset: number;
  gap: number;
  badgeSize: number;
  badgeInNameRow: boolean;
};
