import type { AddressedSignal, CallPhase } from "./call.types";
import type { CallRole, CallSnapshot } from "./signaling.types";

export type CallStateReceived = {
  role: CallRole;
  call: CallSnapshot | null;
};

export type LocalCall = {
  callId: string | null;
  phase: CallPhase;
  role: CallRole | null;
};

export type SnapshotContext = LocalCall & {
  // Our invite went out on a socket that closed before call_ringing came back.
  inviteInDoubt: boolean;
  // The role of such an invite the user canceled before a snapshot told its fate: the server may
  // still ring it.
  canceledInvite: CallRole | null;
  // The last call this page ended itself, with the signal that told the server so.
  endedCall: AddressedSignal | null;
};

// restore: the server has a call this page does not; resume: the page has the same call;
// endLocally: the page holds a call the server no longer has; replace: the page holds such a call
// and the server has a newer one of the participant; endedHere: the snapshot was taken before the
// server heard that this page ended the call; inviteCanceled: the call is the canceled invite whose
// call_ringing was lost with the socket.
export type SnapshotDecision =
  "restore" | "resume" | "endLocally" | "replace" | "endedHere" | "inviteCanceled" | "ignore";

export type DecidedSnapshot = {
  local: SnapshotContext;
  received: CallStateReceived;
  decision: SnapshotDecision;
};

export type RestartAnnouncement = {
  // A restored call whose new connection the server has not confirmed announcing to the peer.
  unannouncedRestart: string | null;
  // The role whose socket carries a call_resume with sessionRestart the server has not confirmed.
  restartInFlight: CallRole | null;
};

export type ResumeParams = {
  callId: string;
  role: CallRole;
  sessionRestart: boolean;
};

export type ResumeSent = {
  callId: string;
  sessionRestart: boolean;
};

export type TakenElsewhere = {
  role: CallRole;
  // The server refused the socket's reconnect instead of replacing a socket it had registered.
  refused: boolean;
};

export type GraceSource = {
  generation: number;
  phase: CallPhase;
};

export type GraceStart = {
  generation: number;
  timeoutMs: number;
};

export type PeerResumed = {
  callId: string;
  sessionRestart: boolean;
};
