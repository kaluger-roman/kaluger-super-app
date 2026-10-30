import { isAndroid, isIos } from "@shared";

import type { PeerPresenceState, PresenceState } from "../videoCall.types";
import type { CallPhase } from "./call.types";
import { LOST_PEER_PRESENCE, TRACK_MUTE_EVENTS } from "./callPresence.constants";
import type {
  BackgroundMediaCapability,
  LocalTrackMutes,
  PresenceFlags,
  PresenceReport,
  SelfPresence,
  SelfPresenceSource,
} from "./callPresence.types";
import type { CallRole } from "./signaling.types";
import { sendToRoles, toPresenceMessage } from "./transport.helpers";

export const readInitialVisibility = (): boolean =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

const toPresenceState = (visible: boolean): PresenceState => (visible ? "on_screen" : "background");

// iOS and iPadOS stop the page's microphone and camera in the background; Android keeps the
// microphone; a desktop browser keeps both.
export const getBackgroundMediaCapability = (): BackgroundMediaCapability => {
  if (isIos()) return { audio: false, video: false };
  if (isAndroid()) return { audio: true, video: false };
  return { audio: true, video: true };
};

// The flags say what the peer really stops getting, not merely that the app is in the background.
export const toPresenceFlags = (
  visible: boolean,
  capability: BackgroundMediaCapability,
  { micMuted, cameraMuted }: LocalTrackMutes
): PresenceFlags => ({
  audioSuspended: micMuted || (!visible && !capability.audio),
  videoSuspended: cameraMuted || (!visible && !capability.video),
});

export const toSelfPresence = ({
  visible,
  capability,
  mutes,
}: SelfPresenceSource): SelfPresence => ({
  presence: toPresenceState(visible),
  ...toPresenceFlags(visible, capability, mutes),
});

export const isSameTrackMutes = (a: LocalTrackMutes, b: LocalTrackMutes): boolean =>
  a.micMuted === b.micMuted && a.cameraMuted === b.cameraMuted;

export const readLocalTrackMutes = (stream: MediaStream): LocalTrackMutes => ({
  micMuted: stream.getAudioTracks()[0]?.muted ?? false,
  cameraMuted: stream.getVideoTracks()[0]?.muted ?? false,
});

const watchedTracks = new WeakSet<MediaStreamTrack>();

// Tracks brought back after the system stopped them are new objects: they are watched again.
export const watchLocalTrackMutes = (stream: MediaStream, onChange: () => void): void => {
  stream.getTracks().forEach((track) => {
    if (watchedTracks.has(track)) return;
    watchedTracks.add(track);
    TRACK_MUTE_EVENTS.forEach((type) => track.addEventListener(type, onChange));
  });
};

// Media that stopped flowing mid-call means the peer is out of reach, whatever the server knows.
export const toShownPeerPresence = (
  peer: PeerPresenceState,
  mediaLost: boolean,
  phase: CallPhase
): PeerPresenceState => (mediaLost && phase === "active" ? LOST_PEER_PRESENCE : peer);

// Presence is best-effort: a role without a socket reports again once its socket is ready.
// Resolves with the roles the report went out on.
export const reportPresence = ({
  roles,
  presence,
  audioSuspended,
  videoSuspended,
}: PresenceReport): CallRole[] =>
  sendToRoles(roles, toPresenceMessage(presence, audioSuspended, videoSuspended));
