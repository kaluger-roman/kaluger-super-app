import { sample, split } from "effector";

import { callHistoryModel } from "@entities";

import * as callModel from "./call.model";
import {
  canTakeIncoming,
  isAwaitingRinging,
  isCallErrorForContext,
  isCurrentCall,
  isOutgoing,
  isSignalOf,
  toPeerMediaState,
} from "./signalRouting.helpers";

const callContext = { callId: callModel.$callId, phase: callModel.$callPhase };

const signals = split(callModel.signalReceived, {
  incoming: isSignalOf("call_incoming"),
  ringing: isSignalOf("call_ringing"),
  accepted: isSignalOf("call_accepted"),
  rejected: isSignalOf("call_rejected"),
  canceled: isSignalOf("call_canceled"),
  ended: isSignalOf("call_ended"),
  unavailable: isSignalOf("call_unavailable"),
  busy: isSignalOf("call_busy"),
  noAnswer: isSignalOf("call_no_answer"),
  error: isSignalOf("call_error"),
  offer: isSignalOf("webrtc_offer"),
  answer: isSignalOf("webrtc_answer"),
  ice: isSignalOf("webrtc_ice"),
  mediaState: isSignalOf("call_media_state"),
  historyUpdated: isSignalOf("call_history_updated"),
});

sample({ clock: signals.historyUpdated, target: callHistoryModel.refreshRequested });

// Decide once: taking the call flips the phase, so later samples would see "incoming".
const incomingDecided = sample({
  clock: signals.incoming,
  source: callContext,
  fn: (context, message) => ({ message, take: canTakeIncoming(context) }),
});

sample({
  clock: incomingDecided,
  filter: ({ take }) => take,
  fn: ({ message }) => message.iceServers,
  target: callModel.iceServersReceived,
});
sample({
  clock: incomingDecided,
  filter: ({ take }) => take,
  fn: ({ message }) => ({ callId: message.callId, callerName: message.callerName }),
  target: callModel.incomingCallReceived,
});
sample({
  clock: incomingDecided,
  filter: ({ take }) => !take,
  fn: ({ message }) => message.callId,
  target: callModel.incomingWhileBusy,
});

sample({
  clock: signals.ringing,
  source: callContext,
  filter: isAwaitingRinging,
  fn: (_, { callId, iceServers }) => ({ callId, iceServers }),
  target: callModel.callRinging,
});
sample({
  clock: signals.ringing,
  source: callContext,
  filter: (context) => context.phase === "idle",
  fn: (_, { callId }) => callId,
  target: callModel.staleRingingReceived,
});

sample({
  clock: signals.accepted,
  source: callContext,
  filter: (context, message) => isOutgoing(context) && isCurrentCall(context, message),
  fn: (_, { callId, iceServers }) => ({ callId, iceServers }),
  target: callModel.callAcceptedReceived,
});
sample({
  clock: signals.accepted,
  source: callContext,
  filter: (context, message) => !isCurrentCall(context, message),
  fn: (_, { callId }) => callId,
  target: callModel.staleAcceptReceived,
});

sample({
  clock: signals.rejected,
  source: callContext,
  filter: isCurrentCall,
  target: callModel.rejectedReceived,
});
sample({
  clock: signals.canceled,
  source: { ...callContext, incoming: callModel.$incomingCall },
  filter: isCurrentCall,
  fn: ({ incoming }, { reason }) => ({
    reason: reason ?? "canceled",
    callerName: incoming?.callerName ?? "",
  }),
  target: callModel.canceledReceived,
});
sample({
  clock: signals.ended,
  source: callContext,
  filter: isCurrentCall,
  fn: (_, { reason }) => reason ?? "hangup",
  target: callModel.callEnded,
});
sample({
  clock: signals.noAnswer,
  source: callContext,
  filter: isCurrentCall,
  target: callModel.noAnswerReceived,
});
sample({
  clock: signals.unavailable,
  source: { ...callContext, peer: callModel.$outgoingCallPeer },
  filter: isOutgoing,
  fn: ({ peer }) => peer?.role ?? null,
  target: callModel.unavailableReceived,
});
sample({
  clock: signals.busy,
  source: callContext,
  filter: isOutgoing,
  target: callModel.busyReceived,
});
sample({
  clock: signals.error,
  source: callContext,
  filter: isCallErrorForContext,
  fn: (_, { message }) => message,
  target: callModel.callErrorReceived,
});

sample({
  clock: signals.offer,
  source: callContext,
  filter: (context, message) => context.phase !== "incoming" && isCurrentCall(context, message),
  fn: (_, { callId, sdp }) => ({ callId, sdp }),
  target: callModel.offerReceived,
});
sample({
  clock: signals.answer,
  source: callContext,
  filter: isCurrentCall,
  fn: (_, { callId, sdp }) => ({ callId, sdp }),
  target: callModel.answerReceived,
});
sample({
  clock: signals.ice,
  source: callContext,
  filter: isCurrentCall,
  fn: (_, { callId, candidate }) => ({ callId, candidate }),
  target: callModel.iceReceived,
});
sample({
  clock: signals.mediaState,
  source: callContext,
  filter: isCurrentCall,
  fn: (_, message) => toPeerMediaState(message),
  target: callModel.peerMediaStateChanged,
});
