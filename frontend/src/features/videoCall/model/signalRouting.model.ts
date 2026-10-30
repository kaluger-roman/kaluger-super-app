import { sample, split } from "effector";

import { callHistoryModel, lessonCallsModel } from "@entities";

import * as callModel from "./call.model";
import {
  canTakeIncoming,
  isCurrentCall,
  isOutgoing,
  isOwnRinging,
  isReplyToCurrent,
  isSignalOf,
  toPeerMediaState,
} from "./signalRouting.helpers";

const callContext = {
  callId: callModel.$callId,
  phase: callModel.$callPhase,
  inviteId: callModel.$inviteId,
};

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

sample({
  clock: signals.historyUpdated,
  target: [callHistoryModel.refreshRequested, lessonCallsModel.refreshRequested],
});

// Decide once: taking the call flips the phase, so later samples would see "incoming". A repeated
// call_incoming of the current call (a restored page, a second delivery) is neither taken nor
// refused.
const incomingDecided = sample({
  clock: signals.incoming,
  source: callContext,
  fn: (context, signal) => ({
    signal,
    take: canTakeIncoming(context),
    repeated: isCurrentCall(context, signal.message),
  }),
});

sample({
  clock: incomingDecided,
  filter: ({ take }) => take,
  fn: ({ signal }) => signal.message.iceServers,
  target: callModel.iceServersReceived,
});
sample({
  clock: incomingDecided,
  filter: ({ take }) => take,
  fn: ({ signal: { message, role } }) => ({
    callId: message.callId,
    callerName: message.callerName,
    role,
    lesson: message.lesson,
  }),
  target: callModel.incomingCallReceived,
});
sample({
  clock: incomingDecided,
  filter: ({ take, repeated }) => !take && !repeated,
  fn: ({ signal: { message, role } }) => ({ callId: message.callId, role }),
  target: callModel.incomingWhileBusy,
});

sample({
  clock: signals.ringing,
  source: callContext,
  filter: (context, { message }) => isOwnRinging(context, message),
  fn: (_, { message }) => message.callId,
  target: callModel.callRinging,
});
// A ringing for an invite we no longer wait for (canceled before the server answered).
sample({
  clock: signals.ringing,
  source: callContext,
  filter: (context, { message }) =>
    !isOwnRinging(context, message) && !isCurrentCall(context, message),
  fn: (_, { message, role }) => ({ callId: message.callId, role }),
  target: callModel.staleRingingReceived,
});

sample({
  clock: signals.accepted,
  source: callContext,
  filter: (context, { message }) => isOutgoing(context) && isCurrentCall(context, message),
  fn: (_, { message }) => ({ callId: message.callId, iceServers: message.iceServers }),
  target: callModel.callAcceptedReceived,
});
sample({
  clock: signals.accepted,
  source: callContext,
  filter: (context, { message }) => !isCurrentCall(context, message),
  fn: (_, { message, role }) => ({ callId: message.callId, role }),
  target: callModel.staleAcceptReceived,
});

sample({
  clock: signals.rejected,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  target: callModel.rejectedReceived,
});
sample({
  clock: signals.canceled,
  source: { ...callContext, incoming: callModel.$incomingCall },
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: ({ incoming }, { message }) => ({
    reason: message.reason,
    callerName: incoming?.callerName ?? "",
  }),
  target: callModel.canceledReceived,
});
sample({
  clock: signals.ended,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => message.reason,
  target: callModel.callEnded,
});
sample({
  clock: signals.noAnswer,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  target: callModel.noAnswerReceived,
});
sample({
  clock: signals.unavailable,
  source: { ...callContext, peer: callModel.$outgoingCallPeer },
  filter: (context, { message }) => isOutgoing(context) && isReplyToCurrent(context, message),
  fn: ({ peer }) => peer?.role ?? null,
  target: callModel.unavailableReceived,
});
sample({
  clock: signals.busy,
  source: callContext,
  filter: (context, { message }) => isReplyToCurrent(context, message),
  target: callModel.busyReceived,
});
sample({
  clock: signals.error,
  source: callContext,
  filter: (context, { message }) => isReplyToCurrent(context, message),
  fn: (_, { message }) => message.message,
  target: callModel.callErrorReceived,
});

sample({
  clock: signals.offer,
  source: callContext,
  filter: (context, { message }) => context.phase !== "incoming" && isCurrentCall(context, message),
  fn: (_, { message }) => ({ callId: message.callId, sdp: message.sdp }),
  target: callModel.offerReceived,
});
sample({
  clock: signals.answer,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => ({ callId: message.callId, sdp: message.sdp }),
  target: callModel.answerReceived,
});
sample({
  clock: signals.ice,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => ({ callId: message.callId, candidate: message.candidate }),
  target: callModel.iceReceived,
});
sample({
  clock: signals.mediaState,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => toPeerMediaState(message),
  target: callModel.peerMediaStateChanged,
});
