import { combine, createEvent, createStore, sample } from "effector";
import { interval } from "patronum";

import type { CallMediaState } from "../videoCall.types";
import {
  CALL_DURATION_TICK_MS,
  DEFAULT_PEER_MEDIA_STATE,
  DEFAULT_SELF_MEDIA_STATE,
} from "./call.constants";
import { toCallerRole, toOutgoingPeer } from "./call.helpers";
import type {
  CallAddress,
  CallPeer,
  CallPhase,
  CanceledNotice,
  CallSignalTarget,
  IceServerPayload,
  IcePayload,
  IncomingCall,
  LocalStreams,
  SdpPayload,
  StartCallParams,
  TerminalSignal,
  TerminatedCall,
} from "./call.types";
import type { CallEndReason, CallRole, ReceivedSignal } from "./signaling.types";

export const $callPhase = createStore<CallPhase>("idle");
export const $callId = createStore<string | null>(null);
export const $callRole = createStore<CallRole | null>(null);
export const $inviteId = createStore<string | null>(null);
export const $incomingCall = createStore<IncomingCall | null>(null);
export const $outgoingCallPeer = createStore<CallPeer | null>(null);
export const $selfMediaState = createStore<CallMediaState>(DEFAULT_SELF_MEDIA_STATE);
export const $peerMediaState = createStore<CallMediaState>(DEFAULT_PEER_MEDIA_STATE);
export const $callDurationSeconds = createStore(0);
export const $iceServers = createStore<IceServerPayload[]>([]);
export const $localStream = createStore<MediaStream | null>(null);
export const $screenStream = createStore<MediaStream | null>(null);
export const $remoteStream = createStore<MediaStream | null>(null);
export const $screenShareSupported = createStore(false);
export const $isConnecting = $callPhase.map((phase) => phase === "connecting");
// Mic, camera and screen share can be switched only once the own tracks exist.
export const $localMediaReady = $localStream.map(Boolean);
// Where the current call's signals go: its id and the socket role it lives on.
export const $callAddress = combine($callId, $callRole, (callId, role): CallAddress | null =>
  callId && role ? { callId, role } : null
);
// While sharing, the own tile previews the shared screen instead of the camera.
export const $localTileStream = combine(
  $screenStream,
  $localStream,
  (screen, local) => screen ?? local
);
export const $activePeerName = combine(
  $outgoingCallPeer,
  $incomingCall,
  (outgoing, incoming) => outgoing?.name ?? incoming?.callerName ?? ""
);

export const signalReceived = createEvent<ReceivedSignal>();
export const callStarted = createEvent<StartCallParams>();
export const inviteSent = createEvent<string>();
export const callRinging = createEvent<string>();
export const incomingCallReceived = createEvent<IncomingCall>();
export const iceServersReceived = createEvent<IceServerPayload[]>();
export const callAcceptedReceived = createEvent<CallSignalTarget>();
export const offerReceived = createEvent<SdpPayload>();
export const answerReceived = createEvent<SdpPayload>();
export const iceReceived = createEvent<IcePayload>();
export const incomingWhileBusy = createEvent<CallAddress>();
export const staleRingingReceived = createEvent<CallAddress>();
export const staleAcceptReceived = createEvent<CallAddress>();
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
export const screenShareSupportChecked = createEvent<boolean>();
export const localMediaAttached = createEvent<LocalStreams>();
export const screenStreamChanged = createEvent<MediaStream | null>();

export const unavailableReceived = createEvent<CallRole | null>();
export const busyReceived = createEvent();
export const noAnswerReceived = createEvent();
export const rejectedReceived = createEvent();
export const canceledReceived = createEvent<CanceledNotice>();
export const callErrorReceived = createEvent<string>();
export const callFailed = createEvent<string>();
export const mediaAcquisitionFailed = createEvent();
export const transportDisconnected = createEvent<CallRole>();
export const callConnectionLost = createEvent();
export const callTerminated = createEvent<TerminatedCall>();
const callEnding = createEvent<TerminalSignal | null>();

