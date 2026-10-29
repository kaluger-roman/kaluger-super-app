import { attach, createEffect, createEvent, createStore, sample } from "effector";

import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";
import {
  isPlaybackBlocked,
  playPeerAudio,
  setAudioSessionType,
  syncPeerAudioStream,
} from "./peerAudio.helpers";
import type { AudioSessionType, PeerAudioSync } from "./peerAudio.types";
import * as peerSessionModel from "./peerSession.model";

export const $peerAudioStream = createStore<MediaStream | null>(null);
// The one <audio> of the call screen (PeerAudio), mounted or not.
export const $peerAudioElement = createStore<HTMLAudioElement | null>(null);
// The browser wants a tap before the peer can be heard (FR-009).
export const $peerAudioBlocked = createStore(false);

export const peerAudioBlocked = createEvent();
export const peerAudioPlaying = createEvent();
export const peerAudioElementChanged = createEvent<HTMLAudioElement | null>();
// The system paused the voice (media keys, unplugged headphones): a call never pauses on purpose.
export const peerAudioPaused = createEvent();
export const continueCallClicked = createEvent();

const syncPeerAudioFx = createEffect(syncPeerAudioStream);
// Runs synchronously inside the tap that triggered it, as the browser requires.
export const resumePeerAudioFx = attach({
  source: { element: $peerAudioElement, stream: $peerAudioStream },
  effect: playPeerAudio,
});
const setAudioSessionFx = createEffect(setAudioSessionType);

sample({
  clock: callModel.$remoteStream.updates,
  filter: Boolean,
  fn: (remote: MediaStream): PeerAudioSync => ({ remote, current: null }),
  target: syncPeerAudioFx,
});
sample({
  clock: peerSessionModel.remoteTrackAdded,
  source: { remote: callModel.$remoteStream, current: $peerAudioStream },
  filter: (sync): sync is PeerAudioSync => sync.remote !== null,
  target: syncPeerAudioFx,
});
sample({ clock: syncPeerAudioFx.doneData, target: $peerAudioStream });
sample({ clock: callModel.callTerminated, fn: () => null, target: $peerAudioStream });
sample({ clock: peerAudioElementChanged, target: $peerAudioElement });

const cameBack = sample({
  clock: callPresenceModel.$isVisible.updates,
  source: callModel.$callPhase,
  filter: (phase, visible) => visible && phase !== "idle",
});
const elementMounted = sample({ clock: $peerAudioElement.updates, filter: Boolean });
sample({
  clock: [
    elementMounted,
    $peerAudioStream.updates,
    syncPeerAudioFx.done,
    continueCallClicked,
    peerAudioPaused,
    cameBack,
  ],
  fn: () => undefined,
  target: resumePeerAudioFx,
});
sample({ clock: resumePeerAudioFx.done, fn: () => undefined, target: peerAudioPlaying });
sample({
  clock: resumePeerAudioFx.failData,
  filter: isPlaybackBlocked,
  fn: () => undefined,
  target: peerAudioBlocked,
});

sample({ clock: peerAudioBlocked, fn: () => true, target: $peerAudioBlocked });
sample({
  clock: [peerAudioPlaying, callModel.callTerminated],
  fn: () => false,
  target: $peerAudioBlocked,
});

sample({
  clock: callModel.localMediaAttached,
  fn: (): AudioSessionType => "play-and-record",
  target: setAudioSessionFx,
});
sample({
  clock: callModel.callTerminated,
  fn: (): AudioSessionType => "auto",
  target: setAudioSessionFx,
});
