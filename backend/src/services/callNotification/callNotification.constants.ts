import type { CallerKindValue, WebPushOptions } from "../../types";
import type { CallNotificationKind } from "./callNotification.types";

export const CALL_PUSH_TITLES: Record<CallNotificationKind, string> = {
  incoming_call: "Входящий видеозвонок",
  missed_call: "Пропущенный звонок",
  call_closed: "Вызов завершён",
};

export const MISSED_CALL_BODY_PREFIX = "Пропущенный звонок от";
export const CALL_CLOSED_BODY = "Звонок принят или отклонён на другом устройстве";

// An incoming call lives as long as it rings (40 s); a newer push of the same call replaces an
// undelivered older one through the topic.
export const CALL_PUSH_OPTIONS: Record<CallNotificationKind, Omit<WebPushOptions, "topic">> = {
  incoming_call: { TTL: 40, urgency: "high" },
  missed_call: { TTL: 24 * 60 * 60, urgency: "normal" },
  call_closed: { TTL: 60, urgency: "normal" },
};

export const CALL_PUSH_PATHS: Record<CallerKindValue, Record<CallNotificationKind, string>> = {
  tutor: {
    incoming_call: "/dashboard",
    missed_call: "/call/history",
    call_closed: "/dashboard",
  },
  student: {
    incoming_call: "/student/cabinet/schedule",
    missed_call: "/student/cabinet/calls",
    call_closed: "/student/cabinet/schedule",
  },
};

export const CALL_ID_QUERY_PARAM = "call";
export const CALL_TAG_PREFIX = "call-";
// Web Push allows a topic of up to 32 URL-safe base64 characters.
export const PUSH_TOPIC_LENGTH = 32;
