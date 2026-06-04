import type { CallMediaState } from "../videoCall.types";

export type CallPhase = "idle" | "outgoing" | "incoming" | "active";

export type CallPeer = {
  id: string;
  name: string;
  role: "tutor" | "student";
};

export type IncomingCall = {
  callId: string;
  callerName: string;
};

export type CallStatusKind = "info" | "error";

export type CallStatusMessage = {
  kind: CallStatusKind;
  text: string;
} | null;

export type IceServerPayload = {
  urls: string;
  username?: string;
  credential?: string;
};

export type StartCallParams =
  | { studentId: string; peerName: string }
  | { tutorId: string; peerName: string };

export type MediaStatePayload = {
  callId: string;
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
};

export type { CallMediaState };
