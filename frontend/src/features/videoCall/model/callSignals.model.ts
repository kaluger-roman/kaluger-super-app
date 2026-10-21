import { createEffect, sample } from "effector";

import { NO_TRANSPORT_TEXT } from "./call.constants";
import { isAddressedSignal, isCallAddress, toCallerRole, toTerminalSignal } from "./call.helpers";
import * as callModel from "./call.model";
import type { AddressedSignal, InviteParams } from "./call.types";
import * as callTransportModel from "./callTransport.model";
import { sendOverTransport } from "./transport.helpers";
import { isScreenShareSupported, stopSession } from "./webrtc.helpers";

const sendInviteFx = createEffect(({ call, role }: InviteParams): string => {
  const inviteId = crypto.randomUUID();
  sendOverTransport(
    role,
    "studentId" in call
      ? { type: "call_invite", inviteId, targetStudentId: call.studentId }
      : { type: "call_invite", inviteId }
  );
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
  clock: [callModel.callStarted, callModel.incomingCallReceived],
  fn: () => undefined,
  target: checkScreenShareSupportFx,
});
sample({ clock: checkScreenShareSupportFx.doneData, target: callModel.screenShareSupportChecked });

sample({
  clock: callModel.acceptCall,
  source: callModel.$callAddress,
  filter: isCallAddress,
  fn: ({ callId, role }): AddressedSignal => ({ role, message: { type: "call_accept", callId } }),
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
sample({
  clock: callModel.staleAcceptReceived,
  fn: ({ callId, role }): AddressedSignal => ({ role, message: { type: "call_hangup", callId } }),
  target: callTransportModel.sendCallSignalFx,
});

sample({
  clock: callModel.transportDisconnected,
  source: { phase: callModel.$callPhase, role: callModel.$callRole },
  filter: ({ phase, role }, lostRole) => phase !== "idle" && role === lostRole,
  target: callModel.callConnectionLost,
});

sample({
  clock: callModel.callTerminated,
  fn: ({ address }) => address?.callId ?? null,
  target: teardownFx,
});
