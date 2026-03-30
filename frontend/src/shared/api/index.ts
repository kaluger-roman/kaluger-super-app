export { adminApiMethods } from "./admin";
export { authApi } from "./auth";
export { studentsApi } from "./students";
export { lessonsApi } from "./lessons";
export { statisticsApi } from "./statistics";
export { newsApi } from "./news";
export { notificationsApi } from "./notifications";
export { api } from "./base";

export type { LessonsBySubject, LessonsByType, StudentStatistics } from "./statistics";
export type {
  VapidKeyResponse,
  PushSubscriptionInfo,
  ReminderSettingsResponse,
  UpdateReminderSettingsRequest,
  SubscribeRequest,
} from "./notifications.types";
export type {
  AdminOverviewResponse,
  BackupSettingsData,
  BackupFileData,
  BackupSettingsFullResponse,
} from "./admin.types";
