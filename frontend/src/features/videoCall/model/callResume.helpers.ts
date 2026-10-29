import type {
  AddressedSignal,
  CallAddress,
  CallPhase,
  CallSignalTarget,
  ResumeRequest,
} from "./call.types";
import { LOCAL_GRACE_TIMEOUT_MS, RINGING_GRACE_TIMEOUT_MS } from "./callResume.constants";
import type {
  CallStateReceived,
  DecidedSnapshot,
  GraceSource,
  GraceStart,
  LocalCall,
  RestartAnnouncement,
  ResumeParams,
  SnapshotContext,
  SnapshotDecision,
  TakenElsewhere,
} from "./callResume.types";
import type { CallRole, CallSnapshot } from "./signaling.types";

const isAwaitingRinging = ({ phase, callId }: LocalCall): boolean =>
  phase === "outgoing" && callId === null;

const callIdOf = (signal: AddressedSignal | null): string | null =>
  signal && "callId" in signal.message ? signal.message.callId : null;

// A snapshot computed before our invite reached the server says nothing about it yet. Once the
// invite went out on a socket that then closed, the snapshot on the new socket is all there is.
const decideOnInvite = (inviteInDoubt: boolean, call: CallSnapshot | null): SnapshotDecision => {
  if (!inviteInDoubt) return "ignore";
  return call ? "restore" : "endLocally";
};

// The server keeps one call per participant, so the outgoing call of that role is the invite.
const isCanceledInvite = (local: SnapshotContext, { call, role }: CallStateReceived): boolean =>
  local.canceledInvite === role && call?.direction === "outgoing";

export const decideOnSnapshot = (
  local: SnapshotContext,
  received: CallStateReceived
): SnapshotDecision => {
  const { call, role } = received;
  if (call && call.callId === callIdOf(local.endedCall)) return "endedHere";
  if (isCanceledInvite(local, received)) return "inviteCanceled";
  if (local.phase === "idle") return call ? "restore" : "ignore";
  // The page's call lives on the other role's socket: this snapshot is not about it.
  if (local.role !== role) return "ignore";
  if (isAwaitingRinging(local)) return decideOnInvite(local.inviteInDoubt, call);
  if (!call) return "endLocally";
  // The server keeps one call per participant: another one means the page's call is over.
  return call.callId === local.callId ? "resume" : "replace";
};

export const isMediaPhase = (phase: CallPhase): boolean =>
  phase === "connecting" || phase === "active";

export const isEndedWithoutPage = ({ decision }: DecidedSnapshot): boolean =>
  decision === "endLocally";

export const toRestoreRequest = ({ decision, received }: DecidedSnapshot): ResumeRequest | null =>
  decision === "restore" && received.call ? { role: received.role, snapshot: received.call } : null;

// The newer call of the participant, restored once the page's own call has ended.
export const toReplacement = ({ decision, received }: DecidedSnapshot): ResumeRequest | null =>
  decision === "replace" && received.call ? { role: received.role, snapshot: received.call } : null;

export const toResumeAddress = ({ decision, local }: DecidedSnapshot): CallAddress | null =>
  decision === "resume" && local.callId && local.role
    ? { callId: local.callId, role: local.role }
    : null;

export const toMatchedSnapshot = ({ decision, received }: DecidedSnapshot): CallSnapshot | null =>
  decision === "resume" ? received.call : null;

// The callee answered while the caller was away: the caller's call_accepted was lost with its socket.
export const toMissedAcceptance = ({
  decision,
  local,
  received: { call },
}: DecidedSnapshot): CallSignalTarget | null =>
  decision === "resume" && local.phase === "outgoing" && call && call.status !== "ringing"
    ? { callId: call.callId, iceServers: call.iceServers }
    : null;

// The page answered while its socket was gone: the server still rings and has to hear it again.
export const toUnsentAccept = ({
  decision,
  local,
  received: { call, role },
}: DecidedSnapshot): AddressedSignal | null =>
  decision === "resume" &&
  local.phase === "connecting" &&
  call?.status === "ringing" &&
  call.direction === "incoming"
    ? { role, message: { type: "call_accept", callId: call.callId } }
    : null;

// A media change made while the socket was gone never reached the peer.
export const isMediaResume = ({ decision, local }: DecidedSnapshot): boolean =>
  decision === "resume" && isMediaPhase(local.phase);

export const toEndedSignal = ({ decision, local }: DecidedSnapshot): AddressedSignal | null =>
  decision === "endedHere" ? local.endedCall : null;

// The server hangs up a call that is no longer ringing on call_cancel as well.
export const toInviteCancel = ({
  decision,
  received: { call, role },
}: DecidedSnapshot): AddressedSignal | null =>
  decision === "inviteCanceled" && call
    ? { role, message: { type: "call_cancel", callId: call.callId } }
    : null;

export const isSnapshotOfCanceledInvite = ({ local, received }: DecidedSnapshot): boolean =>
  local.canceledInvite === received.role;

// The peer rebuilds its side only for a connection it has not heard of yet, and only once per
// call_resume the server may still be handling.
export const toResumeParams = (
  { unannouncedRestart, restartInFlight }: RestartAnnouncement,
  { callId, role }: CallAddress
): ResumeParams => ({
  callId,
  role,
  sessionRestart: unannouncedRestart === callId && restartInFlight === null,
});

export const isOwnCall = ({ phase, role }: LocalCall, lost: CallRole): boolean =>
  phase !== "idle" && role === lost;

// A call that still rang when its socket was lost waits no longer than the server rings it.
export const toGraceStart = ({ generation, phase }: GraceSource): GraceStart => ({
  generation: generation + 1,
  timeoutMs:
    phase === "outgoing" || phase === "incoming"
      ? RINGING_GRACE_TIMEOUT_MS
      : LOCAL_GRACE_TIMEOUT_MS,
});

// The server refuses a reconnect only when the participant has no call to come back to, or an
// incoming one that still rings and that no connection holds (the page opened from its
// notification took it, R3): a refusal means any other call of the page is over. A registered
// socket replaced by another page lost its call to that page and says nothing.
export const isEndedCallRefusal = (phase: CallPhase, { refused }: TakenElsewhere): boolean =>
  refused && phase !== "incoming";

export const isInviteInDoubt = (local: LocalCall, lost: CallRole): boolean =>
  isAwaitingRinging(local) && local.role === lost;
