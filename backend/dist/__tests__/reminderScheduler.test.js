"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const prisma_1 = __importDefault(require("../lib/prisma"));
const reminderScheduler_1 = require("../services/reminderScheduler");
describe("reminderScheduler service", () => {
    let userId;
    let studentId;
    beforeAll(async () => {
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
                name: faker_1.faker.person.fullName(),
                tutorId: userId,
            },
        });
        studentId = student.id;
    });
    beforeEach(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.reminderSettings.deleteMany({ where: { userId } });
    });
    afterAll(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.reminderSettings.deleteMany({ where: { userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    describe("scheduleRemindersForLesson", () => {
        it("should create reminders for each interval in user settings", async () => {
            await prisma_1.default.reminderSettings.create({
                data: {
                    userId,
                    enabled: true,
                    intervals: [5, 30],
                    muteWhenInLesson: false,
                },
            });
            const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
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
            await (0, reminderScheduler_1.scheduleRemindersForLesson)(lesson.id);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
                orderBy: { intervalMinutes: "asc" },
            });
            expect(reminders).toHaveLength(2);
            expect(reminders[0].intervalMinutes).toBe(5);
            expect(reminders[1].intervalMinutes).toBe(30);
            expect(reminders[0].status).toBe("PENDING");
            expect(reminders[1].status).toBe("PENDING");
        });
        it("should skip past scheduledAt times", async () => {
            await prisma_1.default.reminderSettings.create({
                data: {
                    userId,
                    enabled: true,
                    intervals: [5, 60], // 60 min before = past for a lesson 30 min from now
                    muteWhenInLesson: false,
                },
            });
            const soon = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
            const lesson = await prisma_1.default.lesson.create({
                data: {
                    subject: "MATHEMATICS",
                    lessonType: "SCHOOL",
                    startTime: soon,
                    endTime: new Date(soon.getTime() + 60 * 60 * 1000),
                    status: "SCHEDULED",
                    tutorId: userId,
                    studentId,
                },
            });
            await (0, reminderScheduler_1.scheduleRemindersForLesson)(lesson.id);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
            });
            // Only the 5-minute reminder should be created, not the 60-minute one
            expect(reminders).toHaveLength(1);
            expect(reminders[0].intervalMinutes).toBe(5);
        });
        it("should not create reminders when settings are disabled", async () => {
            await prisma_1.default.reminderSettings.create({
                data: {
                    userId,
                    enabled: false,
                    intervals: [5, 30],
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
            await (0, reminderScheduler_1.scheduleRemindersForLesson)(lesson.id);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
            });
            expect(reminders).toHaveLength(0);
        });
        it("should not create reminders for cancelled lessons", async () => {
            await prisma_1.default.reminderSettings.create({
                data: {
                    userId,
                    enabled: true,
                    intervals: [5, 30],
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
                    status: "CANCELLED",
                    tutorId: userId,
                    studentId,
                },
            });
            await (0, reminderScheduler_1.scheduleRemindersForLesson)(lesson.id);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
            });
            expect(reminders).toHaveLength(0);
        });
    });
    describe("cancelRemindersForLesson", () => {
        it("should set PENDING reminders to CANCELLED", async () => {
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
            await prisma_1.default.scheduledReminder.createMany({
                data: [
                    {
                        scheduledAt: new Date(futureTime.getTime() - 5 * 60 * 1000),
                        intervalMinutes: 5,
                        lessonId: lesson.id,
                        userId,
                        status: "PENDING",
                    },
                    {
                        scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
                        intervalMinutes: 30,
                        lessonId: lesson.id,
                        userId,
                        status: "SENT",
                    },
                ],
            });
            await (0, reminderScheduler_1.cancelRemindersForLesson)(lesson.id);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
            });
            const pending = reminders.filter((r) => r.status === "PENDING");
            const cancelled = reminders.filter((r) => r.status === "CANCELLED");
            const sent = reminders.filter((r) => r.status === "SENT");
            expect(pending).toHaveLength(0);
            expect(cancelled).toHaveLength(1);
            expect(sent).toHaveLength(1); // SENT should not be changed
        });
    });
    describe("recalculateRemindersForUser", () => {
        it("should cancel existing and recreate reminders for future lessons", async () => {
            await prisma_1.default.reminderSettings.create({
                data: {
                    userId,
                    enabled: true,
                    intervals: [10, 30],
                    muteWhenInLesson: false,
                },
            });
            const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
            const lesson = await prisma_1.default.lesson.create({
                data: {
                    subject: "PHYSICS",
                    lessonType: "OGE",
                    startTime: futureTime,
                    endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
                    status: "SCHEDULED",
                    tutorId: userId,
                    studentId,
                },
            });
            // Create old reminders with different intervals
            await prisma_1.default.scheduledReminder.create({
                data: {
                    scheduledAt: new Date(futureTime.getTime() - 5 * 60 * 1000),
                    intervalMinutes: 5,
                    lessonId: lesson.id,
                    userId,
                    status: "PENDING",
                },
            });
            await (0, reminderScheduler_1.recalculateRemindersForUser)(userId);
            const allReminders = await prisma_1.default.scheduledReminder.findMany({
                where: { userId },
                orderBy: { intervalMinutes: "asc" },
            });
            const pending = allReminders.filter((r) => r.status === "PENDING");
            const cancelled = allReminders.filter((r) => r.status === "CANCELLED");
            expect(cancelled).toHaveLength(1); // Old 5-min reminder cancelled
            expect(pending).toHaveLength(2); // New 10-min and 30-min reminders
            expect(pending[0].intervalMinutes).toBe(10);
            expect(pending[1].intervalMinutes).toBe(30);
        });
    });
    describe("cancelAllPendingReminders", () => {
        it("should cancel all pending reminders for user", async () => {
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
            await prisma_1.default.scheduledReminder.createMany({
                data: [
                    {
                        scheduledAt: new Date(futureTime.getTime() - 5 * 60 * 1000),
                        intervalMinutes: 5,
                        lessonId: lesson.id,
                        userId,
                        status: "PENDING",
                    },
                    {
                        scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
                        intervalMinutes: 30,
                        lessonId: lesson.id,
                        userId,
                        status: "PENDING",
                    },
                ],
            });
            await (0, reminderScheduler_1.cancelAllPendingReminders)(userId);
            const pendingCount = await prisma_1.default.scheduledReminder.count({
                where: { userId, status: "PENDING" },
            });
            expect(pendingCount).toBe(0);
        });
    });
});
//# sourceMappingURL=reminderScheduler.test.js.map