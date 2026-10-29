import {
  PEER_AUDIO_UNAVAILABLE_TEXT,
  RECONNECTING_TEXT,
  STUDENT_MIC_SUSPENDED_TEXT,
  STUDENT_MINIMIZED_TEXT,
} from "../videoCall.constants";
import type { CallMediaState, PeerPresenceState, TileInterruption } from "../videoCall.types";
import type { CallRole } from "./signaling.types";

// `viewerRole` is the own role: only a tutor learns that the student left the app (FR-032).
// A peer whose video keeps going in the background is not interrupted at all (FR-033).
export const getPeerInterruption = (
  viewerRole: CallRole | null,
  { presence, videoSuspended }: PeerPresenceState
): TileInterruption | null => {
  if (presence === "disconnected") return { kind: "reconnecting", label: RECONNECTING_TEXT };
  if (presence !== "background" || !videoSuspended) return null;
  return viewerRole === "tutor"
    ? { kind: "minimized", label: STUDENT_MINIMIZED_TEXT }
    : { kind: "reconnecting", label: RECONNECTING_TEXT };
};

export const getPeerAudioNotice = (
  viewerRole: CallRole | null,
  { presence, audioSuspended }: PeerPresenceState
): string | null => {
  if (presence !== "background" || !audioSuspended) return null;
  return viewerRole === "tutor" ? STUDENT_MIC_SUSPENDED_TEXT : PEER_AUDIO_UNAVAILABLE_TEXT;
};

// A frozen last frame would pass for a live peer, so an interrupted peer is shown without video.
export const toShownPeerMedia = (
  media: CallMediaState,
  interruption: TileInterruption | null
): CallMediaState => (interruption ? { ...media, cameraOn: false, screenSharing: false } : media);
