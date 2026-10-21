import type { CallHistoryStatus } from "@entities";

export const CALL_STATUS_LABELS: Record<CallHistoryStatus, string> = {
  COMPLETED: "Завершён",
  MISSED: "Пропущен",
  REJECTED: "Отклонён",
  CANCELED: "Отменён",
  FAILED: "Не удалось соединиться",
};

export const CALL_SCREEN_BACKGROUND =
  "radial-gradient(circle at 50% 25%, #0d2417 0%, #050d08 100%)";

export const CONNECTING_TEXT = "Соединение…";
