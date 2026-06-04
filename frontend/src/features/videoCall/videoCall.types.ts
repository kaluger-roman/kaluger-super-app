export type CallDirection = "outgoing" | "incoming";

export type CallStatus = "completed" | "missed" | "rejected" | "canceled" | "failed";

export type CallMediaState = {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
};

export type CallHistoryRecord = {
  id: string;
  peerName: string;
  direction: CallDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallStatus;
};
