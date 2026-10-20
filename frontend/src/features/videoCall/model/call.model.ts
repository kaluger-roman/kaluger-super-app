import { combine, createEvent, createStore, sample } from "effector";
import { interval } from "patronum";

import type { CallMediaState } from "../videoCall.types";
import {
  CALL_DURATION_TICK_MS,
  CONNECTING_MESSAGE,
  DEFAULT_PEER_MEDIA_STATE,
  DEFAULT_SELF_MEDIA_STATE,
  MEDIA_DENIED_MESSAGE,
} from "./call.constants";
import { toErrorMessage, toOutgoingPeer } from "./call.helpers";
import type {
  CallPeer,
  CallPhase,
  CanceledNotice,
  CallSignalTarget,
  CallStatusMessage,
  IceServerPayload,
  IcePayload,
  IncomingCall,
  SdpPayload,
  StartCallParams,
} from "./call.types";
import type { CallEndReason, CallRole, CallSignalingOutbound } from "./signaling.types";

export const $callPhase = createStore<CallPhase>("idle");
export const $callId = createStore<string | null>(null);
export const $incomingCall = createStore<IncomingCall | null>(null);
export const $outgoingCallPeer = createStore<CallPeer | null>(null);
export const $selfMediaState = createStore<CallMediaState>(DEFAULT_SELF_MEDIA_STATE);
export const $peerMediaState = createStore<CallMediaState>(DEFAULT_PEER_MEDIA_STATE);
export const $callDurationSeconds = createStore(0);
export const $callStatusMessage = createStore<CallStatusMessage>(null);
export const $mediaEpoch = createStore(0);
export const $iceServers = createStore<IceServerPayload[]>([]);
export const $wasConnected = createStore(false);
export const $activePeerName = combine(
  $outgoingCallPeer,
  $incomingCall,
  (outgoing, incoming) => outgoing?.name ?? incoming?.callerName ?? ""
);

export const signalReceived = createEvent<CallSignalingOutbound>();
export const callStarted = createEvent<StartCallParams>();
export const callRinging = createEvent<CallSignalTarget>();
export const incomingCallReceived = createEvent<IncomingCall>();
export const iceServersReceived = createEvent<IceServerPayload[]>();
export const callAcceptedReceived = createEvent<CallSignalTarget>();
export const offerReceived = createEvent<SdpPayload>();
export const answerReceived = createEvent<SdpPayload>();
export const iceReceived = createEvent<IcePayload>();
export const incomingWhileBusy = createEvent<string>();
export const staleRingingReceived = createEvent<string>();
export const staleAcceptReceived = createEvent<string>();
export const acceptCall = createEvent();
export const rejectCall = createEvent();
export const cancelCall = createEvent();
export const hangUp = createEvent();
export const callConnected = createEvent();
export const callEnded = createEvent<CallEndReason>();

export const toggleMic = createEvent();
export const toggleCamera = createEvent();
export const toggleScreenShare = createEvent();
export const selfMediaStateChanged = createEvent<CallMediaState>();
export const peerMediaStateChanged = createEvent<CallMediaState>();
export const remoteTrackReceived = createEvent();

export const unavailableReceived = createEvent<CallPeer["role"] | null>();
export const busyReceived = createEvent();
export const noAnswerReceived = createEvent();
export const rejectedReceived = createEvent();
export const canceledReceived = createEvent<CanceledNotice>();
export const callErrorReceived = createEvent<string>();
export const callFailed = createEvent<string>();
export const mediaAcquisitionFailed = createEvent();
export const transportDisconnected = createEvent<CallRole>();
export const callConnectionLost = createEvent();
export const callTerminated = createEvent();
export const callResourcesReleased = createEvent();

sample({
  clock: [selfMediaStateChanged, remoteTrackReceived],
  source: $mediaEpoch,
  fn: (epoch) => epoch + 1,
  target: $mediaEpoch,
});

sample({ clock: callStarted, fn: (): CallPhase => "outgoing", target: $callPhase });
sample({ clock: callStarted, fn: () => null, target: $callStatusMessage });
sample({ clock: callStarted, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callStarted, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({ clock: callStarted, fn: toOutgoingPeer, target: $outgoingCallPeer });

sample({ clock: callRinging, fn: ({ callId }) => callId, target: $callId });
sample({ clock: callRinging, fn: ({ iceServers }) => iceServers, target: $iceServers });
sample({ clock: iceServersReceived, target: $iceServers });

sample({ clock: incomingCallReceived, fn: (): CallPhase => "incoming", target: $callPhase });
sample({ clock: incomingCallReceived, target: $incomingCall });
sample({ clock: incomingCallReceived, fn: () => null, target: $outgoingCallPeer });
sample({ clock: incomingCallReceived, fn: ({ callId }) => callId, target: $callId });
sample({
  clock: incomingCallReceived,
  fn: () => DEFAULT_SELF_MEDIA_STATE,
  target: $selfMediaState,
});
sample({
  clock: incomingCallReceived,
  fn: () => DEFAULT_PEER_MEDIA_STATE,
  target: $peerMediaState,
});

sample({ clock: callConnected, fn: (): CallPhase => "active", target: $callPhase });
sample({ clock: callConnected, fn: () => null, target: $callStatusMessage });
sample({ clock: callConnected, fn: () => true, target: $wasConnected });

sample({ clock: acceptCall, fn: (): CallPhase => "active", target: $callPhase });
sample({ clock: acceptCall, fn: () => CONNECTING_MESSAGE, target: $callStatusMessage });

sample({ clock: selfMediaStateChanged, target: $selfMediaState });
sample({ clock: peerMediaStateChanged, target: $peerMediaState });

sample({
  clock: callErrorReceived,
  fn: toErrorMessage,
  target: $callStatusMessage,
});
sample({
  clock: mediaAcquisitionFailed,
  fn: () => MEDIA_DENIED_MESSAGE,
  target: $callStatusMessage,
});

sample({
  clock: [
    rejectCall,
    cancelCall,
    hangUp,
    callEnded,
    callFailed,
    unavailableReceived,
    busyReceived,
    noAnswerReceived,
    rejectedReceived,
    canceledReceived,
    callErrorReceived,
    mediaAcquisitionFailed,
    callConnectionLost,
  ],
  target: callTerminated,
});

sample({ clock: callTerminated, fn: (): CallPhase => "idle", target: $callPhase });
sample({ clock: callTerminated, fn: () => null, target: $incomingCall });
sample({ clock: callTerminated, fn: () => null, target: $outgoingCallPeer });
sample({ clock: callTerminated, fn: () => 0, target: $callDurationSeconds });
sample({ clock: callTerminated, fn: () => false, target: $wasConnected });
sample({ clock: callTerminated, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callTerminated, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({ clock: callResourcesReleased, fn: () => null, target: $callId });
sample({ clock: callResourcesReleased, fn: (): IceServerPayload[] => [], target: $iceServers });

const { tick } = interval({
  timeout: CALL_DURATION_TICK_MS,
  start: callConnected,
  stop: callTerminated,
});

sample({
  clock: tick,
  source: $callDurationSeconds,
  fn: (seconds) => seconds + 1,
  target: $callDurationSeconds,
});
