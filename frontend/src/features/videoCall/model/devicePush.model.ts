import { createEffect, createStore, sample } from "effector";

import { notificationsModel } from "@entities";

import * as callModel from "./call.model";
import * as callNotificationOpenModel from "./callNotificationOpen.model";
import {
  closeCallNotifications,
  isCallId,
  isCallNotificationsTarget,
  isRegistration,
  readPushEndpoint,
  readShownCallId,
  toAnsweredNotifications,
  toIncomingRegistration,
  toLateNotifications,
  toRejectedCallId,
} from "./devicePush.helpers";

// This device's push subscription, named in its answer so the server sends it no closing push
// (FR-016). Read while the call rings: the answer never waits for it.
export const $pushEndpoint = createStore<string | null>(null);
// The last call this page took or declined.
export const $answeredHereCallId = createStore<string | null>(null);

const readPushEndpointFx = createEffect(readPushEndpoint);
const closeCallNotificationsFx = createEffect(closeCallNotifications);

sample({
  clock: [callModel.incomingCallReceived, callModel.callRestored],
  source: notificationsModel.$serviceWorkerRegistration,
  filter: isRegistration,
  target: readPushEndpointFx,
});
// The app opened from the notification may register its service worker after the call came in.
sample({
  clock: sample({
    clock: notificationsModel.$serviceWorkerRegistration.updates,
    source: callModel.$callPhase,
    fn: toIncomingRegistration,
  }),
  filter: isRegistration,
  target: readPushEndpointFx,
});
sample({ clock: readPushEndpointFx.doneData, target: $pushEndpoint });

const acceptedHere = sample({
  clock: callModel.acceptCall,
  source: callModel.$callId,
  filter: isCallId,
});
const rejectedHere = sample({
  clock: sample({ clock: callModel.callTerminated, fn: toRejectedCallId }),
  filter: isCallId,
});
sample({ clock: [acceptedHere, rejectedHere], target: $answeredHereCallId });

// Without a closing push the notification of a call answered here is closed by the page itself,
// and so is an incoming one the service worker shows after the answer.
sample({
  clock: sample({
    clock: [acceptedHere, rejectedHere],
    source: notificationsModel.$serviceWorkerRegistration,
    fn: (registration, callId) => toAnsweredNotifications({ registration, callId }),
  }),
  filter: isCallNotificationsTarget,
  target: closeCallNotificationsFx,
});
sample({
  clock: sample({
    clock: callNotificationOpenModel.serviceWorkerMessageReceived,
    source: {
      registration: notificationsModel.$serviceWorkerRegistration,
      answeredHere: $answeredHereCallId,
    },
    fn: (source, data) => toLateNotifications(source, readShownCallId(data)),
  }),
  filter: isCallNotificationsTarget,
  target: closeCallNotificationsFx,
});
