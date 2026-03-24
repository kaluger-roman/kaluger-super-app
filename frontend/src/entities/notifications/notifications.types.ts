export type ReminderSettings = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
};

export type PushPermissionState = "default" | "granted" | "denied";
