// The app opened from an incoming call notification: `?call=<callId>` (contracts/call-notification-push.md).
export const CALL_ID_QUERY_PARAM = "call";
// Every notification of one call carries the tag `call-<callId>` (contracts/call-notification-push.md).
export const CALL_NOTIFICATION_TAG_PREFIX = "call-";
// What the service worker posts to an open app when its incoming call notification is tapped.
export const CALL_NOTIFICATION_OPENED_MESSAGE = "call_notification_opened";
// What the service worker posts to the open app once it shows an incoming call notification.
export const CALL_NOTIFICATION_SHOWN_MESSAGE = "call_notification_shown";
