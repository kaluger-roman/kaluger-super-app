import { createEffect, createEvent, createStore, sample } from "effector";
import { delay } from "patronum";

import * as callModel from "./call.model";
import * as callNotificationOpenModel from "./callNotificationOpen.model";
import { CALL_ROLES } from "./callPresence.constants";
import * as callPresenceModel from "./callPresence.model";
import * as callResumeModel from "./callResume.model";
import { CALL_STATE_REPLY_TIMEOUT_MS } from "./callSync.constants";
import {
  requestCallSync,
  toNotificationOutcome,
  toReadySync,
  toReplyCheck,
  withoutRole,
  withRoles,
} from "./callSync.helpers";
import type { NotificationOutcome, ReplyCheck } from "./callSync.types";
import type { CallRole } from "./signaling.types";

const $awaitingReply = createStore<CallRole[]>([]);
// Roles whose call_state has not come yet: until it does, this page does not know their call.
export const $syncPendingRoles = createStore<CallRole[]>([]);
// patronum `delay` cannot be cancelled: a delayed check counts only for the current generation.
const $replyGeneration = createStore(0);

// Asks the server what became of the call (call_sync → call_state) on the sockets of these roles.
export const syncRequested = createEvent<readonly CallRole[]>();

export const syncCallFx = createEffect(requestCallSync);

sample({ clock: syncRequested, target: syncCallFx });
sample({
  clock: syncCallFx.doneData,
  source: $syncPendingRoles,
  fn: withRoles,
  target: $syncPendingRoles,
});
sample({
  clock: callResumeModel.callStateReceived,
  source: $syncPendingRoles,
  fn: (pending, { role }) => withoutRole(pending, role),
  target: $syncPendingRoles,
});
// A dead socket never answers; the next one asks again.
sample({
  clock: callModel.transportDisconnected,
  source: $syncPendingRoles,
  fn: withoutRole,
  target: $syncPendingRoles,
});
sample({
  clock: callResumeModel.transportStale,
  source: $syncPendingRoles,
  fn: withoutRole,
  target: $syncPendingRoles,
});
sample({
  clock: callNotificationOpenModel.notificationAwaited,
  fn: () => CALL_ROLES,
  target: syncRequested,
});
// $syncPendingRoles may still hold the role of this very answer: the helper drops it itself.
const notificationSettled = sample({
  clock: sample({
    clock: callResumeModel.callStateReceived,
    source: {
      pending: callNotificationOpenModel.$pendingNotificationCallId,
      asked: $syncPendingRoles,
    },
    fn: toNotificationOutcome,
  }),
  filter: (outcome): outcome is NotificationOutcome => outcome !== null,
});
sample({
  clock: notificationSettled,
  fn: () => null,
  target: callNotificationOpenModel.$pendingNotificationCallId,
});
sample({
  clock: notificationSettled,
  filter: (outcome) => outcome === "stale",
  fn: () => undefined,
  target: callNotificationOpenModel.staleCallNotificationOpened,
});
sample({
  clock: callPresenceModel.$isVisible.updates,
  filter: (visible) => visible,
  fn: () => CALL_ROLES,
  target: syncRequested,
});
sample({
  clock: sample({
    clock: callPresenceModel.transportReady,
    source: { visible: callPresenceModel.$isVisible, role: callModel.$callRole },
    fn: toReadySync,
  }),
  filter: (roles): roles is CallRole[] => roles !== null,
  target: syncRequested,
});

// The answer also proves that the socket is alive.
const replyCheckStarted = sample({
  clock: sample({
    clock: syncCallFx.doneData,
    source: {
      role: callModel.$callRole,
      notification: callNotificationOpenModel.$pendingNotificationCallId,
      generation: $replyGeneration,
    },
    fn: toReplyCheck,
  }),
  filter: (check): check is ReplyCheck => check !== null,
});
sample({ clock: replyCheckStarted, fn: ({ generation }) => generation, target: $replyGeneration });
sample({ clock: replyCheckStarted, fn: ({ roles }) => roles, target: $awaitingReply });
sample({
  clock: callResumeModel.callStateReceived,
  source: $awaitingReply,
  fn: (awaiting, { role }) => withoutRole(awaiting, role),
  target: $awaitingReply,
});
const replyMissed = sample({
  clock: delay({ source: replyCheckStarted, timeout: CALL_STATE_REPLY_TIMEOUT_MS }),
  source: { awaiting: $awaitingReply, generation: $replyGeneration },
  filter: ({ generation }, check) => generation === check.generation,
  fn: ({ awaiting }) => awaiting,
});
CALL_ROLES.forEach((role) => {
  sample({
    clock: replyMissed,
    filter: (stale) => stale.includes(role),
    fn: () => role,
    target: callResumeModel.transportStale,
  });
});
sample({ clock: replyMissed, fn: (): CallRole[] => [], target: $awaitingReply });
// A check of the call's socket ends with the call; one for a tapped notification goes on.
sample({
  clock: callModel.callTerminated,
  source: callNotificationOpenModel.$pendingNotificationCallId,
  filter: (pending) => pending === null,
  fn: (): CallRole[] => [],
  target: $awaitingReply,
});
