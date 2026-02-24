"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledReminders = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const pushNotification_1 = require("./pushNotification");
const processScheduledReminders = async () => {
    const now = new Date();
    // Find all PENDING reminders that should have been sent by now
    const pendingReminders = await prisma_1.default.scheduledReminder.findMany({
        where: {
            status: "PENDING",
            scheduledAt: { lte: now },
        },
        include: {
            lesson: {
                include: {
                    student: true,
                },
            },
        },
    });
    if (pendingReminders.length === 0)
        return;
    let sentCount = 0;
    let cancelledCount = 0;
    for (const reminder of pendingReminders) {
        const { lesson } = reminder;
        // Cancel if lesson is not in a schedulable status
        if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") {
            await prisma_1.default.scheduledReminder.update({
                where: { id: reminder.id },
                data: { status: "CANCELLED" },
            });
            cancelledCount++;
            continue;
        }
        // Check muteWhenInLesson
        const settings = await prisma_1.default.reminderSettings.findUnique({
            where: { userId: reminder.userId },
        });
        if (settings?.muteWhenInLesson) {
            const activeLesson = await prisma_1.default.lesson.findFirst({
                where: {
                    tutorId: reminder.userId,
                    status: "IN_PROGRESS",
                    startTime: { lte: now },
                    endTime: { gt: now },
                },
            });
            if (activeLesson) {
                // Muted — mark as cancelled since we won't retry
                await prisma_1.default.scheduledReminder.update({
                    where: { id: reminder.id },
                    data: { status: "CANCELLED" },
                });
                cancelledCount++;
                continue;
            }
        }
        // Build notification payload
        const payload = {
            title: (0, pushNotification_1.formatReminderTitle)(reminder.intervalMinutes),
            body: (0, pushNotification_1.formatReminderBody)(lesson.subject, lesson.lessonType, lesson.student.name, lesson.startTime, lesson.endTime),
            tag: `lesson-reminder-${lesson.id}-${reminder.intervalMinutes}`,
            data: {
                type: "lesson_reminder",
                lessonId: lesson.id,
                url: "/lessons",
            },
        };
        // Send push notification
        try {
            await (0, pushNotification_1.sendPushToUser)(reminder.userId, payload);
            await prisma_1.default.scheduledReminder.update({
                where: { id: reminder.id },
                data: {
                    status: "SENT",
                    sentAt: new Date(),
                },
            });
            sentCount++;
        }
        catch (error) {
            console.error(`Failed to send reminder ${reminder.id}:`, error);
        }
    }
    if (sentCount > 0 || cancelledCount > 0) {
        console.log(`Reminders processed: ${sentCount} sent, ${cancelledCount} cancelled`);
    }
};
exports.processScheduledReminders = processScheduledReminders;
//# sourceMappingURL=reminderProcessor.js.map