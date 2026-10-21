import type { ElsewhereReason } from "./webSocket.types";

export const CALLS_ELSEWHERE_TEXT: Record<ElsewhereReason, string> = {
  tab: "Приложение открыто в другой вкладке или на другом устройстве. Нажмите «Использовать здесь», чтобы звонить отсюда",
  call: "В другой вкладке или на другом устройстве идёт звонок. Позвонить отсюда можно после его завершения",
};
