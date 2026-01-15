"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../lib/prisma"));
const recurringHelpers_1 = require("../recurringHelpers");
const time_1 = require("../../utils/time");
const faker_1 = require("@faker-js/faker");
describe("recurringHelpers", () => {
    let userId;
    let studentId;
    beforeAll(async () => {
        const user = await prisma_1.default.user.create({
            data: { email: faker_1.faker.internet.email(), password: "x", name: "t" },
        });
        userId = user.id;
        const student = await prisma_1.default.student.create({
            data: {
                name: faker_1.faker.person.fullName(),
                contactMethod: "WHATSAPP",
                tutorId: userId,
            },
        });
        studentId = student.id;
    });
    afterAll(async () => {
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
    });
    it("generates stable recurring key and groups lessons keeping latest", () => {
        const now = new Date();
        const a = {
            id: "a",
            tutorId: userId,
            studentId,
            startTime: new Date(now.getTime() + 1000).toISOString(),
        };
        const b = {
            id: "b",
            tutorId: userId,
            studentId,
            startTime: new Date(now.getTime() + 2000).toISOString(),
        };
        const keyA = (0, recurringHelpers_1.getRecurringLessonKey)(a);
        const keyB = (0, recurringHelpers_1.getRecurringLessonKey)(b);
        expect(keyA).toBeDefined();
        expect(keyA).toEqual(keyB);
        const groups = (0, recurringHelpers_1.groupRecurringLessonsByPattern)([a, b]);
        expect(groups.size).toBe(1);
        const latest = groups.get(keyA);
        expect(latest.id).toBe("b");
    });
    it("shifts future recurring lessons successfully when no conflicts", async () => {
        // create base recurring lesson and two future instances with same weekday/time
        const baseStart = (0, time_1.truncateToMinute)(new Date(Date.now() + 2 * 24 * 3600 * 1000));
        const baseEnd = new Date(baseStart.getTime() + 3600000);
        const base = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: baseStart,
                endTime: baseEnd,
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const future1 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const future2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(baseStart.getTime() + 14 * 24 * 3600 * 1000),
                endTime: new Date(baseEnd.getTime() + 14 * 24 * 3600 * 1000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        // shift base by +1 hour
        const newStart = new Date(baseStart.getTime() + 3600000);
        const newEnd = new Date(baseEnd.getTime() + 3600000);
        // compute how many future lessons match the recurring key (this may vary)
        const futureLessonsBefore = await prisma_1.default.lesson.findMany({
            where: {
                tutorId: userId,
                studentId,
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const key = (0, recurringHelpers_1.getRecurringLessonKey)(base);
        const expectedToShift = futureLessonsBefore.filter((l) => (0, recurringHelpers_1.getRecurringLessonKey)(l) === key).length;
        const res = await (0, recurringHelpers_1.shiftFutureRecurringLessons)(base, newStart, newEnd);
        expect(res.shifted).toBe(expectedToShift);
        // verify DB entries moved
        const f1 = await prisma_1.default.lesson.findUnique({ where: { id: future1.id } });
        const f2 = await prisma_1.default.lesson.findUnique({ where: { id: future2.id } });
        expect((0, time_1.truncateToMinute)(new Date(f1.startTime)).getHours()).toBe((0, time_1.truncateToMinute)(newStart).getHours());
        expect((0, time_1.truncateToMinute)(new Date(f2.startTime)).getHours()).toBe((0, time_1.truncateToMinute)(newStart).getHours());
    });
    it("detects conflicts and aborts shifts", async () => {
        // create base recurring lesson and a future instance
        const baseStart = (0, time_1.truncateToMinute)(new Date(Date.now() + 3 * 24 * 3600 * 1000));
        const baseEnd = new Date(baseStart.getTime() + 3600000);
        const base = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: baseStart,
                endTime: baseEnd,
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const future = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        // create a conflicting lesson at the time where future would be shifted to
        const conflictStart = new Date(future.startTime.getTime() + 3600000); // shift +1h later
        const conflictEnd = new Date(conflictStart.getTime() + 3600000);
        const otherStudent = await prisma_1.default.student.create({
            data: {
                name: faker_1.faker.person.fullName(),
                contactMethod: "WHATSAPP",
                tutorId: userId,
            },
        });
        const other = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId: otherStudent.id,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: conflictStart,
                endTime: conflictEnd,
                isRecurring: false,
                status: "SCHEDULED",
            },
        });
        // attempt to shift base by +1 hour which would cause conflict with `other`
        const newStart = new Date(baseStart.getTime() + 3600000);
        const newEnd = new Date(baseEnd.getTime() + 3600000);
        const res = await (0, recurringHelpers_1.shiftFutureRecurringLessons)(base, newStart, newEnd);
        expect(res.shifted).toBe(0);
        expect(res.conflicts).toBeDefined();
        expect(res.conflicts.length).toBeGreaterThan(0);
        // cleanup the 'other' record
        await prisma_1.default.lesson.deleteMany({ where: { id: other.id } });
    });
    it("updates price for future recurring lessons", async () => {
        const baseStart = (0, time_1.truncateToMinute)(new Date(Date.now() + 6 * 24 * 3600 * 1000));
        const baseEnd = new Date(baseStart.getTime() + 3600000);
        const base = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: baseStart,
                endTime: baseEnd,
                isRecurring: true,
                status: "SCHEDULED",
                price: 100,
            },
        });
        const future = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
                isRecurring: true,
                status: "SCHEDULED",
                price: 100,
            },
        });
        const r = await (0, recurringHelpers_1.updatePriceForFutureRecurringLessons)(base, 250);
        expect(r.updated).toBeGreaterThanOrEqual(1);
        const u = await prisma_1.default.lesson.findUnique({ where: { id: future.id } });
        expect(u.price).toBe(250);
    });
});
//# sourceMappingURL=recurringHelpers.test.js.map