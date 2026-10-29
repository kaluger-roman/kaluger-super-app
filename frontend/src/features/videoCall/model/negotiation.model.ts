import { createEffect, sample } from "effector";

import { notificationsModel } from "@shared";

import { CONNECTION_FAILED_TEXT, RENEGOTIATION_FAILED_TEXT } from "./call.constants";
import { hasCallId, isCallAddress } from "./call.helpers";
import * as callModel from "./call.model";
import type { AddressedSignal, LocalMediaParams, LocalMediaReady, OfferParams } from "./call.types";
import * as callTransportModel from "./callTransport.model";
import * as currentCallModel from "./currentCall.model";
import * as peerConnectionModel from "./peerConnection.model";
import { toMediaStateMessage } from "./transport.helpers";
import { getSession } from "./webrtc.helpers";

const offerReceivedFx = createEffect<OfferParams, void>(
  async ({ callId, role, sdp, iceServers }) => {
    await peerConnectionModel.addLocalMediaFx({ callId, role, iceServers, polite: true });
    await peerConnectionModel.sendAnswerFx({ callId, sdp });
  }
);

// A renegotiation that failed mid-call leaves the connection in a half-applied offer;
// rolling back keeps the call going and lets the next toggle renegotiate cleanly.
const recoverNegotiationFx = createEffect(async (callId: string): Promise<void> => {
  const session = getSession(callId);
  if (!session || session.pc.signalingState === "stable") return;
  await session.pc.setLocalDescription({ type: "rollback" });
});

const acceptedCall = sample({
  clock: callModel.callAcceptedReceived,
  source: callModel.$callRole,
  fn: (role, target): LocalMediaParams | null => (role ? { ...target, role, polite: false } : null),
});
sample({
  clock: acceptedCall,
  filter: (call): call is LocalMediaParams => call !== null,
  target: peerConnectionModel.sendFirstOfferFx,
});
const offerToAnswer = sample({
  clock: callModel.offerReceived,
  source: { iceServers: callModel.$iceServers, role: callModel.$callRole },
  fn: ({ iceServers, role }, offer): OfferParams | null =>
    role ? { ...offer, iceServers, role } : null,
});
sample({
  clock: offerToAnswer,
  filter: (offer): offer is OfferParams => offer !== null,
  target: offerReceivedFx,
});
sample({ clock: callModel.answerReceived, target: peerConnectionModel.applyAnswerFx });
sample({ clock: callModel.iceReceived, target: peerConnectionModel.applyIceFx });

const peerNegotiationFailed = [
  peerConnectionModel.sendAnswerFx.fail.map(({ params }) => params.callId),
  peerConnectionModel.applyAnswerFx.fail.map(({ params }) => params.callId),
];

// Before media connects any failed negotiation means the call cannot start.
sample({
  clock: [
    peerConnectionModel.sendOfferFx.fail.map(({ params }) => params),
    ...peerNegotiationFailed,
  ],
  source: { phase: callModel.$callPhase, callId: callModel.$callId },
  filter: ({ phase, callId }, failedCallId) => phase === "connecting" && callId === failedCallId,
  fn: () => CONNECTION_FAILED_TEXT,
  target: callModel.callFailed,
});
// Mid-call it only loses the peer's latest media change, so the call stays up. A failed offer
// of our own is reported by the toggle that made it.
const midCallNegotiationFailed = sample({
  clock: peerNegotiationFailed,
  source: { phase: callModel.$callPhase, callId: callModel.$callId },
  filter: ({ phase, callId }, failedCallId) => phase === "active" && callId === failedCallId,
});
const midCallFailedCallId = sample({
  clock: midCallNegotiationFailed,
  fn: ({ callId }) => callId,
});
sample({
  clock: midCallFailedCallId,
  filter: hasCallId,
  target: recoverNegotiationFx,
});
sample({
  clock: midCallNegotiationFailed,
  fn: () => RENEGOTIATION_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});
sample({
  clock: recoverNegotiationFx.fail,
  fn: () => CONNECTION_FAILED_TEXT,
  target: callModel.callFailed,
});

const localMediaResult = sample({
  clock: currentCallModel.forCurrentCall(
    peerConnectionModel.addLocalMediaFx.done,
    ({ params }) => params.callId
  ),
  fn: ({ result }) => result,
});
const localMediaReady = sample({
  clock: localMediaResult,
  filter: (result): result is LocalMediaReady => result !== null,
});
sample({
  clock: localMediaReady,
  fn: ({ media }) => media,
  target: callModel.selfMediaStateChanged,
});
sample({
  clock: localMediaReady,
  fn: ({ localStream, remoteStream }) => ({ localStream, remoteStream }),
  target: callModel.localMediaAttached,
});
sample({
  clock: currentCallModel.forCurrentCall(
    peerConnectionModel.addLocalMediaFx.fail,
    ({ params }) => params.callId
  ),
  fn: () => undefined,
  target: callModel.mediaAcquisitionFailed,
});

// Every change of the own media state reaches the peer from this one place.
sample({
  clock: callModel.selfMediaStateChanged,
  source: callModel.$callAddress,
  filter: isCallAddress,
  fn: ({ callId, role }, media): AddressedSignal => ({
    role,
    message: toMediaStateMessage(callId, media),
  }),
  target: callTransportModel.sendCallSignalFx,
});
