import type { AudioSessionType, PeerAudioSync, PeerAudioTarget } from "./peerAudio.types";
import { createMediaStreamSafe } from "./webrtc.helpers";

// Puts the peer's voice on the call's <audio> and starts it, in one synchronous step up to
// `play()`: a resume has to start inside the tap that asked for it. Resolves once the peer is
// heard, or at once when there is nothing to start.
export const playPeerAudio = async ({ element, stream }: PeerAudioTarget): Promise<void> => {
  if (!element) return;
  if (element.srcObject !== stream) element.srcObject = stream;
  if (!stream || !element.paused) return;
  await element.play();
};

// An AbortError only means a newer stream replaced this play, which plays on its own.
export const isPlaybackBlocked = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "NotAllowedError";

// The peer's voice alone: iOS pauses an element that also holds the peer's video in the background.
// A track that arrives later comes in a new stream: Chromium never starts an element whose stream
// got its track only after it was set as `srcObject` (readyState stays 0, `play()` never settles).
export const syncPeerAudioStream = ({ remote, current }: PeerAudioSync): MediaStream => {
  const known = current?.getAudioTracks() ?? [];
  const arrived = remote.getAudioTracks().filter((track) => !current?.getTrackById(track.id));
  if (current && arrived.length === 0) return current;
  const audio = createMediaStreamSafe();
  [...known, ...arrived].forEach((track) => audio.addTrack(track));
  return audio;
};

const readAudioSession = (): { type: string } | null => {
  if (typeof navigator === "undefined" || !("audioSession" in navigator)) return null;
  const session: unknown = navigator.audioSession;
  return typeof session === "object" && session !== null && "type" in session
    ? (session as { type: string })
    : null;
};

export const setAudioSessionType = (type: AudioSessionType): void => {
  const session = readAudioSession();
  if (!session) return;
  try {
    session.type = type;
  } catch {
    // An unsupported type throws in some versions; the call goes on with the default session.
  }
};
