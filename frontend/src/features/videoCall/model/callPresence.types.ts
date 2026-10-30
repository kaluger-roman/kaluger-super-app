import type { PresenceState } from "../videoCall.types";
import type { CallRole } from "./signaling.types";

// What keeps going while the app is in the background on this device (FR-033).
export type BackgroundMediaCapability = {
  audio: boolean;
  video: boolean;
};

export type PresenceFlags = {
  audioSuspended: boolean;
  videoSuspended: boolean;
};

export type SelfPresence = PresenceFlags & {
  presence: PresenceState;
};

// `muted`: the system stopped feeding the own track (not the user's mic or camera toggle).
export type LocalTrackMutes = {
  micMuted: boolean;
  cameraMuted: boolean;
};

export type SelfPresenceSource = {
  visible: boolean;
  capability: BackgroundMediaCapability;
  mutes: LocalTrackMutes;
};

export type PresenceReport = SelfPresence & {
  roles: readonly CallRole[];
};
