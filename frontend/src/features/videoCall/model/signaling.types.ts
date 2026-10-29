import type { CallLessonSummary } from "@entities";

import type { PeerPresenceState, PresenceState } from "../videoCall.types";
import type { CALL_END_REASONS, CALL_SNAPSHOT_STATUSES } from "./signaling.constants";

export type IceServerPayload = {
  urls: string;
  username?: string;
  credential?: string;
};

export type CallSignalingInbound =
  | { type: "call_invite"; inviteId: string; targetStudentId?: string; lessonId?: string }
  | { type: "call_accept"; callId: string }
  | { type: "call_reject"; callId: string }
  | { type: "call_cancel"; callId: string }
  | { type: "call_hangup"; callId: string; reason?: "media_unavailable" }
  | { type: "webrtc_offer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_ice"; callId: string; candidate: RTCIceCandidateInit }
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
  | { type: "call_sync" };

// A reply names the call it is about, or, before the call exists, the invite that asked for it.
export type CallReplyTarget = { callId: string } | { inviteId: string };

export type CallSignalingOutbound =
  | {
      type: "call_incoming";
      callId: string;
      callerName: string;
      lesson: CallLessonSummary | null;
      iceServers: IceServerPayload[];
    }
  | { type: "call_ringing"; callId: string; inviteId: string }
  | { type: "call_accepted"; callId: string; iceServers: IceServerPayload[] }
  | { type: "call_rejected"; callId: string }
  | { type: "call_canceled"; callId: string; reason: CallCancelReason }
  | { type: "call_ended"; callId: string; reason: CallEndReason }
  | ({ type: "call_unavailable"; reason: "offline" } & CallReplyTarget)
  | { type: "call_busy"; inviteId: string }
  | { type: "call_history_updated" }
  | { type: "call_no_answer"; callId: string }
  | ({ type: "call_error"; message: string } & CallReplyTarget)
  | { type: "webrtc_offer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_ice"; callId: string; candidate: RTCIceCandidateInit }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
      cameraAvailable: boolean;
    }
  | { type: "call_state"; call: CallSnapshot | null }
  | ({ type: "call_peer_presence"; callId: string } & PeerPresenceState)
  | { type: "call_peer_resumed"; callId: string; sessionRestart: boolean }
  | { type: "call_restart_announced"; callId: string };

export type CallRole = "tutor" | "student";

export type ReceivedSignal = {
  role: CallRole;
  message: CallSignalingOutbound;
};

export type CallEndReason = (typeof CALL_END_REASONS)[number];

export type CallSnapshotStatus = (typeof CALL_SNAPSHOT_STATUSES)[number];

// The call the own participant belongs to, as the server sees it: restores a call after a reload
// or a lost connection.
export type CallSnapshot = {
  callId: string;
  status: CallSnapshotStatus;
  direction: "incoming" | "outgoing";
  peerName: string;
  lesson: CallLessonSummary | null;
  iceServers: IceServerPayload[];
  peerPresence: PeerPresenceState;
  connectedAt: string | null;
};

export type CallCancelReason = "canceled" | "timeout";

export type CallTransport = (message: CallSignalingInbound) => void;

export type InstalledTransport = { send: CallTransport; owner: unknown };
