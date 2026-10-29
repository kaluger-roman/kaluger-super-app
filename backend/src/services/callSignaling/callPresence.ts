import type {
  CallSignalingInbound,
  CallSnapshot,
  CallerKindValue,
  PeerPresencePayload,
} from "../../types";
import { toCallLessonSummary } from "../callRecord";
import { connectionOf, relayToPeer, send } from "./callMessaging";
import { pushIncomingCall } from "./callPush";
import * as callRegistry from "./callSignaling";
import { DISCONNECTED_PRESENCE } from "./callSignaling.constants";
import { isRingingCallee, isSamePresence } from "./callSignaling.helpers";
import type { CallParticipant, LiveCall, ParticipantPresence } from "./callSignaling.types";
import { buildIceServers } from "./iceConfig";
import { getPresence, setPresence } from "./presenceRegistry";

// A window the participant looks at right now: it shows the call itself, no notification needed.
export const isVisible = (participant: CallParticipant): boolean =>
  connectionOf(participant) !== undefined && getPresence(participant).presence === "on_screen";

export const toPeerPresence = (call: LiveCall, kind: CallerKindValue): PeerPresencePayload => {
  if (call.disconnectedAt[kind]) return DISCONNECTED_PRESENCE;
  const id = kind === "tutor" ? call.tutorUserId : call.studentUserId;
  return getPresence({ kind, id });
};

export const toCallSnapshot = (call: LiveCall, recipient: CallParticipant): CallSnapshot => {
  const peer = callRegistry.getPeer(call, recipient.kind);
  return {
    callId: call.callId,
    status: call.status,
    direction: call.callerKind === recipient.kind ? "outgoing" : "incoming",
    peerName: peer.kind === "tutor" ? call.tutorName : call.studentName,
    lesson: toCallLessonSummary(call.lesson),
    iceServers: buildIceServers(recipient),
    peerPresence: toPeerPresence(call, peer.kind),
    connectedAt: call.connectedAt?.toISOString() ?? null,
  };
};

// The answer to call_sync: a page that came back learns what happened to its call meanwhile, and
// that its socket is alive.
export const sendCallState = (to: CallParticipant): void => {
  const call = callRegistry.findActiveCallForParticipant(to.kind, to.id);
  send(to, { type: "call_state", call: call ? toCallSnapshot(call, to) : null });
};

export const relayPresence = (call: LiveCall, sender: CallParticipant): void => {
  relayToPeer(call, sender.kind, {
    type: "call_peer_presence",
    callId: call.callId,
    ...toPeerPresence(call, sender.kind),
  });
};

// Each side learns at once that the other one is away, not only on the next change.
export const sendAwayPresencesOnAccept = (call: LiveCall): void => {
  (["tutor", "student"] as const).forEach((kind) => {
    const id = kind === "tutor" ? call.tutorUserId : call.studentUserId;
    if (toPeerPresence(call, kind).presence !== "on_screen") relayPresence(call, { kind, id });
  });
};

export const handlePresenceUpdate = (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "presence_update" }>
): void => {
  const next: ParticipantPresence = {
    presence: data.presence,
    audioSuspended: data.audioSuspended,
    videoSuspended: data.videoSuspended,
  };
  const changed = !isSamePresence(getPresence(sender), next);
  setPresence(sender, next);
  const call = callRegistry.findActiveCallForParticipant(sender.kind, sender.id);
  // While the sender counts as gone the peer keeps seeing "disconnected"; call_resume tells more.
  if (call && changed && !call.disconnectedAt[sender.kind]) relayPresence(call, sender);
  // The callee put the incoming call screen away: its devices ring instead (R3).
  if (call && isRingingCallee(call, sender) && next.presence === "background") {
    void pushIncomingCall(call);
  }
};
