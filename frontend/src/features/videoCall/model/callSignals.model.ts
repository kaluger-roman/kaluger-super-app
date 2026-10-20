import { createEffect, sample } from "effector";

import { NO_TRANSPORT_TEXT } from "./call.constants";
import { isCallAddress, toCallerRole } from "./call.helpers";
import * as callModel from "./call.model";
import type { CallAddress, HangupParams, InviteParams } from "./call.types";
import { sendOverTransport } from "./transport.helpers";
import { isScreenShareSupported, stopSession } from "./webrtc.helpers";

const sendInviteFx = createEffect(({ call, role }: InviteParams): string => {
  const inviteId = crypto.randomUUID();
  const sent = sendOverTransport(
    role,
    "studentId" in call
      ? { type: "call_invite", inviteId, targetStudentId: call.studentId }
      : { type: "call_invite", inviteId }
  );
  if (!sent) throw new Error(NO_TRANSPORT_TEXT);
  return inviteId;
});

const teardownFx = createEffect((callId: string | null): void => {
  if (callId) stopSession(callId);
});

const checkScreenShareSupportFx = createEffect((): boolean => isScreenShareSupported());

const sendAcceptFx = createEffect(({ callId, role }: CallAddress): void => {
  sendOverTransport(role, { type: "call_accept", callId });
});
const sendRejectFx = createEffect(({ callId, role }: CallAddress): void => {
  sendOverTransport(role, { type: "call_reject", callId });
});
const sendCancelFx = createEffect(({ callId, role }: CallAddress): void => {
  sendOverTransport(role, { type: "call_cancel", callId });
});
const sendHangupFx = createEffect(({ callId, role, reason }: HangupParams): void => {
  sendOverTransport(
    role,
    reason ? { type: "call_hangup", callId, reason } : { type: "call_hangup", callId }
  );
});

sample({
  clock: callModel.callStarted,
  fn: (call): InviteParams => ({ call, role: toCallerRole(call) }),
  target: sendInviteFx,
});
sample({ clock: sendInviteFx.doneData, target: callModel.inviteSent });
sample({ clock: sendInviteFx.failData, fn: () => NO_TRANSPORT_TEXT, target: callModel.callFailed });

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
  target: sendAcceptFx,
});
sample({
  clock: callModel.rejectCall,
  source: callModel.$callAddress,
  filter: isCallAddress,
  target: sendRejectFx,
});
sample({
  clock: callModel.cancelCall,
  source: callModel.$callAddress,
  filter: isCallAddress,
  target: sendCancelFx,
});
sample({
  clock: [callModel.hangUp, callModel.callFailed],
  source: callModel.$callAddress,
  filter: isCallAddress,
  target: sendHangupFx,
});
sample({
  clock: callModel.mediaAcquisitionFailed,
  source: callModel.$callAddress,
  filter: isCallAddress,
  fn: (address): HangupParams => ({ ...address, reason: "media_unavailable" }),
  target: sendHangupFx,
});

sample({ clock: callModel.incomingWhileBusy, target: sendRejectFx });
sample({ clock: callModel.staleRingingReceived, target: sendCancelFx });
sample({ clock: callModel.staleAcceptReceived, target: sendHangupFx });

sample({
  clock: callModel.transportDisconnected,
  source: { phase: callModel.$callPhase, role: callModel.$callRole },
  filter: ({ phase, role }, lostRole) => phase !== "idle" && role === lostRole,
  target: callModel.callConnectionLost,
});

sample({ clock: callModel.callTerminated, source: callModel.$callId, target: teardownFx });
sample({ clock: teardownFx.done, target: callModel.callResourcesReleased });
