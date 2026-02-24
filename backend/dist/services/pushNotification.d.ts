import type { PushNotificationPayload } from "../types";
export declare const sendPushToUser: (userId: string, payload: PushNotificationPayload) => Promise<{
    sent: number;
    failed: number;
}>;
export declare const formatReminderTitle: (intervalMinutes: number) => string;
export declare const formatReminderBody: (subject: string, lessonType: string, studentName: string, startTime: Date, endTime: Date) => string;
//# sourceMappingURL=pushNotification.d.ts.map