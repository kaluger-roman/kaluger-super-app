import type { CallStatus } from "@prisma/client";
import type { CallStatusValue } from "../../types";

export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 100;

export const STATUS_TO_VALUE: Record<CallStatus, CallStatusValue> = {
  COMPLETED: "completed",
  MISSED: "missed",
  REJECTED: "rejected",
  CANCELED: "canceled",
  FAILED: "failed",
};

export const CALL_RECORD_WITH_PEER = {
  include: { student: { select: { name: true } }, tutor: { select: { name: true } } },
} as const;
