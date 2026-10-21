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

// Added to theme.zIndex.modal: the app's blocking spinner sits at modal + 1 and must never cover
// a call; snackbars (theme.zIndex.snackbar) stay above it.
export const CALL_LAYER_Z_INDEX_OFFSET = 2;
