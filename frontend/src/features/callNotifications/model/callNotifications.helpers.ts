import { isAxiosError } from "axios";

import type { PushPermissionState } from "@entities";
import { isInStandaloneMode, isIos } from "@shared";

import { INVITE_DISMISSED_KEY, INVITE_DISMISSED_VALUE } from "./callNotifications.constants";
import type {
  CallNotificationsState,
  InstallInstructionState,
  NotificationEnvironment,
} from "./callNotifications.types";
import type { CallNotificationsStatus } from "../callNotifications.types";

const readPermission = (): PushPermissionState =>
  "Notification" in window ? (Notification.permission as PushPermissionState) : "default";

export const readNotificationEnvironment = (): NotificationEnvironment => ({
  isIos: isIos(),
  standalone: isInStandaloneMode(),
  pushSupported:
    "PushManager" in window && "Notification" in window && "serviceWorker" in navigator,
  permission: readPermission(),
});

// iPhone outside the installed app has no PushManager at all, so the install instruction wins
// over "unsupported"; without server keys nothing about notifications is shown (FR-025).
export const toCallNotificationsStatus = ({
  vapidConfigured,
  environment,
  permission,
  subscribed,
}: CallNotificationsState): CallNotificationsStatus | null => {
  if (vapidConfigured === null || environment === null) return null;
  if (!vapidConfigured) return "unsupported";
  if (environment.isIos && !environment.standalone) return "iosInstall";
  if (!environment.pushSupported) return "unsupported";
  if (permission === "denied") return "denied";
  return subscribed && permission === "granted" ? "on" : "off";
};

// Enabled or unsupported (US4-5) devices get no invite.
const isInviteStatus = (status: CallNotificationsStatus): boolean =>
  status === "off" || status === "iosInstall" || status === "denied";

export const isInviteVisible = (
  status: CallNotificationsStatus | null,
  dismissed: boolean
): boolean => !dismissed && status !== null && isInviteStatus(status);

// The settings section shows the instruction whatever the invite card does.
export const isInstallInstructionVisible = ({
  status,
  inviteShown,
  inviteCardOpen,
  settingsSectionOpen,
}: InstallInstructionState): boolean =>
  status === "iosInstall" && ((inviteCardOpen && inviteShown) || settingsSectionOpen);

export const isNotFoundError = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 404;

// Storage may be off (private mode, blocked site data): the invite then comes back next time.
export const readInviteDismissed = (): boolean => {
  try {
    return localStorage.getItem(INVITE_DISMISSED_KEY) === INVITE_DISMISSED_VALUE;
  } catch {
    return false;
  }
};

export const writeInviteDismissed = (): void => {
  try {
    localStorage.setItem(INVITE_DISMISSED_KEY, INVITE_DISMISSED_VALUE);
  } catch {
    // Hidden until the page reloads.
  }
};

export const isRegistration = (
  registration: ServiceWorkerRegistration | null
): registration is ServiceWorkerRegistration => registration !== null;
