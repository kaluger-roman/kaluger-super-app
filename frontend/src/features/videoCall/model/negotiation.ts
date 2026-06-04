import { createEffect, sample } from "effector";

import {
  $callId,
  acceptCall,
  callEnded,
  callResourcesReleased,
  callRinging,
  callStarted,
  callTerminated,
  cancelCall,
  hangUp,
  mediaAcquisitionFailed,
  peerMediaStateChanged,
  rejectCall,
} from "./call.model";
import type { IceServerPayload, StartCallParams } from "./call.types";
import {
  addLocalMediaFx,
  applyAnswerFx,
  applyIceFx,
  iceServersByCall,
  sendAnswerFx,
  sendOfferFx,
} from "./peerConnection";
import { sendOverTransport } from "./transport";
import { stopSession } from "./webrtc";

const sendInviteFx = createEffect((params: StartCallParams): void => {
  if ("studentId" in params) {
    sendOverTransport({ type: "call_invite", targetStudentId: params.studentId });
  } else {
    sendOverTransport({ type: "call_invite" });
  }
});

export const callAcceptedReceived = createEffect<
  { callId: string; iceServers: IceServerPayload[] },
  void
>(async ({ callId, iceServers }) => {
  iceServersByCall.set(callId, iceServers);
  await addLocalMediaFx({ callId, iceServers });
  await sendOfferFx(callId);
});

export const offerReceived = createEffect<
  { callId: string; sdp: RTCSessionDescriptionInit },
  void
>(async ({ callId, sdp }) => {
  const iceServers = iceServersByCall.get(callId) ?? [];
  await addLocalMediaFx({ callId, iceServers });
  await sendAnswerFx({ callId, sdp });
});

export const answerReceived = applyAnswerFx;
export const iceReceived = applyIceFx;

export const acceptIceServersForCallee = (
  callId: string,
  iceServers: IceServerPayload[]
): void => {
  iceServersByCall.set(callId, iceServers);
};

const teardownFx = createEffect((callId: string | null): void => {
  if (callId) {
    stopSession(callId);
    iceServersByCall.delete(callId);
  }
});

const rememberRingingIceFx = createEffect(
  ({
    callId,
    iceServers,
  }: {
    callId: string;
    iceServers: IceServerPayload[];
  }): void => {
    iceServersByCall.set(callId, iceServers);
  }
);

const sendAcceptFx = createEffect((callId: string): void => {
  sendOverTransport({ type: "call_accept", callId });
});
const sendRejectFx = createEffect((callId: string): void => {
  sendOverTransport({ type: "call_reject", callId });
});
const sendCancelFx = createEffect((callId: string): void => {
  sendOverTransport({ type: "call_cancel", callId });
});
const sendHangupFx = createEffect((callId: string): void => {
  sendOverTransport({ type: "call_hangup", callId });
});

const hasCallId = (callId: string | null): callId is string => callId !== null;

sample({ clock: callStarted, target: sendInviteFx });
sample({ clock: callRinging, target: rememberRingingIceFx });

sample({ clock: acceptCall, source: $callId, filter: hasCallId, target: sendAcceptFx });
sample({ clock: rejectCall, source: $callId, filter: hasCallId, target: sendRejectFx });
sample({ clock: cancelCall, source: $callId, filter: hasCallId, target: sendCancelFx });
sample({ clock: hangUp, source: $callId, filter: hasCallId, target: sendHangupFx });

sample({ clock: callTerminated, source: $callId, target: teardownFx });
sample({ clock: teardownFx.done, target: callResourcesReleased });
sample({ clock: addLocalMediaFx.failData, target: mediaAcquisitionFailed });

export const teardownCall = teardownFx;
export { peerMediaStateChanged, rejectCall, cancelCall, hangUp, callEnded };
