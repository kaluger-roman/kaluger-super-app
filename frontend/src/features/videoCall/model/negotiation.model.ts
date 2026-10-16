import { createEffect, sample } from "effector";

import { hasCallId } from "./call.helpers";
import * as callModel from "./call.model";
import type { CallSignalTarget, SdpPayload, StartCallParams } from "./call.types";
import { forgetIceServers, getIceServers, rememberIceServers } from "./peerConnection.helpers";
import * as peerConnectionModel from "./peerConnection.model";
import { sendOverTransport } from "./transport.helpers";
import { stopSession } from "./webrtc.helpers";

const sendInviteFx = createEffect((params: StartCallParams): void => {
  if ("studentId" in params) {
    sendOverTransport({ type: "call_invite", targetStudentId: params.studentId });
  } else {
    sendOverTransport({ type: "call_invite" });
  }
});

export const callAcceptedReceivedFx = createEffect<CallSignalTarget, void>(
  async ({ callId, iceServers }) => {
    rememberIceServers(callId, iceServers);
    await peerConnectionModel.addLocalMediaFx({ callId, iceServers, polite: false });
    await peerConnectionModel.sendOfferFx(callId);
  }
);

export const offerReceivedFx = createEffect<SdpPayload, void>(async ({ callId, sdp }) => {
  await peerConnectionModel.addLocalMediaFx({
    callId,
    iceServers: getIceServers(callId),
    polite: true,
  });
  await peerConnectionModel.sendAnswerFx({ callId, sdp });
});

export const answerReceivedFx = peerConnectionModel.applyAnswerFx;
export const iceReceivedFx = peerConnectionModel.applyIceFx;

const teardownFx = createEffect((callId: string | null): void => {
  if (callId) {
    stopSession(callId);
    forgetIceServers(callId);
  }
});

const rememberRingingIceFx = createEffect(({ callId, iceServers }: CallSignalTarget): void => {
  rememberIceServers(callId, iceServers);
});

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

sample({ clock: callModel.callStarted, target: sendInviteFx });
sample({ clock: callModel.callRinging, target: rememberRingingIceFx });

sample({
  clock: callModel.acceptCall,
  source: callModel.$callId,
  filter: hasCallId,
  target: sendAcceptFx,
});
sample({
  clock: callModel.rejectCall,
  source: callModel.$callId,
  filter: hasCallId,
  target: sendRejectFx,
});
sample({
  clock: callModel.cancelCall,
  source: callModel.$callId,
  filter: hasCallId,
  target: sendCancelFx,
});
sample({
  clock: callModel.hangUp,
  source: callModel.$callId,
  filter: hasCallId,
  target: sendHangupFx,
});

sample({ clock: callModel.callTerminated, source: callModel.$callId, target: teardownFx });
sample({ clock: teardownFx.done, target: callModel.callResourcesReleased });
sample({
  clock: peerConnectionModel.addLocalMediaFx.failData,
  target: callModel.mediaAcquisitionFailed,
});
