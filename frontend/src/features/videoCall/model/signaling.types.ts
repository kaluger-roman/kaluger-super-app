import type { IceServerPayload } from "./call.types";

export type CallSignalingInbound =
  | { type: "call_invite"; targetStudentId?: string }
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

export type CallSignalingOutbound =
  | {
      type: "call_incoming";
      callId: string;
      callerName: string;
      iceServers: IceServerPayload[];
    }
  | { type: "call_ringing"; callId: string; iceServers: IceServerPayload[] }
  | { type: "call_accepted"; callId: string; iceServers: IceServerPayload[] }
  | { type: "call_rejected"; callId: string }
  | { type: "call_canceled"; callId: string; reason?: CallCancelReason }
  | { type: "call_ended"; callId: string; reason?: CallEndReason }
  | { type: "call_unavailable"; reason: "offline" }
  | { type: "call_busy" }
  | { type: "call_history_updated" }
  | { type: "call_no_answer"; callId: string }
  | { type: "call_error"; message: string; callId?: string }
  | { type: "webrtc_offer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_ice"; callId: string; candidate: RTCIceCandidateInit }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
      cameraAvailable?: boolean;
    };

export type CallRole = "tutor" | "student";

export type CallEndReason = "hangup" | "peer_disconnected" | "media_unavailable";

export type CallCancelReason = "canceled" | "timeout";

export type CallTransport = (message: CallSignalingInbound) => void;

export type InstalledTransport = { send: CallTransport; owner: unknown };
