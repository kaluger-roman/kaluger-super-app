import type { CardTone } from "./CallNotificationsCard.types";
import type { CallNotificationsStatus } from "../../callNotifications.types";

// Enabled or unsupported (US4-5) devices get no invite.
export const isInviteShown = (status: CallNotificationsStatus): boolean =>
  status === "off" || status === "iosInstall" || status === "denied";

export const getCardTone = (status: CallNotificationsStatus): CardTone =>
  status === "denied" ? "warning" : "primary";