sample({ clock: callStarted, fn: (): CallPhase => "outgoing", target: $callPhase });
sample({ clock: callStarted, fn: toCallerRole, target: $callRole });
sample({ clock: callStarted, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callStarted, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({ clock: callStarted, fn: toOutgoingPeer, target: $outgoingCallPeer });
sample({ clock: inviteSent, target: $inviteId });

sample({ clock: callRinging, target: $callId });
sample({ clock: iceServersReceived, target: $iceServers });
sample({
  clock: callAcceptedReceived,
  fn: ({ iceServers }) => iceServers,
  target: $iceServers,
});
sample({ clock: callAcceptedReceived, fn: (): CallPhase => "connecting", target: $callPhase });

sample({ clock: incomingCallReceived, fn: (): CallPhase => "incoming", target: $callPhase });
sample({ clock: incomingCallReceived, target: $incomingCall });
sample({ clock: incomingCallReceived, fn: () => null, target: $outgoingCallPeer });
sample({ clock: incomingCallReceived, fn: ({ callId }) => callId, target: $callId });
sample({ clock: incomingCallReceived, fn: ({ role }) => role, target: $callRole });
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

sample({ clock: acceptCall, fn: (): CallPhase => "connecting", target: $callPhase });
sample({ clock: callConnected, fn: (): CallPhase => "active", target: $callPhase });

sample({ clock: selfMediaStateChanged, target: $selfMediaState });
sample({ clock: peerMediaStateChanged, target: $peerMediaState });
sample({ clock: screenShareSupportChecked, target: $screenShareSupported });
sample({ clock: localMediaAttached, fn: ({ localStream }) => localStream, target: $localStream });
sample({
  clock: localMediaAttached,
  fn: ({ remoteStream }) => remoteStream,
  target: $remoteStream,
});
sample({ clock: screenStreamChanged, target: $screenStream });

sample({
  clock: rejectCall,
  fn: (): TerminalSignal => ({ type: "call_reject" }),
  target: callEnding,
});
sample({
  clock: cancelCall,
  fn: (): TerminalSignal => ({ type: "call_cancel" }),
  target: callEnding,
});
sample({
  clock: [hangUp, callFailed],
  fn: (): TerminalSignal => ({ type: "call_hangup" }),
  target: callEnding,
});
sample({
  clock: mediaAcquisitionFailed,
  fn: (): TerminalSignal => ({ type: "call_hangup", reason: "media_unavailable" }),
  target: callEnding,
});
sample({
  clock: [
    callEnded,
    unavailableReceived,
    busyReceived,
    noAnswerReceived,
    rejectedReceived,
    canceledReceived,
    callErrorReceived,
    callConnectionLost,
  ],
  fn: () => null,
  target: callEnding,
});
// The address is read once here, so the terminal signal still knows where to go after the reset.
sample({
  clock: callEnding,
  source: $callAddress,
  fn: (address, signal): TerminatedCall => ({ address, signal }),
  target: callTerminated,
});

sample({ clock: callTerminated, fn: (): CallPhase => "idle", target: $callPhase });
sample({ clock: callTerminated, fn: () => null, target: $incomingCall });
sample({ clock: callTerminated, fn: () => null, target: $outgoingCallPeer });
sample({ clock: callTerminated, fn: () => null, target: $inviteId });
sample({ clock: callTerminated, fn: () => 0, target: $callDurationSeconds });
sample({ clock: callTerminated, fn: () => DEFAULT_SELF_MEDIA_STATE, target: $selfMediaState });
sample({ clock: callTerminated, fn: () => DEFAULT_PEER_MEDIA_STATE, target: $peerMediaState });
sample({
  clock: callTerminated,
  fn: () => null,
  target: [$callId, $callRole, $localStream, $screenStream, $remoteStream],
});
sample({ clock: callTerminated, fn: (): IceServerPayload[] => [], target: $iceServers });

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
