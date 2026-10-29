import { combine, createEffect, createEvent, createStore, sample } from "effector";

import type { PeerPresenceState } from "../videoCall.types";
import * as callModel from "./call.model";
import { CALL_ROLES, DEFAULT_PEER_PRESENCE, NO_TRACK_MUTES } from "./callPresence.constants";
import {
  getBackgroundMediaCapability,
  isSameTrackMutes,
  readInitialVisibility,
  readLocalTrackMutes,
  reportPresence,
  toSelfPresence,
  toShownPeerPresence,
  watchLocalTrackMutes,
} from "./callPresence.helpers";
import type { LocalTrackMutes, PresenceReport } from "./callPresence.types";
import type { CallRole } from "./signaling.types";

export const $isVisible = createStore(readInitialVisibility());
export const $backgroundCapability = createStore(getBackgroundMediaCapability());
export const $localTrackMutes = createStore<LocalTrackMutes>(NO_TRACK_MUTES);
export const $selfPresence = combine(
  { visible: $isVisible, capability: $backgroundCapability, mutes: $localTrackMutes },
  toSelfPresence
);
export const $peerPresence = createStore<PeerPresenceState>(DEFAULT_PEER_PRESENCE);
// The peer's media stopped flowing in an active call (set by mediaRecovery).
export const $mediaConnectionLost = createStore(false);
export const $shownPeerPresence = combine(
  $peerPresence,
  $mediaConnectionLost,
  callModel.$callPhase,
  toShownPeerPresence
);

export const visibilityChanged = createEvent<boolean>();
// The socket of the role is registered and carries call signals again.
export const transportReady = createEvent<CallRole>();
export const peerPresenceReceived = createEvent<PeerPresenceState>();
export const mediaConnectionChanged = createEvent<boolean>();
// The own microphone and camera tracks of the call, new ones after the system stopped the old.
export const localTracksChanged = createEvent<MediaStream>();
const localTrackMutesChanged = createEvent<LocalTrackMutes>();

export const reportPresenceFx = createEffect((report: PresenceReport) => reportPresence(report));

// Track events fire outside any scope, as the rest of the call flow does.
const watchLocalTracksFx = createEffect((stream: MediaStream): LocalTrackMutes => {
  watchLocalTrackMutes(stream, () => localTrackMutesChanged(readLocalTrackMutes(stream)));
  return readLocalTrackMutes(stream);
});

sample({ clock: visibilityChanged, target: $isVisible });

sample({
  clock: callModel.localMediaAttached,
  fn: ({ localStream }) => localStream,
  target: localTracksChanged,
});
sample({ clock: localTracksChanged, target: watchLocalTracksFx });
sample({ clock: watchLocalTracksFx.doneData, target: localTrackMutesChanged });
sample({
  clock: localTrackMutesChanged,
  source: $localTrackMutes,
  filter: (current, next) => !isSameTrackMutes(current, next),
  fn: (_, next) => next,
  target: $localTrackMutes,
});
sample({
  clock: callModel.callTerminated,
  fn: () => NO_TRACK_MUTES,
  target: localTrackMutesChanged,
});

sample({
  clock: [$isVisible.updates, $localTrackMutes.updates],
  source: $selfPresence,
  fn: (self): PresenceReport => ({ ...self, roles: CALL_ROLES }),
  target: reportPresenceFx,
});
sample({
  clock: transportReady,
  source: $selfPresence,
  fn: (self, role): PresenceReport => ({ ...self, roles: [role] }),
  target: reportPresenceFx,
});

sample({ clock: peerPresenceReceived, target: $peerPresence });
sample({
  clock: [callModel.callStarted, callModel.incomingCallReceived, callModel.callTerminated],
  fn: () => DEFAULT_PEER_PRESENCE,
  target: $peerPresence,
});

sample({ clock: mediaConnectionChanged, target: $mediaConnectionLost });
sample({ clock: callModel.callTerminated, fn: () => false, target: $mediaConnectionLost });
