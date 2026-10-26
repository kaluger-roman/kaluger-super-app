import type { CallNotificationsStatus } from "./callNotifications.types";
import {
  CALL_NOTIFICATIONS_MOCK_DEFAULT,
  CALL_NOTIFICATIONS_MOCKS,
} from "./callNotificationsMock.constants";

// TODO(auto-feature): mockup-only reader of the preview route's `?state=`; delete with the mocks.
export const getCallNotificationsStatusMock = (): CallNotificationsStatus =>
  CALL_NOTIFICATIONS_MOCKS[new URLSearchParams(window.location.search).get("state") ?? ""] ??
  CALL_NOTIFICATIONS_MOCK_DEFAULT;
