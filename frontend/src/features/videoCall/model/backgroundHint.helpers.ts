import {
  BACKGROUND_HINT_DISMISSED_KEY,
  BACKGROUND_HINT_DISMISSED_VALUE,
} from "./backgroundHint.constants";
import type { CallPhase } from "./call.types";
import type { BackgroundMediaCapability } from "./callPresence.types";

// Storage may be off (private mode, blocked site data): the hint is then shown in every call.
export const readHintDismissed = (): boolean => {
  try {
    return localStorage.getItem(BACKGROUND_HINT_DISMISSED_KEY) === BACKGROUND_HINT_DISMISSED_VALUE;
  } catch {
    return false;
  }
};

export const writeHintDismissed = (): void => {
  try {
    localStorage.setItem(BACKGROUND_HINT_DISMISSED_KEY, BACKGROUND_HINT_DISMISSED_VALUE);
  } catch {
    // Closed for this call only.
  }
};

// FR-012: only where the own microphone really stops while the app is in the background.
export const isBackgroundHintShown = (
  phase: CallPhase,
  capability: BackgroundMediaCapability,
  dismissed: boolean
): boolean => phase === "active" && !capability.audio && !dismissed;
