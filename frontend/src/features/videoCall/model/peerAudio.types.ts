// `navigator.audioSession` (Safari 16.4+): "play-and-record" keeps the call's sound going with the
// microphone, "auto" gives the device back to the system.
export type AudioSessionType = "play-and-record" | "auto";

export type PeerAudioSync = {
  remote: MediaStream;
  current: MediaStream | null;
};

export type PeerAudioTarget = {
  element: HTMLAudioElement | null;
  stream: MediaStream | null;
};
