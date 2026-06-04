import type { IceServerPayload } from "./call.types";

export type CallSignalingInbound =
  | { type: "call_invite"; targetStudentId?: string }
  | { type: "call_accept"; callId: string }
  | { type: "call_reject"; callId: string }
  | { type: "call_cancel"; callId: string }
  | { type: "call_hangup"; callId: string }
  | { type: "webrtc_offer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_ice"; callId: string; candidate: RTCIceCandidateInit }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
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
  | { type: "call_canceled"; callId: string }
  | { type: "call_ended"; callId: string }
  | { type: "call_unavailable"; reason: "offline" }
  | { type: "call_busy" }
  | { type: "call_no_answer"; callId: string }
  | { type: "call_error"; message: string }
  | { type: "webrtc_offer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_answer"; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "webrtc_ice"; callId: string; candidate: RTCIceCandidateInit }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
    };

export const CALL_SIGNAL_OUTBOUND_TYPES = [
  "call_incoming",
  "call_ringing",
  "call_accepted",
  "call_rejected",
  "call_canceled",
  "call_ended",
  "call_unavailable",
  "call_busy",
  "call_no_answer",
  "call_error",
  "webrtc_offer",
  "webrtc_answer",
  "webrtc_ice",
  "call_media_state",
] as const;

export const isCallSignalOutbound = (
  value: unknown
): value is CallSignalingOutbound["type"] =>
  typeof value === "string" &&
  (CALL_SIGNAL_OUTBOUND_TYPES as readonly string[]).includes(value);
