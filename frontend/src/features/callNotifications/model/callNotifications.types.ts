import type { PushPermissionState } from "@entities";

import type { CallNotificationsStatus } from "../callNotifications.types";

export type NotificationEnvironment = {
  isIos: boolean;
  standalone: boolean;
  pushSupported: boolean;
  permission: PushPermissionState;
};

export type CallNotificationsState = {
  // null while the server's push keys are still loading.
  vapidConfigured: boolean | null;
  // null until the cabinet read the device.
  environment: NotificationEnvironment | null;
  permission: PushPermissionState;
  subscribed: boolean;
};

export type EnableResult = {
  permission: PushPermissionState;
  subscribed: boolean;
};

export type InstallInstructionState = {
  status: CallNotificationsStatus | null;
  inviteShown: boolean;
  inviteCardOpen: boolean;
  settingsSectionOpen: boolean;
};
