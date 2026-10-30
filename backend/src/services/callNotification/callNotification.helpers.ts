import { createHash } from "crypto";
import type { CallerKindValue, WebPushOptions } from "../../types";
import {
  CALL_CLOSED_BODY,
  CALL_ID_QUERY_PARAM,
  CALL_PUSH_OPTIONS,
  CALL_PUSH_PATHS,
  CALL_PUSH_TITLES,
  CALL_TAG_PREFIX,
  MISSED_CALL_BODY_PREFIX,
  PUSH_TOPIC_LENGTH,
} from "./callNotification.constants";
import type {
  CallNotificationKind,
  CallNotificationMessage,
  CallPushPayload,
} from "./callNotification.types";

export const toTopic = (callId: string): string =>
  createHash("sha256").update(callId).digest("base64url").slice(0, PUSH_TOPIC_LENGTH);

// Only the incoming call opens straight onto the call; the others lead to where the call is seen.
export const toCallUrl = (
  kind: CallerKindValue,
  type: CallNotificationKind,
  callId: string
): string => {
  const path = CALL_PUSH_PATHS[kind][type];
  return type === "incoming_call"
    ? `${path}?${CALL_ID_QUERY_PARAM}=${encodeURIComponent(callId)}`
    : path;
};

const toBody = ({ kind, callerName }: CallNotificationMessage): string => {
  if (kind === "incoming_call") return callerName;
  if (kind === "missed_call") return `${MISSED_CALL_BODY_PREFIX} ${callerName}`;
  return CALL_CLOSED_BODY;
};

// Every notification of one call shares the tag, so each replaces the previous one (FR-016).
export const toWebPushPayload = (message: CallNotificationMessage): CallPushPayload => ({
  title: CALL_PUSH_TITLES[message.kind],
  body: toBody(message),
  tag: `${CALL_TAG_PREFIX}${message.callId}`,
  data: {
    type: message.kind,
    callId: message.callId,
    url: toCallUrl(message.recipientKind, message.kind, message.callId),
  },
});

export const toWebPushOptions = ({ kind, callId }: CallNotificationMessage): WebPushOptions => ({
  ...CALL_PUSH_OPTIONS[kind],
  topic: toTopic(callId),
});
