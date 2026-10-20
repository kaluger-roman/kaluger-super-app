import { createEffect, sample } from "effector";

import { NO_TRANSPORT_TEXT, CONNECTION_FAILED_TEXT } from "./call.constants";
import { hasCallId } from "./call.helpers";
import * as callModel from "./call.model";
import type {
  CallSignalTarget,
  HangupParams,
  LostTransportCheck,
  OfferWithIceServers,
  StartCallParams,
} from "./call.types";
import * as peerConnectionModel from "./peerConnection.model";
import {
  forgetCallRole,
  isCallOnRole,
  selectInviteRole,
  sendOverTransport,
} from "./transport.helpers";
import { stopSession } from "./webrtc.helpers";

const sendInviteFx = createEffect((params: StartCallParams): void => {
  selectInviteRole("studentId" in params ? "tutor" : "student");
  const sent = sendOverTransport(
    "studentId" in params
      ? { type: "call_invite", targetStudentId: params.studentId }
      : { type: "call_invite" }
  );
  if (!sent) throw new Error(NO_TRANSPORT_TEXT);
});

const callAcceptedReceivedFx = createEffect<CallSignalTarget, void>(
  async ({ callId, iceServers }) => {
    await peerConnectionModel.addLocalMediaFx({ callId, iceServers, polite: false });
    await peerConnectionModel.sendOfferFx(callId);
  }
);

const offerReceivedFx = createEffect<OfferWithIceServers, void>(
  async ({ callId, sdp, iceServers }) => {
    await peerConnectionModel.addLocalMediaFx({ callId, iceServers, polite: true });
    await peerConnectionModel.sendAnswerFx({ callId, sdp });
  }
);

const teardownFx = createEffect((callId: string | null): void => {
  if (!callId) return;
  stopSession(callId);
  forgetCallRole(callId);
});

const isCallOnLostTransportFx = createEffect(({ callId, role }: LostTransportCheck): boolean =>
  isCallOnRole(callId, role)
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
const sendHangupFx = createEffect(({ callId, reason }: HangupParams): void => {
  sendOverTransport(
    reason ? { type: "call_hangup", callId, reason } : { type: "call_hangup", callId }
  );
});

sample({ clock: callModel.callStarted, target: sendInviteFx });
sample({ clock: sendInviteFx.failData, fn: () => NO_TRANSPORT_TEXT, target: callModel.callFailed });

sample({ clock: callModel.callAcceptedReceived, target: callAcceptedReceivedFx });
sample({
  clock: callModel.offerReceived,
  source: callModel.$iceServers,
  fn: (iceServers, offer) => ({ ...offer, iceServers }),
  target: offerReceivedFx,
});
sample({ clock: callModel.answerReceived, target: peerConnectionModel.applyAnswerFx });
sample({ clock: callModel.iceReceived, target: peerConnectionModel.applyIceFx });

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
  clock: [callModel.hangUp, callModel.callFailed],
  source: callModel.$callId,
  filter: hasCallId,
  fn: (callId): HangupParams => ({ callId }),
  target: sendHangupFx,
});
sample({
  clock: callModel.mediaAcquisitionFailed,
  source: callModel.$callId,
  filter: hasCallId,
  fn: (callId): HangupParams => ({ callId, reason: "media_unavailable" }),
  target: sendHangupFx,
});

sample({ clock: callModel.incomingWhileBusy, target: sendRejectFx });
sample({ clock: callModel.staleRingingReceived, target: sendCancelFx });
sample({
  clock: callModel.staleAcceptReceived,
  fn: (callId): HangupParams => ({ callId }),
  target: sendHangupFx,
});

const negotiationFailed = sample({
  clock: [
    peerConnectionModel.sendOfferFx.fail.map(({ params }) => params),
    peerConnectionModel.sendAnswerFx.fail.map(({ params }) => params.callId),
    peerConnectionModel.applyAnswerFx.fail.map(({ params }) => params.callId),
  ],
  source: { wasConnected: callModel.$wasConnected, callId: callModel.$callId },
  filter: ({ wasConnected, callId }, failedCallId) => !wasConnected && callId === failedCallId,
});

sample({
  clock: negotiationFailed,
  fn: () => CONNECTION_FAILED_TEXT,
  target: callModel.callFailed,
});

sample({
  clock: callModel.transportDisconnected,
  source: { callId: callModel.$callId, phase: callModel.$callPhase },
  filter: ({ phase }) => phase !== "idle",
  fn: ({ callId }, role) => ({ callId, role }),
  target: isCallOnLostTransportFx,
});
sample({
  clock: isCallOnLostTransportFx.doneData,
  filter: Boolean,
  target: callModel.callConnectionLost,
});

sample({ clock: callModel.callTerminated, source: callModel.$callId, target: teardownFx });
sample({ clock: teardownFx.done, target: callModel.callResourcesReleased });
sample({
  clock: peerConnectionModel.addLocalMediaFx.fail,
  source: callModel.$callId,
  filter: (callId, { params }) => callId === params.callId,
  fn: () => undefined,
  target: callModel.mediaAcquisitionFailed,
});
