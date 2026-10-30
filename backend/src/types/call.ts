import type { CallStatus, Subject } from "@prisma/client";

export type CallDirection = "outgoing" | "incoming";

export type CallerKindValue = "tutor" | "student";

export type CallEndReason =
  | "hangup"
  | "peer_disconnected"
  | "media_unavailable"
  // The peer lost the connection and did not come back within the reconnect grace period.
  | "peer_not_returned";

export type CallCancelReason = "canceled" | "timeout";

// A reply names the call it is about, or, before the call exists, the invite that asked for it.
export type CallReplyTarget = { callId: string } | { inviteId: string };

export type CallLessonSummary = {
  id: string;
  subject: Subject;
  startTime: string;
  endTime: string;
};

export type IceServer = {
  urls: string;
  username?: string;
  credential?: string;
};

// Where a participant is, in domain terms: no browser events reach the protocol (FR-030).
export type PresenceState = "on_screen" | "background";

export type PeerPresence = PresenceState | "disconnected";

// What the peer keeps sending while away (FR-033), not just the fact that it left.
export type PeerPresencePayload = {
  presence: PeerPresence;
  audioSuspended: boolean;
  videoSuspended: boolean;
};

export type CallSnapshotStatus = "ringing" | "accepted" | "connected";

// The call a participant belongs to, as seen by that participant (direction, ICE servers).
export type CallSnapshot = {
  callId: string;
  status: CallSnapshotStatus;
  direction: CallDirection;
  peerName: string;
  lesson: CallLessonSummary | null;
  iceServers: IceServer[];
  peerPresence: PeerPresencePayload;
  connectedAt: string | null;
};

export type SessionDescriptionPayload = {
  type: "offer" | "answer";
  sdp: string;
};

export type IceCandidatePayload = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

export type CallSignalingInbound =
  | { type: "call_invite"; inviteId: string; targetStudentId?: string; lessonId?: string }
  | { type: "call_accept"; callId: string; pushEndpoint?: string }
  | { type: "call_reject"; callId: string; pushEndpoint?: string }
  | { type: "call_cancel"; callId: string }
  | { type: "call_hangup"; callId: string; reason?: "media_unavailable" }
  | { type: "webrtc_offer"; callId: string; sdp: SessionDescriptionPayload }
  | { type: "webrtc_answer"; callId: string; sdp: SessionDescriptionPayload }
  | { type: "webrtc_ice"; callId: string; candidate: IceCandidatePayload }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
      cameraAvailable: boolean;
    }
  | { type: "call_connected"; callId: string }
  | {
      type: "presence_update";
      presence: PresenceState;
      audioSuspended: boolean;
      videoSuspended: boolean;
    }
  | { type: "call_resume"; callId: string; sessionRestart: boolean }
  // Asks for the participant's call as the server sees it; the answer is call_state.
  | { type: "call_sync" };

export type CallSignalingOutbound =
  | {
      type: "call_incoming";
      callId: string;
      callerName: string;
      lesson: CallLessonSummary | null;
      iceServers: IceServer[];
    }
  | { type: "call_ringing"; callId: string; inviteId: string }
  | { type: "call_accepted"; callId: string; iceServers: IceServer[] }
  | { type: "call_rejected"; callId: string }
  | { type: "call_canceled"; callId: string; reason: CallCancelReason }
  | { type: "call_ended"; callId: string; reason: CallEndReason }
  | ({ type: "call_unavailable"; reason: "offline" } & CallReplyTarget)
  | { type: "call_busy"; inviteId: string }
  | { type: "call_history_updated" }
  | { type: "call_no_answer"; callId: string }
  | ({ type: "call_error"; message: string } & CallReplyTarget)
  | { type: "webrtc_offer"; callId: string; sdp: SessionDescriptionPayload }
  | { type: "webrtc_answer"; callId: string; sdp: SessionDescriptionPayload }
  | { type: "webrtc_ice"; callId: string; candidate: IceCandidatePayload }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
      cameraAvailable: boolean;
    }
  | { type: "call_state"; call: CallSnapshot | null }
  | ({ type: "call_peer_presence"; callId: string } & PeerPresencePayload)
  | { type: "call_peer_resumed"; callId: string; sessionRestart: boolean }
  | { type: "call_restart_announced"; callId: string };

export type CallHistoryItem = {
  id: string;
  peerName: string;
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallStatus;
  lesson: CallLessonSummary | null;
};
