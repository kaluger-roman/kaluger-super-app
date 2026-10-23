export const VIDEO_AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: true,
};

export const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  video: false,
  audio: true,
};

export const CAMERA_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: false,
};
