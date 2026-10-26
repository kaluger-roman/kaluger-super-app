import type { Subject } from "@shared";

export type CallHistoryPrincipal = "tutor" | "student";

export type CallHistoryDirection = "outgoing" | "incoming";

export type CallHistoryStatus = "COMPLETED" | "MISSED" | "REJECTED" | "CANCELED" | "FAILED";

export type CallLessonSummary = {
  id: string;
  subject: Subject;
  startTime: string;
  endTime: string;
};

export type CallHistoryRecord = {
  id: string;
  peerName: string;
  direction: CallHistoryDirection;
  startedAt: string;
  durationSeconds: number | null;
  status: CallHistoryStatus;
  lesson: CallLessonSummary | null;
};

export type CallHistoryRequest = {
  principal: CallHistoryPrincipal;
  version: number;
};

export type LessonCallsRequest = {
  lessonId: string;
  version: number;
};

export type CallHistoryResponse = {
  items: CallHistoryRecord[];
};
