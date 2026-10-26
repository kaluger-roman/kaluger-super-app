import type { CallStatus, Subject } from "@prisma/client";

export type CallDirection = "outgoing" | "incoming";

export type CallerKindValue = "tutor" | "student";

export type CallEndReason = "hangup" | "peer_disconnected" | "media_unavailable";

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
  | { type: "call_accept"; callId: string }
  | { type: "call_reject"; callId: string }
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
  | { type: "call_connected"; callId: string };

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
    };

export type CallHistoryItem = {
  id: string;
  peerName: string;
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallStatus;
  lesson: CallLessonSummary | null;
};
