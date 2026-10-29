import { sample, split } from "effector";

import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";
import * as callResumeModel from "./callResume.model";
import { isCurrentCall, isSignalOf, toPeerPresenceState } from "./signalRouting.helpers";

// Signals that keep a call alive across lost connections and reloads (039).
const signals = split(callModel.signalReceived, {
  state: isSignalOf("call_state"),
  peerPresence: isSignalOf("call_peer_presence"),
  peerResumed: isSignalOf("call_peer_resumed"),
  restartAnnounced: isSignalOf("call_restart_announced"),
});

const callContext = {
  callId: callModel.$callId,
  phase: callModel.$callPhase,
  inviteId: callModel.$inviteId,
};

sample({
  clock: signals.state,
  fn: ({ role, message }) => ({ role, call: message.call }),
  target: callResumeModel.callStateReceived,
});
sample({
  clock: signals.peerPresence,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => toPeerPresenceState(message),
  target: callPresenceModel.peerPresenceReceived,
});
sample({
  clock: signals.peerResumed,
  source: callContext,
  filter: (context, { message }) => isCurrentCall(context, message),
  fn: (_, { message }) => ({ callId: message.callId, sessionRestart: message.sessionRestart }),
  target: callResumeModel.peerResumed,
});
sample({
  clock: signals.restartAnnounced,
  fn: ({ message }) => message.callId,
  target: callResumeModel.restartAnnounced,
});
