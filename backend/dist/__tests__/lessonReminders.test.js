"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const faker_1 = require("@faker-js/faker");
const index_1 = require("../index");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../utils/auth");
jest.mock("../lib/wsManager", () => ({
    getWebSocketManager: jest.fn(() => ({
        broadcastLessonStatusUpdate: jest.fn(),
    })),
}));
describe("lesson reminder side-effects", () => {
    let authToken;
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
        authToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
        const student = await prisma_1.default.student.create({
            data: {
                name: faker_1.faker.person.fullName(),
                tutorId: userId,
            },
        });
        studentId = student.id;
        // Create reminder settings
        await prisma_1.default.reminderSettings.create({
            data: {
                userId,
                enabled: true,
                intervals: [5, 30],
                muteWhenInLesson: false,
            },
        });
    });
    beforeEach(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
    });
    afterAll(async () => {
        await prisma_1.default.scheduledReminder.deleteMany({ where: { userId } });
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.reminderSettings.deleteMany({ where: { userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    describe("POST /api/lessons (createLesson)", () => {
        it("should create reminders for a new scheduled lesson", async () => {
            const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/lessons")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: futureTime.toISOString(),
                endTime: new Date(futureTime.getTime() + 60 * 60 * 1000).toISOString(),
                studentId,
            })
                .expect(201);
            // Wait for async reminder creation
            await new Promise((resolve) => setTimeout(resolve, 200));
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: res.body.lesson.id, status: "PENDING" },
            });
            expect(reminders.length).toBeGreaterThanOrEqual(1);
        });
    });
    describe("PUT /api/lessons/:id (updateLesson)", () => {
        it("should recalculate reminders when lesson time changes", async () => {
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
            // Create old reminders
            await prisma_1.default.scheduledReminder.create({
                data: {
                    scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
                    intervalMinutes: 30,
                    lessonId: lesson.id,
                    userId,
                    status: "PENDING",
                },
            });
            const newStartTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
            await (0, supertest_1.default)(index_1.app)
                .put(`/api/lessons/${lesson.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                startTime: newStartTime.toISOString(),
                endTime: new Date(newStartTime.getTime() + 60 * 60 * 1000).toISOString(),
            })
                .expect(200);
            const reminders = await prisma_1.default.scheduledReminder.findMany({
                where: { lessonId: lesson.id },
            });
            const cancelled = reminders.filter((r) => r.status === "CANCELLED");
            const pending = reminders.filter((r) => r.status === "PENDING");
            expect(cancelled.length).toBeGreaterThanOrEqual(1);
            expect(pending.length).toBeGreaterThanOrEqual(1);
        });
        it("should cancel reminders when lesson is cancelled", async () => {
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
                    scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
                    intervalMinutes: 30,
                    lessonId: lesson.id,
                    userId,
                    status: "PENDING",
                },
            });
            await (0, supertest_1.default)(index_1.app)
                .put(`/api/lessons/${lesson.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ status: "CANCELLED" })
                .expect(200);
            const pendingCount = await prisma_1.default.scheduledReminder.count({
                where: { lessonId: lesson.id, status: "PENDING" },
            });
            expect(pendingCount).toBe(0);
        });
    });
});
//# sourceMappingURL=lessonReminders.test.js.map