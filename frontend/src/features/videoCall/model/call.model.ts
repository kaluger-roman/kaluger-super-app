import { combine, createEvent, createStore, sample } from "effector";
import { interval } from "patronum";

import type { CallMediaState } from "../videoCall.types";
import {
  CONNECTING_MESSAGE,
  DEFAULT_PEER_MEDIA_STATE,
  DEFAULT_SELF_MEDIA_STATE,
  MEDIA_DENIED_MESSAGE,
  toErrorMessage,
  toOutgoingPeer,
} from "./call.helpers";
import type {
  CallPeer,
  CallPhase,
  CallStatusMessage,
  IceServerPayload,
  IncomingCall,
  StartCallParams,
} from "./call.types";

export const callStarted = createEvent<StartCallParams>();
export const callRinging = createEvent<{ callId: string; iceServers: IceServerPayload[] }>();
export const incomingCallReceived = createEvent<IncomingCall>();
export const acceptCall = createEvent();
export const rejectCall = createEvent();
export const cancelCall = createEvent();
export const hangUp = createEvent();
export const callConnected = createEvent();
export const callEnded = createEvent();

export const toggleMic = createEvent();
export const toggleCamera = createEvent();
export const toggleScreenShare = createEvent();
export const selfMediaStateChanged = createEvent<CallMediaState>();
export const peerMediaStateChanged = createEvent<CallMediaState>();
export const remoteTrackReceived = createEvent();

export const unavailableReceived = createEvent();
export const busyReceived = createEvent();
export const noAnswerReceived = createEvent();
export const rejectedReceived = createEvent();
export const canceledReceived = createEvent();
export const callErrorReceived = createEvent<string>();
export const callFailed = createEvent<string>();
export const mediaAcquisitionFailed = createEvent();

export const $callPhase = createStore<CallPhase>("idle");
export const $callId = createStore<string | null>(null);
export const $incomingCall = createStore<IncomingCall | null>(null);
export const $outgoingCallPeer = createStore<CallPeer | null>(null);
export const $selfMediaState = createStore<CallMediaState>(DEFAULT_SELF_MEDIA_STATE);
export const $peerMediaState = createStore<CallMediaState>(DEFAULT_PEER_MEDIA_STATE);
export const $callDurationSeconds = createStore(0);
export const $callStatusMessage = createStore<CallStatusMessage>(null);
export const $mediaEpoch = createStore(0);

sample({
  clock: [selfMediaStateChanged, remoteTrackReceived],
  source: $mediaEpoch,
  fn: (epoch) => epoch + 1,
  target: $mediaEpoch,
});

export const $activePeerName = combine(
  $outgoingCallPeer,
  $incomingCall,
  (outgoing, incoming) => outgoing?.name ?? incoming?.callerName ?? "",
);

export const callTerminated = createEvent();
export const callResourcesReleased = createEvent();

sample({ clock: callStarted, fn: (): CallPhase => "outgoing", target: $callPhase });
sample({ clock: callStarted, fn: () => null, target: $callStatusMessage });
sample({ clock: callStarted, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callStarted, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({ clock: callStarted, fn: toOutgoingPeer, target: $outgoingCallPeer });

sample({ clock: callRinging, fn: ({ callId }) => callId, target: $callId });

sample({ clock: incomingCallReceived, fn: (): CallPhase => "incoming", target: $callPhase });
sample({ clock: incomingCallReceived, target: $incomingCall });
sample({ clock: incomingCallReceived, fn: ({ callId }) => callId, target: $callId });
sample({ clock: incomingCallReceived, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: incomingCallReceived, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });

sample({ clock: callConnected, fn: (): CallPhase => "active", target: $callPhase });
sample({ clock: callConnected, fn: () => null, target: $callStatusMessage });

sample({ clock: acceptCall, fn: (): CallPhase => "active", target: $callPhase });
sample({ clock: acceptCall, fn: () => CONNECTING_MESSAGE, target: $callStatusMessage });

sample({ clock: callFailed, target: callTerminated });

sample({ clock: selfMediaStateChanged, target: $selfMediaState });
sample({ clock: peerMediaStateChanged, target: $peerMediaState });

sample({ clock: unavailableReceived, target: callTerminated });

sample({ clock: busyReceived, target: callTerminated });

sample({ clock: noAnswerReceived, target: callTerminated });

sample({ clock: rejectedReceived, target: callTerminated });

sample({ clock: canceledReceived, target: callTerminated });

sample({ clock: callErrorReceived, target: callTerminated });
sample({ clock: callErrorReceived, fn: (text) => toErrorMessage(text), target: $callStatusMessage });

sample({ clock: mediaAcquisitionFailed, target: callTerminated });
sample({ clock: mediaAcquisitionFailed, fn: () => MEDIA_DENIED_MESSAGE, target: $callStatusMessage });

sample({ clock: [rejectCall, cancelCall, hangUp, callEnded], target: callTerminated });

sample({ clock: callTerminated, fn: (): CallPhase => "idle", target: $callPhase });
sample({ clock: callTerminated, fn: () => null, target: $incomingCall });
sample({ clock: callTerminated, fn: () => null, target: $outgoingCallPeer });
sample({ clock: callTerminated, fn: () => 0, target: $callDurationSeconds });
sample({ clock: callTerminated, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callTerminated, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({ clock: callResourcesReleased, fn: () => null, target: $callId });

const { tick } = interval({
  timeout: 1000,
  start: callConnected,
  stop: callTerminated,
});

sample({
  clock: tick,
  source: $callDurationSeconds,
  fn: (seconds) => seconds + 1,
  target: $callDurationSeconds,
});
