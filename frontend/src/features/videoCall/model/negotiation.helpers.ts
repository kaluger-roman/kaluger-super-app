import type { CallMediaState } from "../videoCall.types";
import { getUserMediaSafe } from "./webrtc";

export const VIDEO_AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: true,
};

export const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  video: false,
  audio: true,
};

export type LocalMediaResult = {
  stream: MediaStream;
  cameraOn: boolean;
};

export const acquireLocalMedia = async (): Promise<LocalMediaResult> => {
  try {
    const stream = await getUserMediaSafe(VIDEO_AUDIO_CONSTRAINTS);
    return { stream, cameraOn: true };
  } catch {
    const stream = await getUserMediaSafe(AUDIO_ONLY_CONSTRAINTS);
    return { stream, cameraOn: false };
  }
};

export const mediaStateOf = (
  stream: MediaStream,
  cameraOn: boolean
): CallMediaState => ({
  micOn: stream.getAudioTracks().some((track) => track.enabled),
  cameraOn,
  screenSharing: false,
});

export const getCameraTrack = (stream: MediaStream): MediaStreamTrack | null =>
  stream.getVideoTracks()[0] ?? null;
