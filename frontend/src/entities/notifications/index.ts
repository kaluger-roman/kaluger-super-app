import "./notificationsToggle.model";
import "./callNotificationsToggle.model";

export * as notificationsModel from "./notifications.model";
export { removeDevice, subscribeDevice, syncDevice } from "./notifications.helpers";
export type {
  ReminderSettings,
  PushPermissionState,
  SubscribePushParams,
} from "./notifications.types";
