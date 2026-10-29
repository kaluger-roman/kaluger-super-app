import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import {
  notificationsModel,
  removeDevice,
  studentUserModel,
  subscribeDevice,
  syncDevice,
} from "@entities";
import type { PushPermissionState, SubscribePushParams } from "@entities";
import { showNotification, studentPushApi } from "@shared";

import { DISABLE_FAILED_TEXT, ENABLE_FAILED_TEXT } from "./callNotifications.constants";
import {
  isInstallInstructionVisible,
  isInviteVisible,
  isNotFoundError,
  isRegistration,
  readInviteDismissed,
  readNotificationEnvironment,
  toCallNotificationsStatus,
  writeInviteDismissed,
} from "./callNotifications.helpers";
import type { EnableResult, NotificationEnvironment } from "./callNotifications.types";

// Mounted by the cabinet pages that show the invite card or the settings switch.
export const CabinetGate = createGate();
// Mounted with the card and the section themselves: the app's install banner steps aside while
// either of them shows the install instruction.
export const InviteCardGate = createGate();
export const SettingsSectionGate = createGate();

export const $environment = createStore<NotificationEnvironment | null>(null);
export const $permission = createStore<PushPermissionState>("default");
export const $isSubscribed = createStore(false);
export const $isVapidKeyLoaded = createStore(false);
// Hidden until the device's choice is read, so a dismissed invite never flashes.
export const $isInviteDismissed = createStore(true);

const $cabinetRegistration = combine(
  CabinetGate.status,
  notificationsModel.$serviceWorkerRegistration,
  (isOpen, registration) => (isOpen ? registration : null)
);

const $enableParams = combine(
  notificationsModel.$serviceWorkerRegistration,
  notificationsModel.$vapidKey,
  (registration, vapidKey): SubscribePushParams | null =>
    registration !== null && vapidKey !== null ? { registration, vapidKey } : null
);

const $vapidConfigured = combine(
  notificationsModel.$vapidKey,
  $isVapidKeyLoaded,
  (key, loaded): boolean | null => (key !== null ? true : loaded ? false : null)
);

export const $status = combine(
  {
    vapidConfigured: $vapidConfigured,
    environment: $environment,
    permission: $permission,
    subscribed: $isSubscribed,
  },
  toCallNotificationsStatus
);

export const $isInviteShown = combine($status, $isInviteDismissed, isInviteVisible);

export const $isInstallInstructionShown = combine(
  {
    status: $status,
    inviteShown: $isInviteShown,
    inviteCardOpen: InviteCardGate.status,
    settingsSectionOpen: SettingsSectionGate.status,
  },
  isInstallInstructionVisible
);

export const enableClicked = createEvent();
export const toggled = createEvent();
export const inviteDismissed = createEvent();

const readEnvironmentFx = createEffect(readNotificationEnvironment);
const readInviteDismissedFx = createEffect(readInviteDismissed);
const writeInviteDismissedFx = createEffect(writeInviteDismissed);

export const syncSubscriptionFx = createEffect(
  async (registration: ServiceWorkerRegistration): Promise<boolean> =>
    Notification.permission === "granted" && syncDevice(registration, studentPushApi.subscribe)
);

export const enableFx = createEffect(async (params: SubscribePushParams): Promise<EnableResult> => {
  const permission = await subscribeDevice(params, studentPushApi.subscribe);
  return { permission, subscribed: permission === "granted" };
});

// A device the server already forgot is still turned off on this side.
export const disableFx = createEffect((registration: ServiceWorkerRegistration) =>
  removeDevice(registration, studentPushApi.unsubscribe, isNotFoundError)
);

sample({ clock: CabinetGate.open, target: [readEnvironmentFx, readInviteDismissedFx] });
sample({ clock: readEnvironmentFx.doneData, target: $environment });
sample({
  clock: readEnvironmentFx.doneData,
  fn: ({ permission }) => permission,
  target: $permission,
});
sample({ clock: readInviteDismissedFx.doneData, target: $isInviteDismissed });

sample({
  clock: notificationsModel.loadVapidKeyFx.finally,
  fn: () => true,
  target: $isVapidKeyLoaded,
});

sample({
  clock: [CabinetGate.open, notificationsModel.$serviceWorkerRegistration.updates],
  source: $cabinetRegistration,
  filter: isRegistration,
  target: syncSubscriptionFx,
});
sample({ clock: syncSubscriptionFx.doneData, target: $isSubscribed });
sample({ clock: syncSubscriptionFx.fail, fn: () => false, target: $isSubscribed });

const enableAllowed = sample({
  clock: enableClicked,
  source: enableFx.pending,
  filter: (pending) => !pending,
});
sample({
  clock: enableAllowed,
  source: $enableParams,
  filter: (params): params is SubscribePushParams => params !== null,
  target: enableFx,
});
sample({ clock: enableFx.doneData, fn: ({ permission }) => permission, target: $permission });
sample({ clock: enableFx.doneData, fn: ({ subscribed }) => subscribed, target: $isSubscribed });
// The permission may have changed before the server request failed.
sample({ clock: enableFx.fail, fn: () => undefined, target: readEnvironmentFx });
sample({
  clock: enableFx.fail,
  fn: () => ({ message: ENABLE_FAILED_TEXT, type: "error" as const }),
  target: showNotification,
});

sample({
  clock: toggled,
  source: $status,
  filter: (status) => status === "off",
  fn: () => undefined,
  target: enableClicked,
});
const disableAllowed = sample({
  clock: toggled,
  source: { status: $status, pending: disableFx.pending },
  filter: ({ status, pending }) => !pending && status === "on",
});
sample({
  clock: disableAllowed,
  source: notificationsModel.$serviceWorkerRegistration,
  filter: isRegistration,
  target: disableFx,
});
sample({ clock: disableFx.done, fn: () => false, target: $isSubscribed });
sample({
  clock: disableFx.fail,
  fn: () => ({ message: DISABLE_FAILED_TEXT, type: "error" as const }),
  target: showNotification,
});

sample({ clock: inviteDismissed, fn: () => true, target: $isInviteDismissed });
sample({ clock: inviteDismissed, target: writeInviteDismissedFx });

sample({ clock: studentUserModel.studentLoggedOut, fn: () => false, target: $isSubscribed });
