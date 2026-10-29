import { createEffect, createEvent, sample } from "effector";

import { notificationsModel } from "@shared";

import { hasCallId } from "./call.helpers";
import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";
import * as currentCallModel from "./currentCall.model";
import {
  getDeviceBusyText,
  recoverEndedTracks,
  toRecoveredCallId,
  watchTrackEnded,
} from "./trackRecovery.helpers";
import type { TrackRecoveryResult } from "./trackRecovery.types";

// A microphone or camera track of the call was stopped by the system, not by the page.
const localTrackEnded = createEvent();

const watchTracksFx = createEffect((stream: MediaStream): void => {
  watchTrackEnded(stream, () => localTrackEnded());
});

const recoverTracksFx = createEffect((callId: string): Promise<TrackRecoveryResult> =>
  recoverEndedTracks(callId, () => localTrackEnded())
);

sample({
  clock: callModel.localMediaAttached,
  fn: ({ localStream }) => localStream,
  target: watchTracksFx,
});

// Tried again on every return to the page and on a mic or camera toggle, so a busy device comes
// back once the other app lets it go.
const cameBack = sample({ clock: callPresenceModel.$isVisible.updates, filter: Boolean });
sample({
  clock: sample({
    clock: [cameBack, localTrackEnded, callModel.toggleMic, callModel.toggleCamera],
    source: { address: callModel.$callAddress, pending: recoverTracksFx.pending },
    fn: toRecoveredCallId,
  }),
  filter: hasCallId,
  target: recoverTracksFx,
});

sample({
  clock: sample({
    clock: recoverTracksFx.done,
    source: callModel.$localStream,
    filter: (_, { result }) => result.recovered > 0,
  }),
  filter: (stream): stream is MediaStream => stream !== null,
  target: callPresenceModel.localTracksChanged,
});

sample({
  clock: currentCallModel.forCurrentCall(recoverTracksFx.done, ({ params }) => params),
  filter: ({ result }) => result.busy.length > 0,
  fn: ({ result }) => getDeviceBusyText(result.busy),
  target: notificationsModel.showErrorEvent,
});
