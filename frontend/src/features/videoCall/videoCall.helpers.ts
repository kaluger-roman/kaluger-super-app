import type { CallHistoryDirection, CallHistoryStatus } from "@entities";

import { CALL_STATUS_LABELS } from "./videoCall.constants";

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const formatCallDuration = (seconds: number | null): string => {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const paddedSeconds = rest.toString().padStart(2, "0");
  if (minutes < 60) {
    return `${minutes}:${paddedSeconds}`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${restMinutes}:${paddedSeconds}`;
};

export const getCallStatusLabel = (status: CallHistoryStatus): string => CALL_STATUS_LABELS[status];

export const getCallDirectionLabel = (direction: CallHistoryDirection): string =>
  direction === "outgoing" ? "Исходящий" : "Входящий";
