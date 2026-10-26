import type { FullscreenTogglePlacement } from "./FullscreenToggleButton.types";

export const ENTER_FULLSCREEN_LABEL = "Во весь экран";
export const EXIT_FULLSCREEN_LABEL = "Свернуть";

export const FULLSCREEN_TOGGLE_SIZES: Record<FullscreenTogglePlacement, number> = {
  tile: 32,
  overlay: 44,
};
