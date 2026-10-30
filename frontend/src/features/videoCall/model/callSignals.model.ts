import { createEffect, sample } from "effector";

import { NO_TRANSPORT_TEXT } from "./call.constants";
import {
  isAddressedSignal,
  isCallAddress,
  toAcceptSignal,
  toCallerRole,
  toInviteMessage,
  toTerminalSignal,
} from "./call.helpers";
import * as callModel from "./call.model";
import type { AddressedSignal, InviteParams } from "./call.types";
import * as callPresenceModel from "./callPresence.model";
import { toStaleAcceptSync } from "./callSync.helpers";
import * as callSyncModel from "./callSync.model";
import * as callTransportModel from "./callTransport.model";
import * as devicePushModel from "./devicePush.model";
import type { CallRole } from "./signaling.types";
import { sendOverTransport } from "./transport.helpers";
import { isScreenShareSupported, stopSession } from "./webrtc.helpers";

const sendInviteFx = createEffect(({ call, role }: InviteParams): string => {
  const inviteId = crypto.randomUUID();
  sendOverTransport(role, toInviteMessage(call, inviteId));
  return inviteId;
});

const teardownFx = createEffect((callId: string | null): void => {
  if (callId) stopSession(callId);
});

const checkScreenShareSupportFx = createEffect((): boolean => isScreenShareSupported());

sample({
  clock: callModel.callStarted,
  fn: (call): InviteParams => ({ call, role: toCallerRole(call) }),
  target: sendInviteFx,
});
sample({ clock: sendInviteFx.doneData, target: callModel.inviteSent });
sample({
  clock: sendInviteFx.failData,
  source: callModel.$callsUnavailableText,
  fn: (unavailableText) => unavailableText ?? NO_TRANSPORT_TEXT,
  target: callModel.callFailed,
});

sample({
  clock: [callModel.callStarted, callModel.incomingCallReceived, callModel.callRestored],
  fn: () => undefined,
  target: checkScreenShareSupportFx,
});
sample({ clock: checkScreenShareSupportFx.doneData, target: callModel.screenShareSupportChecked });

sample({
  clock: sample({
    clock: callModel.acceptCall,
    source: callModel.$callAddress,
    filter: isCallAddress,
  }),
  source: devicePushModel.$pushEndpoint,
  fn: toAcceptSignal,
  target: callTransportModel.sendCallSignalFx,
});

const terminalSignal = sample({ clock: callModel.callTerminated, fn: toTerminalSignal });
sample({
  clock: terminalSignal,
  filter: isAddressedSignal,
  target: callTransportModel.sendCallSignalFx,
});

sample({
  clock: callModel.incomingWhileBusy,
  fn: ({ callId, role }): AddressedSignal => ({ role, message: { type: "call_reject", callId } }),
  target: callTransportModel.sendCallSignalFx,
});
sample({
  clock: callModel.staleRingingReceived,
  fn: ({ callId, role }): AddressedSignal => ({ role, message: { type: "call_cancel", callId } }),
  target: callTransportModel.sendCallSignalFx,
});
// The page may be the caller's one that the server just let in (a reload): call_state restores
// the call there.
sample({
  clock: sample({
    clock: callModel.staleAcceptReceived,
    source: {
      visible: callPresenceModel.$isVisible,
      role: callModel.$callRole,
      pending: callSyncModel.$syncPendingRoles,
    },
    fn: (source, { role }) => toStaleAcceptSync(source, role),
  }),
  filter: (roles): roles is CallRole[] => roles !== null,
  target: callSyncModel.syncRequested,
});

sample({
  clock: callModel.callTerminated,
  fn: ({ address }) => address?.callId ?? null,
  target: teardownFx,
});
