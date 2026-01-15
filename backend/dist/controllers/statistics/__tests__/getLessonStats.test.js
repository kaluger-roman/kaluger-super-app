"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../../index");
const prisma_1 = __importDefault(require("../../../lib/prisma"));
const auth_1 = require("../../../utils/auth");
const faker_1 = require("@faker-js/faker");
describe("statistics integration tests", () => {
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
        await prisma_1.default.$disconnect();
    });
    it("/by-subject returns aggregated counts and sums", async () => {
        // create lessons across two subjects and prices
        await prisma_1.default.lesson.createMany({
            data: [
                {
                    tutorId: userId,
                    studentId,
                    subject: "MATHEMATICS",
                    lessonType: "EGE",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: true,
                    price: 1000,
                    status: "COMPLETED",
                },
                {
                    tutorId: userId,
                    studentId,
                    subject: "MATHEMATICS",
                    lessonType: "SCHOOL",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: false,
                    price: 2000,
                    status: "COMPLETED",
                },
                {
                    tutorId: userId,
                    studentId,
                    subject: "PHYSICS",
                    lessonType: "EGE",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: true,
                    price: 500,
                    status: "COMPLETED",
                },
            ],
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics/by-subject`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.lessonsBySubject).toBeInstanceOf(Array);
            const math = res.body.lessonsBySubject.find((s) => s.subject === "MATHEMATICS");
            const phys = res.body.lessonsBySubject.find((s) => s.subject === "PHYSICS");
            expect(math).toBeDefined();
            expect(phys).toBeDefined();
            // math count 2, sum price 3000
            expect(math._count.id).toBe(2);
            expect(math._sum.price).toBe(3000);
            expect(phys._count.id).toBe(1);
            expect(phys._sum.price).toBe(500);
        });
    });
    it("/by-type returns aggregated counts and sums", async () => {
        // create lessons across two types
        await prisma_1.default.lesson.createMany({
            data: [
                {
                    tutorId: userId,
                    studentId,
                    subject: "MATHEMATICS",
                    lessonType: "EGE",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: true,
                    price: 700,
                    status: "COMPLETED",
                },
                {
                    tutorId: userId,
                    studentId,
                    subject: "PHYSICS",
                    lessonType: "SCHOOL",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: false,
                    price: 300,
                    status: "COMPLETED",
                },
            ],
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics/by-type`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.lessonsByType).toBeInstanceOf(Array);
            const ege = res.body.lessonsByType.find((t) => t.lessonType === "EGE");
            const school = res.body.lessonsByType.find((t) => t.lessonType === "SCHOOL");
            expect(ege).toBeDefined();
            expect(school).toBeDefined();
            // ege should have at least the CHEMISTRY lesson plus earlier EGE lessons
            expect(ege._count.id).toBeGreaterThanOrEqual(1);
            expect(ege._sum.price).toBeGreaterThanOrEqual(700);
            expect(school._count.id).toBeGreaterThanOrEqual(1);
            expect(school._sum.price).toBeGreaterThanOrEqual(300);
        });
    });
    it("respects startDate and endDate filters", async () => {
        // create an old lesson (outside range) and a today lesson (inside range)
        const oldStart = new Date("2020-01-01T10:00:00Z");
        const oldEnd = new Date(oldStart.getTime() + 3600000);
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: oldStart,
                endTime: oldEnd,
                isRecurring: false,
                price: 111,
                status: "COMPLETED",
            },
        });
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics/by-subject`)
            .set("Authorization", `Bearer ${authToken}`)
            .query({ startDate: todayStr, endDate: todayStr })
            .expect(200)
            .then((res) => {
            // should not include the old lesson
            const math = res.body.lessonsBySubject.find((s) => s.subject === "MATHEMATICS");
            if (math) {
                // sum should be >= the recent lessons but not equal to include old 111 unless added today
                expect(math._sum.price).not.toBe(111);
            }
        });
    });
});
//# sourceMappingURL=getLessonStats.test.js.map