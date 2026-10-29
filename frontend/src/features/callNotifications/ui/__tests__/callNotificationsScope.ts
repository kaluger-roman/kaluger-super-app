import { fork } from "effector";

import { notificationsModel } from "@entities";
import type { PushPermissionState } from "@entities";

import type { CallNotificationsStatus } from "../../callNotifications.types";
import { callNotificationsModel } from "../../model";

const permissionOf = (status: CallNotificationsStatus): PushPermissionState => {
  if (status === "denied") return "denied";
  return status === "on" ? "granted" : "default";
};

// A cabinet scope whose stores add up to the given status.
export const scopeWithStatus = (status: CallNotificationsStatus, inviteDismissed = false) =>
  fork({
    values: [
      [notificationsModel.$vapidKey, status === "unsupported" ? null : "key"],
      [callNotificationsModel.$isVapidKeyLoaded, true],
      [
        callNotificationsModel.$environment,
        {
          isIos: status === "iosInstall",
          standalone: false,
          pushSupported: true,
          permission: permissionOf(status),
        },
      ],
      [callNotificationsModel.$permission, permissionOf(status)],
      [callNotificationsModel.$isSubscribed, status === "on"],
      [callNotificationsModel.$isInviteDismissed, inviteDismissed],
    ],
  });
