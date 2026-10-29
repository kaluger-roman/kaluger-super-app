import type { PeerPresenceState } from "../videoCall.types";
import type { LocalTrackMutes } from "./callPresence.types";
import type { CallRole } from "./signaling.types";

export const CALL_ROLES: readonly CallRole[] = ["tutor", "student"];

export const DEFAULT_PEER_PRESENCE: PeerPresenceState = {
  presence: "on_screen",
  audioSuspended: false,
  videoSuspended: false,
};

export const LOST_PEER_PRESENCE: PeerPresenceState = {
  presence: "disconnected",
  audioSuspended: false,
  videoSuspended: false,
};

export const NO_TRACK_MUTES: LocalTrackMutes = { micMuted: false, cameraMuted: false };

export const TRACK_MUTE_EVENTS = ["mute", "unmute"] as const;
