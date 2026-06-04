export type CallHistoryDirection = "outgoing" | "incoming";

export type CallHistoryStatus =
  | "completed"
  | "missed"
  | "rejected"
  | "canceled"
  | "failed";

export type CallHistoryRecord = {
  id: string;
  peerName: string;
  direction: CallHistoryDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallHistoryStatus;
};

export type CallHistoryResponse = {
  items: CallHistoryRecord[];
  nextCursor: string | null;
};
