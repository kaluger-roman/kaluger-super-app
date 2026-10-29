import type { CardTone } from "./CallNotificationsCard.types";
import type { CallNotificationsStatus } from "../../callNotifications.types";

export const getCardTone = (status: CallNotificationsStatus): CardTone =>
  status === "denied" ? "warning" : "primary";
