import type { CallHistoryStatus } from "@entities";

export const CALL_STATUS_LABELS: Record<CallHistoryStatus, string> = {
  completed: "Завершён",
  missed: "Пропущен",
  rejected: "Отклонён",
  canceled: "Отменён",
  failed: "Не удалось соединиться",
};
