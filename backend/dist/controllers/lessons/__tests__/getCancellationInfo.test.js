"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const faker_1 = require("@faker-js/faker");
const index_1 = require("../../../index");
const prisma_1 = __importDefault(require("../../../lib/prisma"));
const auth_1 = require("../../../utils/auth");
describe("GET /api/lessons/:id/cancellation-info", () => {
    let authToken;
    let userId;
    let studentId;
    beforeAll(async () => {
        const user = await prisma_1.default.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: "hashed_password",
                name: faker_1.faker.person.fullName(),
            },
        });
        userId = user.id;
        authToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
        const student = await prisma_1.default.student.create({
            data: {
                name: faker_1.faker.person.fullName(),
                tutorId: userId,
                contactMethod: "WHATSAPP",
                phone: faker_1.faker.phone.number(),
            },
        });
        studentId = student.id;
    });
    afterAll(async () => {
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
    });
    afterEach(async () => {
        // Clean up lessons created in each test
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
    });
    it("should return 404 when lesson not found", async () => {
        await (0, supertest_1.default)(index_1.app)
            .get("/api/lessons/non-existent-id/cancellation-info")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(404);
    });
    it("should return null when lesson is not paid", async () => {
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1000,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: false,
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${lesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toBeNull();
    });
    it("should return null when no payment date", async () => {
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1000,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate: null,
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${lesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toBeNull();
    });
    it("should return null when no next unpaid lesson found", async () => {
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1000,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate: new Date(),
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${lesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toBeNull();
    });
    it("should return cancellation info when next unpaid lesson exists", async () => {
        const paymentDate = new Date();
        const paidLesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1500,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate,
            },
        });
        const unpaidLesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
                price: 1500,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: false,
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toMatchObject({
            nextLessonId: unpaidLesson.id,
            transferAmount: 1500,
        });
        expect(response.body.cancellationInfo.nextLessonStartTime).toBeTruthy();
        expect(response.body.cancellationInfo.transferDate).toBeTruthy();
    });
    it("should not return next lesson with different price", async () => {
        const paymentDate = new Date();
        const paidLesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1000,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate,
            },
        });
        await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
                price: 2000, // Different price
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: false,
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toBeNull();
    });
    it("should not return cancelled lesson as next lesson", async () => {
        const paymentDate = new Date();
        const paidLesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1200,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate,
            },
        });
        await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
                price: 1200,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "CANCELLED",
                isPaid: false,
            },
        });
        const response = await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(response.body.cancellationInfo).toBeNull();
    });
    it("handles database errors gracefully", async () => {
        const lesson = await prisma_1.default.lesson.create({
            data: {
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
                price: 1000,
                isRecurring: false,
                tutorId: userId,
                studentId: studentId,
                status: "SCHEDULED",
                isPaid: true,
                paymentDate: new Date(),
            },
        });
        const originalFindFirst = prisma_1.default.lesson.findFirst;
        prisma_1.default.lesson.findFirst = jest
            .fn()
            .mockRejectedValueOnce(new Error("DB error"));
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/lessons/${lesson.id}/cancellation-info`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(500);
        prisma_1.default.lesson.findFirst = originalFindFirst;
    });
});
//# sourceMappingURL=getCancellationInfo.test.js.map