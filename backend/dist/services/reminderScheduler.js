"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAllPendingReminders = exports.recalculateRemindersForUser = exports.cancelRemindersForLesson = exports.scheduleRemindersForLesson = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const scheduleRemindersForLesson = async (lessonId) => {
    const lesson = await prisma_1.default.lesson.findUnique({
        where: { id: lessonId },
    });
    if (!lesson)
        return;
    // Only schedule for SCHEDULED or RESCHEDULED lessons
    if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED")
        return;
    const settings = await prisma_1.default.reminderSettings.findUnique({
        where: { userId: lesson.tutorId },
    });
    if (!settings || !settings.enabled || settings.intervals.length === 0)
        return;
    const now = new Date();
    const reminders = [];
    for (const interval of settings.intervals) {
        const scheduledAt = new Date(lesson.startTime.getTime() - interval * 60 * 1000);
        // Skip if scheduledAt is in the past
        if (scheduledAt <= now)
            continue;
        reminders.push({
            scheduledAt,
            intervalMinutes: interval,
            lessonId: lesson.id,
            userId: lesson.tutorId,
        });
    }
    if (reminders.length > 0) {
        await prisma_1.default.scheduledReminder.createMany({
            data: reminders,
        });
    }
};
exports.scheduleRemindersForLesson = scheduleRemindersForLesson;
const cancelRemindersForLesson = async (lessonId) => {
    await prisma_1.default.scheduledReminder.updateMany({
        where: {
            lessonId,
            status: "PENDING",
        },
        data: {
            status: "CANCELLED",
        },
    });
};
exports.cancelRemindersForLesson = cancelRemindersForLesson;
const recalculateRemindersForUser = async (userId) => {
    // Cancel all pending reminders
    await prisma_1.default.scheduledReminder.updateMany({
        where: {
            userId,
            status: "PENDING",
        },
        data: {
            status: "CANCELLED",
        },
    });
    // Get user settings
    const settings = await prisma_1.default.reminderSettings.findUnique({
        where: { userId },
    });
    if (!settings || !settings.enabled || settings.intervals.length === 0)
        return;
    // Get all future lessons with schedulable statuses
    const now = new Date();
    const futureLessons = await prisma_1.default.lesson.findMany({
        where: {
            tutorId: userId,
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
            startTime: { gt: now },
        },
    });
    const reminders = [];
    for (const lesson of futureLessons) {
        for (const interval of settings.intervals) {
            const scheduledAt = new Date(lesson.startTime.getTime() - interval * 60 * 1000);
            // Skip if scheduledAt is in the past
            if (scheduledAt <= now)
                continue;
            reminders.push({
                scheduledAt,
                intervalMinutes: interval,
                lessonId: lesson.id,
                userId,
            });
        }
    }
    if (reminders.length > 0) {
        await prisma_1.default.scheduledReminder.createMany({
            data: reminders,
        });
    }
};
exports.recalculateRemindersForUser = recalculateRemindersForUser;
const cancelAllPendingReminders = async (userId) => {
    await prisma_1.default.scheduledReminder.updateMany({
        where: {
            userId,
            status: "PENDING",
        },
        data: {
            status: "CANCELLED",
        },
    });
};
exports.cancelAllPendingReminders = cancelAllPendingReminders;
//# sourceMappingURL=reminderScheduler.js.map