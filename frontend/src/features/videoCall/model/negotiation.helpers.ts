import type { CallMediaState } from "../videoCall.types";
import type { LocalMediaResult } from "./call.types";
import { AUDIO_ONLY_CONSTRAINTS, VIDEO_AUDIO_CONSTRAINTS } from "./negotiation.constants";
import { getUserMediaSafe } from "./webrtc.helpers";

export const acquireLocalMedia = async (): Promise<LocalMediaResult> => {
  try {
    const stream = await getUserMediaSafe(VIDEO_AUDIO_CONSTRAINTS);
    return { stream, cameraOn: true };
  } catch {
    const stream = await getUserMediaSafe(AUDIO_ONLY_CONSTRAINTS);
    return { stream, cameraOn: false };
  }
};

export const mediaStateOf = (stream: MediaStream, cameraOn: boolean): CallMediaState => ({
  micOn: stream.getAudioTracks().some((track) => track.enabled),
  cameraOn,
  screenSharing: false,
  cameraAvailable: cameraOn,
});

export const getCameraTrack = (stream: MediaStream): MediaStreamTrack | null =>
  stream.getVideoTracks()[0] ?? null;
