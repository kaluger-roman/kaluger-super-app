import type { TileVariant, TileVariantConfig } from "./VideoTile.types";

export const TILE_VARIANTS: Record<TileVariant, TileVariantConfig> = {
  remote: {
    avatarSize: 96,
    selfAvatar: false,
    isPeer: true,
    showCameraLabel: true,
    frameScreen: true,
    minHeight: 180,
    inset: 12,
    gap: 8,
    badgeSize: 28,
    badgeInNameRow: false,
    pillPaddingX: 10,
    bare: false,
    fullscreenToggle: true,
  },
  fullscreen: {
    avatarSize: 128,
    selfAvatar: false,
    isPeer: true,
    showCameraLabel: true,
    frameScreen: false,
    minHeight: 0,
    inset: 0,
    gap: 0,
    badgeSize: 28,
    badgeInNameRow: false,
    pillPaddingX: 10,
    bare: true,
    fullscreenToggle: false,
  },
  self: {
    avatarSize: 48,
    selfAvatar: true,
    isPeer: false,
    showCameraLabel: true,
    frameScreen: false,
    minHeight: 0,
    inset: 10,
    gap: 6,
    badgeSize: 24,
    badgeInNameRow: true,
    pillPaddingX: 10,
    bare: false,
    fullscreenToggle: false,
  },
  selfCompact: {
    avatarSize: 28,
    selfAvatar: true,
    isPeer: false,
    showCameraLabel: false,
    frameScreen: false,
    minHeight: 0,
    inset: 6,
    gap: 4,
    badgeSize: 20,
    badgeInNameRow: true,
    // The compact PiP leaves the name about 34px next to the badge.
    pillPaddingX: 6,
    bare: false,
    fullscreenToggle: false,
  },
};

export const CAMERA_OFF_LABEL = "Камера выключена";
export const CAMERA_UNAVAILABLE_LABEL = "Камера недоступна";

// Wheel zoom: factor = exp(-deltaY · sensitivity). A trackpad pinch arrives as a ctrl + wheel with
// small deltas, so it gets a higher sensitivity. Its delta is capped: a mouse wheel notch with ctrl
// held is a large delta and must not jump the zoom.
export const WHEEL_ZOOM_SENSITIVITY = 0.002;
export const PINCH_WHEEL_ZOOM_SENSITIVITY = 0.01;
export const PINCH_WHEEL_MAX_DELTA_PX = 10;
export const WHEEL_LINE_HEIGHT_PX = 16;
export const WHEEL_DELTA_LINE = 1;
export const WHEEL_DELTA_PAGE = 2;

export const ZOOM_SCALE_VAR = "--call-zoom-scale";
export const ZOOM_X_VAR = "--call-zoom-x";
export const ZOOM_Y_VAR = "--call-zoom-y";

export const ENTER_PIP_ACTION = "enterpictureinpicture";
