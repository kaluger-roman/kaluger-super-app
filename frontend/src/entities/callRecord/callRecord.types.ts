export type CallHistoryPrincipal = "tutor" | "student";

export type CallHistoryDirection = "outgoing" | "incoming";

export type CallHistoryStatus = "COMPLETED" | "MISSED" | "REJECTED" | "CANCELED" | "FAILED";

export type CallHistoryRecord = {
  id: string;
  peerName: string;
  direction: CallHistoryDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallHistoryStatus;
};

export type CallHistoryRequest = {
  principal: CallHistoryPrincipal;
  version: number;
};

export type CallHistoryResponse = {
  items: CallHistoryRecord[];
};
