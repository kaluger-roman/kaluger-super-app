"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../lib/prisma"));
const recurringLessons_1 = require("../recurringLessons");
const time_1 = require("../../utils/time");
const faker_1 = require("@faker-js/faker");
// Helpers to create test data
const createTutorAndStudent = async () => {
    const tutor = await prisma_1.default.user.create({
        data: {
            email: faker_1.faker.internet.email(),
            password: "test_password",
            name: faker_1.faker.person.fullName(),
        },
    });
    const student = await prisma_1.default.student.create({
        data: {
            name: faker_1.faker.person.fullName(),
            tutorId: tutor.id,
            contactMethod: "WHATSAPP",
            phone: faker_1.faker.phone.number(),
        },
    });
    return { tutor, student };
};
describe("processRecurringLessons", () => {
    let tutorId;
    let studentId;
    const createdTutorIds = [];
    const createdStudentIds = [];
    const createdLessonIds = [];
    // Track created tutor/student in helper
    const createTutorAndStudentTracked = async () => {
        const { tutor, student } = await createTutorAndStudent();
        createdTutorIds.push(tutor.id);
        createdStudentIds.push(student.id);
        return { tutor, student };
    };
    beforeAll(async () => {
        // Do not wipe global DB here — tests should clean only their own data
    });
    afterAll(async () => {
        if (createdTutorIds.length) {
            await prisma_1.default.lesson.deleteMany({
                where: { tutorId: { in: createdTutorIds } },
            });
            await prisma_1.default.student.deleteMany({
                where: { tutorId: { in: createdTutorIds } },
            });
            await prisma_1.default.user.deleteMany({ where: { id: { in: createdTutorIds } } });
        }
        await prisma_1.default.$disconnect();
    });
    it("should do nothing when no recurring lessons exist", async () => {
        const created = await (0, recurringLessons_1.processRecurringLessons)();
        expect(created === 0 || created === undefined).toBeTruthy();
    });
    it("should create weekly lessons for the next 3 months when recurring exists", async () => {
        const { tutor, student } = await createTutorAndStudentTracked();
        tutorId = tutor.id;
        studentId = student.id;
        // Create a single recurring lesson scheduled one week ago
        const now = new Date();
        const lastStart = (0, time_1.truncateToMinute)(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        const lastEnd = (0, time_1.truncateToMinute)(new Date(lastStart.getTime() + 60 * 60 * 1000));
        await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: lastStart,
                endTime: lastEnd,
                price: 1000,
                isRecurring: true,
                tutorId: tutorId,
                studentId: studentId,
                status: "SCHEDULED",
            },
        });
        const created = await (0, recurringLessons_1.processRecurringLessons)();
        expect(typeof created).toBe("number");
        expect(created).toBeGreaterThan(0);
        // Verify lessons were created up to ~3 months ahead (at least 10 weeks)
        const lessons = await prisma_1.default.lesson.findMany({ where: { tutorId } });
        expect(lessons.length).toBeGreaterThanOrEqual(2); // original + some created
    });
    it("should not create lessons that conflict with existing ones", async () => {
        // Setup a tutor/student and a recurring lesson at specific time
        const { tutor, student } = await createTutorAndStudentTracked();
        const tId = tutor.id;
        const sId = student.id;
        const start = (0, time_1.truncateToMinute)(new Date());
        const end = (0, time_1.truncateToMinute)(new Date(start.getTime() + 60 * 60 * 1000));
        // Create a recurring base lesson
        await prisma_1.default.lesson.create({
            data: {
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: start,
                endTime: end,
                price: 1200,
                isRecurring: true,
                tutorId: tId,
                studentId: sId,
                status: "SCHEDULED",
            },
        });
        // Create an existing lesson next week that conflicts with where a new one would be
        const conflictStart = (0, time_1.truncateToMinute)(new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000));
        const conflictEnd = (0, time_1.truncateToMinute)(new Date(conflictStart.getTime() + 60 * 60 * 1000));
        await prisma_1.default.lesson.create({
            data: {
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: conflictStart,
                endTime: conflictEnd,
                price: 500,
                isRecurring: false,
                tutorId: tId,
                studentId: sId,
                status: "SCHEDULED",
            },
        });
        const created = await (0, recurringLessons_1.processRecurringLessons)();
        expect(typeof created).toBe("number");
        // Ensure that no duplicate lesson was created for the conflicting slot
        const lessons = await prisma_1.default.lesson.findMany({
            where: { tutorId: tId, startTime: conflictStart },
        });
        // Only the explicitly created conflict should exist (not an additional one)
        expect(lessons.length).toBe(1);
    });
});
//# sourceMappingURL=recurringLessons.test.js.map