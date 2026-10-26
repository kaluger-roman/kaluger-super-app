import type { CallBackgroundMock } from "./callBackgroundMock.types";

// TODO(auto-feature): mockup data picked by the preview route's `?state=`; delete together with
// callBackgroundMock.* when callPresenceModel provides the real values.
export const CALL_BACKGROUND_MOCK_DEFAULT: CallBackgroundMock = {
  peerPresence: { presence: "onScreen", audioSuspended: false, videoSuspended: false },
  backgroundHintShown: false,
  remoteAudioBlocked: false,
};

export const CALL_BACKGROUND_MOCKS: Partial<Record<string, CallBackgroundMock>> = {
  "tutor-minimized": {
    ...CALL_BACKGROUND_MOCK_DEFAULT,
    peerPresence: { presence: "background", audioSuspended: false, videoSuspended: true },
  },
  "tutor-mic-suspended": {
    ...CALL_BACKGROUND_MOCK_DEFAULT,
    peerPresence: { presence: "background", audioSuspended: true, videoSuspended: true },
  },
  "tutor-reconnecting": {
    ...CALL_BACKGROUND_MOCK_DEFAULT,
    peerPresence: { presence: "disconnected", audioSuspended: false, videoSuspended: false },
  },
  "student-background": {
    ...CALL_BACKGROUND_MOCK_DEFAULT,
    peerPresence: { presence: "background", audioSuspended: true, videoSuspended: true },
  },
  "student-reconnecting": {
    ...CALL_BACKGROUND_MOCK_DEFAULT,
    peerPresence: { presence: "disconnected", audioSuspended: false, videoSuspended: false },
  },
  hint: { ...CALL_BACKGROUND_MOCK_DEFAULT, backgroundHintShown: true },
  "sound-blocked": { ...CALL_BACKGROUND_MOCK_DEFAULT, remoteAudioBlocked: true },
};
