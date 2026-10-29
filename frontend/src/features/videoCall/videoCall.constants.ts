import type { CallHistoryStatus } from "@entities";

// The caller's view of a call nobody answered (callee offline or ring timeout).
export const OUTGOING_UNANSWERED_LABEL = "Без ответа";

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

// FR-032: the tutor sees why the student dropped out; the student only ever sees neutral wording.
export const RECONNECTING_TEXT = "Восстанавливаем связь…";
export const STUDENT_MINIMIZED_TEXT = "Ученик свернул приложение";
export const STUDENT_MIC_SUSPENDED_TEXT =
  "Микрофон ученика приостановлен — ученик свернул приложение";
export const PEER_AUDIO_UNAVAILABLE_TEXT = "Звук временно недоступен";

export const BACKGROUND_AUDIO_HINT_TEXT =
  "На iPhone, пока приложение свёрнуто, собеседник вас не слышит. Звонок не прервётся — просто вернитесь";

// On a short stage (landscape phone) the pills overlay the shared screen instead of framing it.
export const SHORT_STAGE_QUERY = "(max-height: 500px)";
export const SHORT_STAGE_MEDIA = `@media ${SHORT_STAGE_QUERY}`;

// The fullscreen bottom bar keeps the call buttons centred and the zoom group beside them while
// both side columns fit the group. Widths, px: bar padding 2 × 16, column gaps 2 × 12, call buttons
// 3 × 56 + 64 + 3 × 16 gaps + 2 × 12 padding = 304; zoom group 142 with an icon-only reset (+44),
// 142 with the labelled «Исходный размер» (+170).
const BAR_FRAME_WIDTH = 2 * 16 + 2 * 12 + 304;
const ZOOM_GROUP_COMPACT_WIDTH = 142 + 44;
const ZOOM_GROUP_FULL_WIDTH = 142 + 170;
const STACK_BELOW_PX = BAR_FRAME_WIDTH + 2 * ZOOM_GROUP_COMPACT_WIDTH;
const COMPACT_BELOW_PX = BAR_FRAME_WIDTH + 2 * ZOOM_GROUP_FULL_WIDTH;
export const STACKED_BAR_MEDIA = `@media (max-width: ${STACK_BELOW_PX - 0.05}px)`;
// Between the two widths the group sits beside the buttons with an icon-only reset; stacked on
// its own row it has room for the label again.
export const COMPACT_ZOOM_MEDIA = `@media (min-width: ${STACK_BELOW_PX}px) and (max-width: ${COMPACT_BELOW_PX - 0.05}px)`;

export const TAP_MAX_DURATION_MS = 250;
export const DOUBLE_TAP_INTERVAL_MS = 300;

export const CALL_CONTROLS_ATTR = "data-call-controls";
export const CALL_CONTROLS_SELECTOR = `[${CALL_CONTROLS_ATTR}]`;
