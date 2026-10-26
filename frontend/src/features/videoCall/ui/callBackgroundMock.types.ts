import type { PeerPresenceState } from "../videoCall.types";

// TODO(auto-feature): mockup-only shape, delete together with callBackgroundMock.* once stores exist.
export type CallBackgroundMock = {
  peerPresence: PeerPresenceState;
  backgroundHintShown: boolean;
  remoteAudioBlocked: boolean;
};
