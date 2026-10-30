import { createEffect, createEvent, createStore, sample } from "effector";

import { notificationsModel } from "@shared";

import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";
import * as currentCallModel from "./currentCall.model";
import * as mediaControlsModel from "./mediaControls.model";
import {
  getDeviceBusyText,
  getDeviceFailedText,
  isRecoveryRequest,
  queueRecoveryRequest,
  recoverTracks,
  toRecoveryRequest,
  toReplayedRequest,
  toToggledDevices,
  watchTrackEnded,
} from "./trackRecovery.helpers";
import type { TrackRecoveryRequest, TrackRecoveryResult } from "./trackRecovery.types";

const $queuedRecovery = createStore<TrackRecoveryRequest | null>(null);

// A microphone or camera track of the call was stopped by the system, not by the page.
const localTrackEnded = createEvent();
const recoveryRequested = createEvent<TrackRecoveryRequest>();

const watchTracksFx = createEffect((stream: MediaStream): void => {
  watchTrackEnded(stream, () => localTrackEnded());
});

const recoverTracksFx = createEffect(
  (request: TrackRecoveryRequest): Promise<TrackRecoveryResult> =>
    recoverTracks(request, () => localTrackEnded())
);

sample({
  clock: callModel.localMediaAttached,
  fn: ({ localStream }) => localStream,
  target: watchTracksFx,
});

// Tried again on every return to the page and on a mic or camera toggle, so a busy device comes
// back once the other app lets it go. Only a toggle replaces a muted track: iOS mutes the tracks
// in the background and unmutes them on the return.
const cameBack = sample({ clock: callPresenceModel.$isVisible.updates, filter: Boolean });
sample({
  clock: sample({
    clock: [cameBack, localTrackEnded],
    source: callModel.$callAddress,
    fn: (address) => toRecoveryRequest(address, []),
  }),
  filter: isRecoveryRequest,
  target: recoveryRequested,
});
sample({
  clock: sample({
    clock: mediaControlsModel.mediaToggled,
    source: callModel.$callAddress,
    fn: (address, patch) => toRecoveryRequest(address, toToggledDevices(patch)),
  }),
  filter: isRecoveryRequest,
  target: recoveryRequested,
});

sample({
  clock: recoveryRequested,
  source: recoverTracksFx.pending,
  filter: (pending) => !pending,
  fn: (_, request) => request,
  target: recoverTracksFx,
});
sample({
  clock: recoveryRequested,
  source: { pending: recoverTracksFx.pending, queued: $queuedRecovery },
  filter: ({ pending }) => pending,
  fn: ({ queued }, request) => queueRecoveryRequest(queued, request),
  target: $queuedRecovery,
});
// The replay skips the tracks the finished run just tried, so a busy device is not announced twice.
sample({
  clock: sample({
    clock: recoverTracksFx.done,
    source: $queuedRecovery,
    fn: toReplayedRequest,
  }),
  filter: isRecoveryRequest,
  target: recoverTracksFx,
});
sample({ clock: recoverTracksFx, fn: () => null, target: $queuedRecovery });

sample({
  clock: sample({
    clock: recoverTracksFx.done,
    source: callModel.$localStream,
    filter: (_, { result }) => result.recovered > 0,
  }),
  filter: (stream): stream is MediaStream => stream !== null,
  target: callPresenceModel.localTracksChanged,
});

const currentCallRecovery = currentCallModel.forCurrentCall(
  recoverTracksFx.done,
  ({ params }) => params.callId
);
sample({
  clock: currentCallRecovery,
  filter: ({ result }) => result.busy.length > 0,
  fn: ({ result }) => getDeviceBusyText(result.busy),
  target: notificationsModel.showErrorEvent,
});
// Only the device the user toggled reports a refusal: a return to the page stays silent.
sample({
  clock: currentCallRecovery,
  filter: ({ result }) => result.failed.length > 0,
  fn: ({ result }) => getDeviceFailedText(result.failed),
  target: notificationsModel.showErrorEvent,
});
