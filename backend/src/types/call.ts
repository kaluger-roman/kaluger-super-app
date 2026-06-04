export type CallStatusValue =
  | "completed"
  | "missed"
  | "rejected"
  | "canceled"
  | "failed";

export type CallDirection = "outgoing" | "incoming";

export type CallerKindValue = "tutor" | "student";

export type IceServer = {
  urls: string;
  username?: string;
  credential?: string;
};

export type IceServersConfig = {
  iceServers: IceServer[];
};

export type CallSignalingInbound =
  | { type: "call_invite"; targetStudentId?: string }
  | { type: "call_accept"; callId: string }
  | { type: "call_reject"; callId: string }
  | { type: "call_cancel"; callId: string }
  | { type: "call_hangup"; callId: string }
  | { type: "webrtc_offer"; callId: string; sdp: unknown }
  | { type: "webrtc_answer"; callId: string; sdp: unknown }
  | { type: "webrtc_ice"; callId: string; candidate: unknown }
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
      iceServers: IceServer[];
    }
  | { type: "call_ringing"; callId: string; iceServers: IceServer[] }
  | { type: "call_accepted"; callId: string; iceServers: IceServer[] }
  | { type: "call_rejected"; callId: string }
  | { type: "call_canceled"; callId: string }
  | { type: "call_ended"; callId: string }
  | { type: "call_unavailable"; reason: "offline" }
  | { type: "call_busy" }
  | { type: "call_no_answer"; callId: string }
  | { type: "call_error"; message: string }
  | { type: "webrtc_offer"; callId: string; sdp: unknown }
  | { type: "webrtc_answer"; callId: string; sdp: unknown }
  | { type: "webrtc_ice"; callId: string; candidate: unknown }
  | {
      type: "call_media_state";
      callId: string;
      micOn: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
    };

export type CallHistoryItem = {
  id: string;
  peerName: string;
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallStatusValue;
};

export type CallHistoryResponse = {
  items: CallHistoryItem[];
  nextCursor: string | null;
};
