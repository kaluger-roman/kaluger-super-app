import type { TileVariant, TileVariantConfig } from "./VideoTile.types";

// On a short stage (landscape phone) the pills overlay the shared screen instead of framing it.
export const SHORT_STAGE_MEDIA = "@media (max-height: 500px)";

// Everything that differs between the peer's tile and the own PiP lives in this table.
export const TILE_VARIANTS: Record<TileVariant, TileVariantConfig> = {
  remote: {
    avatarSize: 96,
    selfAvatar: false,
    showCameraLabel: true,
    frameScreen: true,
    minHeight: 180,
    inset: 12,
    gap: 8,
    badgeSize: 28,
    badgeInNameRow: false,
  },
  self: {
    avatarSize: 48,
    selfAvatar: true,
    showCameraLabel: true,
    frameScreen: false,
    minHeight: 0,
    inset: 10,
    gap: 6,
    badgeSize: 24,
    badgeInNameRow: true,
  },
  selfCompact: {
    avatarSize: 28,
    selfAvatar: true,
    showCameraLabel: false,
    frameScreen: false,
    minHeight: 0,
    inset: 6,
    gap: 4,
    badgeSize: 20,
    badgeInNameRow: true,
  },
};

export const CAMERA_OFF_LABEL = "Камера выключена";
export const CAMERA_UNAVAILABLE_LABEL = "Камера недоступна";
