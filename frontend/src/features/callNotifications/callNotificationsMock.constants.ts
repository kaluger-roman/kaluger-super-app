import type { CallNotificationsStatus } from "./callNotifications.types";

// TODO(auto-feature): mockup data picked by the preview route's `?state=`; delete together with
// callNotificationsMock.* when callNotificationsModel provides the real status.
export const CALL_NOTIFICATIONS_MOCK_DEFAULT: CallNotificationsStatus = "off";

export const CALL_NOTIFICATIONS_MOCKS: Partial<Record<string, CallNotificationsStatus>> = {
  "cabinet-invite": "off",
  "cabinet-ios": "iosInstall",
  "cabinet-denied": "denied",
  "student-settings-on": "on",
  "student-settings-off": "off",
};
