"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const reminderProcessor_1 = require("../services/reminderProcessor");
jest.mock("web-push", () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
}));
describe("reminderProcessor service", () => {
    let userId;
    let studentId;
    beforeAll(async () => {
        process.env.VAPID_PUBLIC_KEY = "test-public-key";
        process.env.VAPID_PRIVATE_KEY = "test-private-key";
        process.env.VAPID_SUBJECT = "mailto:test@test.com";
        const user = await prisma_1.default.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: "hashed",
                name: faker_1.faker.person.fullName(),
            },
        });
        userId = user.id;
        const student = await prisma_1.default.student.create({
            data: {
                name: "Иванов Пётр",
                tutorId: userId,
            },
        });
        studentId = student.id;
    });
    beforeEach(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.pushSubscription.deleteMany({ where: { userId } });
        await prisma_1.default.reminderSettings.deleteMany({ where: { userId } });
        web_push_1.default.sendNotification.mockReset();
        web_push_1.default.sendNotification.mockResolvedValue({});
    });
    afterAll(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.pushSubscription.deleteMany({ where: { userId } });
        await prisma_1.default.reminderSettings.deleteMany({ where: { userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    it("should process PENDING reminders at scheduledAt", async () => {
        await prisma_1.default.pushSubscription.create({
            data: {
                endpoint: `https://push.example.com/${faker_1.faker.string.alphanumeric(10)}`,
                p256dh: "key",
                auth: "auth",
                userId,
            },
        });
        await prisma_1.default.reminderSettings.create({
            data: {
                userId,
                enabled: true,
                intervals: [30],
                muteWhenInLesson: false,
            },
        });
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: futureTime,
                endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
                status: "SCHEDULED",
                tutorId: userId,
                studentId,
            },
        });
        // Create a reminder that should be processed now (scheduledAt in the past)
        await prisma_1.default.scheduledReminder.create({
            data: {
                scheduledAt: new Date(Date.now() - 60 * 1000), // 1 min ago
                intervalMinutes: 30,
                lessonId: lesson.id,
                userId,
                status: "PENDING",
            },
        });
        await (0, reminderProcessor_1.processScheduledReminders)();
        expect(web_push_1.default.sendNotification).toHaveBeenCalledTimes(1);
        const reminder = await prisma_1.default.scheduledReminder.findFirst({
            where: { lessonId: lesson.id },
        });
        expect(reminder.status).toBe("SENT");
        expect(reminder.sentAt).not.toBeNull();
    });
    it("should cancel reminders for cancelled lessons", async () => {
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: futureTime,
                endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
                status: "CANCELLED",
                tutorId: userId,
                studentId,
            },
        });
        await prisma_1.default.scheduledReminder.create({
            data: {
                scheduledAt: new Date(Date.now() - 60 * 1000),
                intervalMinutes: 30,
                lessonId: lesson.id,
                userId,
                status: "PENDING",
            },
        });
        await (0, reminderProcessor_1.processScheduledReminders)();
        expect(web_push_1.default.sendNotification).not.toHaveBeenCalled();
        const reminder = await prisma_1.default.scheduledReminder.findFirst({
            where: { lessonId: lesson.id },
        });
        expect(reminder.status).toBe("CANCELLED");
    });
    it("should suppress reminders when muteWhenInLesson is enabled and user has active lesson", async () => {
        await prisma_1.default.pushSubscription.create({
            data: {
                endpoint: `https://push.example.com/${faker_1.faker.string.alphanumeric(10)}`,
                p256dh: "key",
                auth: "auth",
                userId,
            },
        });
        await prisma_1.default.reminderSettings.create({
            data: {
                userId,
                enabled: true,
                intervals: [30],
                muteWhenInLesson: true,
            },
        });
        // Create an active lesson (currently in progress)
        await prisma_1.default.lesson.create({
            data: {
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
                endTime: new Date(Date.now() + 30 * 60 * 1000), // Ends in 30 min
                status: "IN_PROGRESS",
                tutorId: userId,
                studentId,
            },
        });
        const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const upcomingLesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: futureTime,
                endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
                status: "SCHEDULED",
                tutorId: userId,
                studentId,
            },
        });
        await prisma_1.default.scheduledReminder.create({
            data: {
                scheduledAt: new Date(Date.now() - 60 * 1000),
                intervalMinutes: 30,
                lessonId: upcomingLesson.id,
                userId,
                status: "PENDING",
            },
        });
        await (0, reminderProcessor_1.processScheduledReminders)();
        expect(web_push_1.default.sendNotification).not.toHaveBeenCalled();
        const reminder = await prisma_1.default.scheduledReminder.findFirst({
            where: { lessonId: upcomingLesson.id },
        });
        expect(reminder.status).toBe("CANCELLED");
    });
    it("should not process future reminders", async () => {
        await prisma_1.default.pushSubscription.create({
            data: {
                endpoint: `https://push.example.com/${faker_1.faker.string.alphanumeric(10)}`,
                p256dh: "key",
                auth: "auth",
                userId,
            },
        });
        const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: futureTime,
                endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
                status: "SCHEDULED",
                tutorId: userId,
                studentId,
            },
        });
        await prisma_1.default.scheduledReminder.create({
            data: {
                scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
                intervalMinutes: 30,
                lessonId: lesson.id,
                userId,
                status: "PENDING",
            },
        });
        await (0, reminderProcessor_1.processScheduledReminders)();
        expect(web_push_1.default.sendNotification).not.toHaveBeenCalled();
        const reminder = await prisma_1.default.scheduledReminder.findFirst({
            where: { lessonId: lesson.id },
        });
        expect(reminder.status).toBe("PENDING");
    });
});
//# sourceMappingURL=reminderProcessor.test.js.map