"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../lib/prisma"));
const wsManager_1 = require("../../lib/wsManager");
const lessonStatusUpdater_1 = require("../lessonStatusUpdater");
const time_1 = require("../../utils/time");
jest.mock("../../lib/wsManager");
describe("updateLessonStatuses", () => {
    const mockedGetWs = wsManager_1.getWebSocketManager;
    let createdUserIds = [];
    beforeAll(async () => {
        // Ensure DB connection is ready
        await prisma_1.default.$connect();
    });
    afterAll(async () => {
        await prisma_1.default.$disconnect();
    });
    afterEach(async () => {
        // Clean up lessons, students and users created during tests
        if (createdUserIds.length > 0) {
            await prisma_1.default.lesson.deleteMany({
                where: { tutorId: { in: createdUserIds } },
            });
            await prisma_1.default.student.deleteMany({
                where: { tutorId: { in: createdUserIds } },
            });
            await prisma_1.default.user.deleteMany({ where: { id: { in: createdUserIds } } });
            createdUserIds = [];
        }
        jest.clearAllMocks();
    });
    it("should move SCHEDULED lesson to IN_PROGRESS and broadcast", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        // Create test user and student
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+inprogress+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student = await prisma_1.default.student.create({
            data: {
                name: "Student One",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000000${Math.floor(Math.random() * 10000)}`,
            },
        });
        // Create lesson that should be IN_PROGRESS
        const lesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                status: "SCHEDULED",
                startTime: new Date(now.getTime() - 1 * 60 * 1000),
                endTime: new Date(now.getTime() + 30 * 60 * 1000),
            },
        });
        const broadcastMock = jest.fn();
        mockedGetWs.mockReturnValue({
            broadcastLessonStatusUpdate: broadcastMock,
        });
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        expect(result.startedLessons).toBeGreaterThanOrEqual(1);
        const updated = await prisma_1.default.lesson.findUnique({
            where: { id: lesson.id },
        });
        expect(updated).toBeTruthy();
        expect(updated.status).toBe("IN_PROGRESS");
        expect(broadcastMock).toHaveBeenCalledWith(lesson.id, "IN_PROGRESS", lesson.tutorId);
    });
    it("should move IN_PROGRESS and SCHEDULED lessons with endTime <= now to COMPLETED and broadcast", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        // Create test user and student
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+completed+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student1 = await prisma_1.default.student.create({
            data: {
                name: "Student Two",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000001${Math.floor(Math.random() * 10000)}`,
            },
        });
        const student2 = await prisma_1.default.student.create({
            data: {
                name: "Student Three",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000002${Math.floor(Math.random() * 10000)}`,
            },
        });
        // Lesson that was IN_PROGRESS and ended
        const lesson1 = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student1.id,
                subject: "PHYSICS",
                lessonType: "EGE",
                status: "IN_PROGRESS",
                startTime: new Date(now.getTime() - 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 1 * 60 * 1000),
            },
        });
        // Lesson that was SCHEDULED but ended
        const lesson2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student2.id,
                subject: "PHYSICS",
                lessonType: "EGE",
                status: "SCHEDULED",
                startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 30 * 60 * 1000),
            },
        });
        const broadcastMock = jest.fn();
        mockedGetWs.mockReturnValue({
            broadcastLessonStatusUpdate: broadcastMock,
        });
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        expect(result.completedLessons).toBeGreaterThanOrEqual(2);
        const updated1 = await prisma_1.default.lesson.findUnique({
            where: { id: lesson1.id },
        });
        const updated2 = await prisma_1.default.lesson.findUnique({
            where: { id: lesson2.id },
        });
        expect(updated1.status).toBe("COMPLETED");
        expect(updated2.status).toBe("COMPLETED");
        expect(broadcastMock).toHaveBeenCalled();
        // Ensure both lesson ids were broadcasted as COMPLETED
        expect(broadcastMock).toHaveBeenCalledWith(lesson1.id, "COMPLETED", lesson1.tutorId);
        expect(broadcastMock).toHaveBeenCalledWith(lesson2.id, "COMPLETED", lesson2.tutorId);
    });
    it("should move RESCHEDULED lesson to IN_PROGRESS and broadcast", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+reschedule+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student = await prisma_1.default.student.create({
            data: {
                name: "Student Res",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000003${Math.floor(Math.random() * 10000)}`,
            },
        });
        const lesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                status: "RESCHEDULED",
                startTime: new Date(now.getTime() - 1 * 60 * 1000),
                endTime: new Date(now.getTime() + 20 * 60 * 1000),
            },
        });
        const broadcastMock = jest.fn();
        mockedGetWs.mockReturnValue({
            broadcastLessonStatusUpdate: broadcastMock,
        });
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        expect(result.startedLessons).toBeGreaterThanOrEqual(1);
        const updated = await prisma_1.default.lesson.findUnique({
            where: { id: lesson.id },
        });
        expect(updated.status).toBe("IN_PROGRESS");
        expect(broadcastMock).toHaveBeenCalledWith(lesson.id, "IN_PROGRESS", lesson.tutorId);
    });
    it("should move RESCHEDULED lesson with endTime <= now to COMPLETED and broadcast", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+reschedule2+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student = await prisma_1.default.student.create({
            data: {
                name: "Student Res2",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000004${Math.floor(Math.random() * 10000)}`,
            },
        });
        const lesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                status: "RESCHEDULED",
                startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 1 * 60 * 1000),
            },
        });
        const broadcastMock = jest.fn();
        mockedGetWs.mockReturnValue({
            broadcastLessonStatusUpdate: broadcastMock,
        });
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        expect(result.completedLessons).toBeGreaterThanOrEqual(1);
        const updated = await prisma_1.default.lesson.findUnique({
            where: { id: lesson.id },
        });
        expect(updated.status).toBe("COMPLETED");
        expect(broadcastMock).toHaveBeenCalledWith(lesson.id, "COMPLETED", lesson.tutorId);
    });
    it("should not change CANCELLED or COMPLETED lessons", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+nochange+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student = await prisma_1.default.student.create({
            data: {
                name: "Student NoChange",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000005${Math.floor(Math.random() * 10000)}`,
            },
        });
        const cancelled = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                status: "CANCELLED",
                startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 1 * 60 * 1000),
            },
        });
        const completed = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                status: "COMPLETED",
                startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            },
        });
        const broadcastMock = jest.fn();
        mockedGetWs.mockReturnValue({
            broadcastLessonStatusUpdate: broadcastMock,
        });
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        // completedLessons and startedLessons should not count these
        const updatedCancelled = await prisma_1.default.lesson.findUnique({
            where: { id: cancelled.id },
        });
        const updatedCompleted = await prisma_1.default.lesson.findUnique({
            where: { id: completed.id },
        });
        expect(updatedCancelled.status).toBe("CANCELLED");
        expect(updatedCompleted.status).toBe("COMPLETED");
        // No broadcasts for these
        expect(broadcastMock).not.toHaveBeenCalledWith(cancelled.id, expect.anything(), expect.anything());
        expect(broadcastMock).not.toHaveBeenCalledWith(completed.id, expect.anything(), expect.anything());
    });
    it("should work when WebSocket manager is not present (no broadcast)", async () => {
        const now = (0, time_1.truncateToMinute)(new Date());
        const user = await prisma_1.default.user.create({
            data: {
                email: `test+noweb+${Date.now()}@example.com`,
                password: "test",
                name: "Test User",
            },
        });
        createdUserIds.push(user.id);
        const student = await prisma_1.default.student.create({
            data: {
                name: "Student NoWS",
                tutorId: user.id,
                contactMethod: "WHATSAPP",
                phone: `+7000006${Math.floor(Math.random() * 10000)}`,
            },
        });
        const lesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: user.id,
                studentId: student.id,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                status: "SCHEDULED",
                startTime: new Date(now.getTime() - 1 * 60 * 1000),
                endTime: new Date(now.getTime() + 20 * 60 * 1000),
            },
        });
        // Simulate no WS manager
        mockedGetWs.mockReturnValue(undefined);
        const result = await (0, lessonStatusUpdater_1.updateLessonStatuses)();
        const updated = await prisma_1.default.lesson.findUnique({
            where: { id: lesson.id },
        });
        expect(updated.status).toBe("IN_PROGRESS");
    });
});
//# sourceMappingURL=lessonStatusUpdater.test.js.map