import { getWebSocketManager } from "../../lib/wsManager";
import type { CallSignalingInbound } from "../../types";
import { CallAuthorizationError } from "../../utils";
import {
  connectionOf,
  finishCall,
  hangUp,
  notifyCalleeDevices,
  relayToPeer,
  removeCall,
  send,
  terminateActiveCallForParticipant,
} from "./callMessaging";
import { relayPresence } from "./callPresence";
import { calleeHasDevices } from "./callPush";
import * as callRegistry from "./callSignaling";
import {
  isRingingCallee,
  isSamePair,
  resolveDropOutcome,
  resolvePairForStudent,
  resolvePairForTutor,
} from "./callSignaling.helpers";
import type { CallParticipant, LiveCall } from "./callSignaling.types";
import { clearPresence } from "./presenceRegistry";

const expireGrace = async (call: LiveCall, gone: CallParticipant): Promise<void> => {
  const endedAt = call.disconnectedAt[gone.kind];
  const outcome = resolveDropOutcome(call, gone);
  if (!removeCall(call, gone.kind)) return;
  relayToPeer(call, gone.kind, {
    type: "call_ended",
    callId: call.callId,
    reason: "peer_not_returned",
  });
  await finishCall(call, outcome.status, endedAt);
};

// A callee with devices for call notifications is still reachable: the call keeps ringing, its
// other tab may take it over, and the devices hear about it if they have not yet (R3).
const calleeLeftRinging = async (call: LiveCall, callee: CallParticipant): Promise<void> => {
  const reachable = await calleeHasDevices(callee);
  // The callee may have come back, or the call ended, while the devices were looked up.
  if (connectionOf(callee) || callRegistry.getCall(call.callId) !== call) return;
  if (!reachable) {
    await terminateActiveCallForParticipant(callee.kind, callee.id);
    return;
  }
  getWebSocketManager()?.releaseWaitingSockets(callee.kind, callee.id, "holder_gone");
  await notifyCalleeDevices(call);
};

// The transport reports only lost and revoked connections; whether a call goes on is decided here,
// so any transport (browser socket, native shell) keeps the same call rules. A new connection that
// replaces a live one changes nothing: the presence the peer was told stays until the new page
// reports its own, and only a change reaches the peer. `tabId` is the page whose connection was lost.
export const participantDisconnected = async (
  participant: CallParticipant,
  tabId?: string
): Promise<void> => {
  clearPresence(participant);
  const call = callRegistry.findActiveCallForParticipant(participant.kind, participant.id);
  if (!call || call.disconnectedAt[participant.kind]) return;
  if (isRingingCallee(call, participant)) {
    await calleeLeftRinging(call, participant);
    return;
  }
  callRegistry.markDisconnected(call.callId, participant.kind, new Date(), tabId, (expired) => {
    void expireGrace(expired, participant);
  });
  relayPresence(call, participant);
  getWebSocketManager()?.releaseWaitingSockets(participant.kind, participant.id, "holder_gone");
};

// Unlike a lost connection, a revoked session ends the call at once, also one that already waits
// for the participant's lost connection to come back.
export const participantRevoked = async (participant: CallParticipant): Promise<void> => {
  clearPresence(participant);
  await terminateActiveCallForParticipant(participant.kind, participant.id);
};

// Checked again as for call_invite: the student may have been unlinked while away. A pair that
// cannot be checked (the lookup failed) is not let back either: the call ends for both sides
// instead of going on unchecked.
const isPairStillAuthorized = async (call: LiveCall, sender: CallParticipant): Promise<boolean> => {
  try {
    const pair =
      sender.kind === "student"
        ? await resolvePairForStudent(sender.id)
        : await resolvePairForTutor(sender.id, call.studentId);
    return isSamePair(call, pair);
  } catch (error) {
    if (!(error instanceof CallAuthorizationError)) {
      console.error("Call pair check on resume failed:", error);
    }
    return false;
  }
};

// A rebuild sent to a peer without a connection would be lost: the peer gets it on its own
// call_resume, which it sends to come back.
const reachableConnectionOf = (call: LiveCall, participant: CallParticipant): object | null =>
  call.disconnectedAt[participant.kind] === undefined ? (connectionOf(participant) ?? null) : null;

const announceReturn = (call: LiveCall, sender: CallParticipant, sessionRestart: boolean): void => {
  const peer = callRegistry.getPeer(call, sender.kind);
  if (sessionRestart) {
    const sentTo = reachableConnectionOf(call, peer);
    if (sentTo) send(peer, { type: "call_peer_resumed", callId: call.callId, sessionRestart });
    callRegistry.markPeerRestartPending(call, peer.kind, sentTo);
  } else {
    send(peer, { type: "call_peer_resumed", callId: call.callId, sessionRestart });
  }
  relayPresence(call, sender);
  // A write into a dead socket looks sent to the client: only this tells it that the peer was asked
  // (or will be on its return) to rebuild, so it stops asking.
  if (sessionRestart) send(sender, { type: "call_restart_announced", callId: call.callId });
};

// A signal over the connection a rebuild request went to: the request reached the page.
export const confirmPeerRestartDelivery = (sender: CallParticipant): void => {
  const call = callRegistry.findActiveCallForParticipant(sender.kind, sender.id);
  if (call) callRegistry.confirmPeerRestartDelivered(call, sender.kind, connectionOf(sender));
};

export const handleResume = async (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "call_resume" }>
): Promise<void> => {
  // Only the registered socket's messages reach here, and nothing has awaited yet: this is the
  // socket the call_resume came over.
  const resumedOver = connectionOf(sender);
  const noCall = () => send(sender, { type: "call_state", call: null });
  const call = callRegistry.getCall(data.callId);
  if (!call || !callRegistry.isParticipant(call, sender.kind, sender.id)) {
    noCall();
    return;
  }
  const authorized = await isPairStillAuthorized(call, sender);
  if (callRegistry.getCall(data.callId) !== call) {
    noCall();
    return;
  }
  if (!authorized) {
    const ended = hangUp(call, sender.kind, "hangup");
    noCall();
    await ended;
    return;
  }
  // The sender's socket may have closed meanwhile, or another page of the participant took the
  // connection (a returning phone displacing a tab let in by 4004): that page resumes for itself.
  if (!resumedOver || connectionOf(sender) !== resumedOver) return;
  const wasDisconnected = callRegistry.markReconnected(call.callId, sender.kind);
  // A participant that restarts its own session has nothing to rebuild for the peer's restart: the
  // peer rebuilds for the new connection instead.
  const missedPeerRestart =
    callRegistry.takeUndeliveredPeerRestart(call, sender.kind, resumedOver) && !data.sessionRestart;
  if (wasDisconnected || data.sessionRestart) announceReturn(call, sender, data.sessionRestart);
  if (missedPeerRestart) {
    send(sender, { type: "call_peer_resumed", callId: call.callId, sessionRestart: true });
  }
};
