import type { IceServerPayload } from "./call.types";

export type CallSignalingInbound =
  | { type: "call_invite"; inviteId: string; targetStudentId?: string }
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
  | { type: "call_connected"; callId: string };

// A reply names the call it is about, or, before the call exists, the invite that asked for it.
export type CallReplyTarget = { callId: string } | { inviteId: string };

export type CallSignalingOutbound =
  | {
      type: "call_incoming";
      callId: string;
      callerName: string;
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
    };

export type CallRole = "tutor" | "student";

export type ReceivedSignal = {
  role: CallRole;
  message: CallSignalingOutbound;
};

export type CallEndReason = "hangup" | "peer_disconnected" | "media_unavailable";

export type CallCancelReason = "canceled" | "timeout";

export type CallTransport = (message: CallSignalingInbound) => void;

export type InstalledTransport = { send: CallTransport; owner: unknown };
