import type { CallNotificationsStatus } from "../../callNotifications.types";

// Outside the installed iPhone app or after a refusal the switch could not subscribe anyway.
export const isSwitchLocked = (status: CallNotificationsStatus): boolean =>
  status === "iosInstall" || status === "denied";
