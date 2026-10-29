import { combine } from "effector";

import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";
import { getPeerAudioNotice, getPeerInterruption, toShownPeerMedia } from "./peerView.helpers";

// What the call screen tells about the peer depends on the own role (FR-032).
export const $peerInterruption = combine(
  callModel.$callRole,
  callPresenceModel.$shownPeerPresence,
  getPeerInterruption
);
export const $isPeerInterrupted = combine(
  $peerInterruption,
  (interruption) => interruption !== null
);
export const $peerAudioNotice = combine(
  callModel.$callRole,
  callPresenceModel.$shownPeerPresence,
  getPeerAudioNotice
);
export const $shownPeerMedia = combine(
  callModel.$peerMediaState,
  $peerInterruption,
  toShownPeerMedia
);
