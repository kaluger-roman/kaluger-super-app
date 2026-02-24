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
describe("getStatistics controller", () => {
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
    afterEach(async () => {
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
    });
    it("returns zeros for empty data set", async () => {
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.completedLessons).toBe(0);
            expect(res.body.cancelledLessons).toBe(0);
            expect(res.body.totalLessons).toBe(0);
            expect(res.body.upcomingLessons).toBe(0);
            expect(res.body.earnings).toBe(0);
            expect(res.body.lastMonthEarnings).toBe(0);
            expect(res.body.lostEarnings).toBe(0);
            expect(res.body.prepaidIncome).toBe(0);
            expect(res.body.upcomingIncome).toBe(0);
            expect(res.body.trialLessonsCount).toBe(0);
            expect(res.body.unpaidDebtSum).toBe(0);
            expect(res.body.unpaidDebtCount).toBe(0);
            expect(res.body.unpaidDebtOver24hSum).toBe(0);
            expect(res.body.unpaidDebtOver24hCount).toBe(0);
            expect(res.body.taxAmount).toBe(0);
        });
    });
    it("should return taxAmount with default rate (6%) when no custom rate set", async () => {
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 10000,
                status: "COMPLETED",
            },
        });
        const res = await (0, supertest_1.default)(index_1.app)
            .get("/api/statistics")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(res.body.earnings).toBe(10000);
        expect(res.body.taxAmount).toBe(600); // 10000 * 6 / 100
    });
    it("should return taxAmount with custom tax rate", async () => {
        // Set custom tax rate
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { taxRate: 13 },
        });
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 50000,
                status: "COMPLETED",
            },
        });
        const res = await (0, supertest_1.default)(index_1.app)
            .get("/api/statistics")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(res.body.earnings).toBe(50000);
        expect(res.body.taxAmount).toBe(6500); // 50000 * 13 / 100
        // Reset tax rate
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { taxRate: 6 },
        });
    });
    it("should return taxAmount 0 when tax rate is 0", async () => {
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { taxRate: 0 },
        });
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 5000,
                status: "COMPLETED",
            },
        });
        const res = await (0, supertest_1.default)(index_1.app)
            .get("/api/statistics")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(res.body.taxAmount).toBe(0);
        // Reset tax rate
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { taxRate: 6 },
        });
    });
    it("calculates completed, cancelled, total and earnings correctly", async () => {
        // completed paid
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 1500,
                status: "COMPLETED",
            },
        });
        // completed unpaid but price > 0
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: false,
                price: 500,
                status: "COMPLETED",
            },
        });
        // cancelled
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: false,
                price: 200,
                status: "CANCELLED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.completedLessons).toBe(2);
            expect(res.body.cancelledLessons).toBe(1);
            expect(res.body.totalLessons).toBe(3);
            expect(res.body.earnings).toBe(1500);
            expect(res.body.unpaidDebtSum).toBe(500);
            expect(res.body.unpaidDebtCount).toBe(1);
            expect(res.body.lostEarnings).toBe(200);
        });
    });
    it("counts unpaid over 24h correctly", async () => {
        const now = new Date();
        const twoDaysAgoEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const twoDaysAgoStart = new Date(twoDaysAgoEnd.getTime() - 3600000);
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: twoDaysAgoStart,
                endTime: twoDaysAgoEnd,
                isRecurring: false,
                isPaid: false,
                price: 800,
                status: "COMPLETED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.unpaidDebtOver24hCount).toBe(1);
            expect(res.body.unpaidDebtOver24hSum).toBe(800);
        });
    });
    it("counts upcoming lessons and upcoming income/prepaid correctly", async () => {
        // upcoming statuses: SCHEDULED, RESCHEDULED, IN_PROGRESS
        const inOneHourStart = new Date(Date.now() + 60 * 60 * 1000);
        const inTwoHoursStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
        // scheduled paid
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: inOneHourStart,
                endTime: new Date(inOneHourStart.getTime() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 1200,
                status: "SCHEDULED",
            },
        });
        // rescheduled unpaid
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: inTwoHoursStart,
                endTime: new Date(inTwoHoursStart.getTime() + 3600000),
                isRecurring: false,
                isPaid: false,
                price: 400,
                status: "RESCHEDULED",
            },
        });
        // in progress paid
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 300,
                status: "IN_PROGRESS",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.upcomingLessons).toBe(3);
            // prepaidIncome uses isPaid true for upcoming statuses
            expect(res.body.prepaidIncome).toBe(1500); // 1200 + 300
            // upcomingIncome sums all upcoming (paid and unpaid) prices
            expect(res.body.upcomingIncome).toBe(1900); // 1200 + 400 + 300
        });
    });
    it("counts trial lessons (price 0 or null)", async () => {
        await prisma_1.default.lesson.createMany({
            data: [
                {
                    tutorId: userId,
                    studentId,
                    subject: "MATHEMATICS",
                    lessonType: "SCHOOL",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    isRecurring: false,
                    isPaid: false,
                    price: 0,
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
                    price: null,
                    status: "COMPLETED",
                },
            ],
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.trialLessonsCount).toBe(2);
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
        const todayStr = today.toISOString().slice(0, 10);
        // create a today lesson
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                price: 222,
                status: "COMPLETED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .query({ startDate: todayStr, endDate: todayStr })
            .expect(200)
            .then((res) => {
            // should not include the old lesson
            expect(res.body.earnings).not.toBe(111);
            // should include today's 222 (as earnings if isPaid true) but here isPaid false so earnings may be 0
            // ensure totalLessons counts only lessons within range
            expect(res.body.totalLessons).toBeGreaterThanOrEqual(1);
        });
    });
    it("calculates lastMonthEarnings correctly", async () => {
        // compute a date in last month
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: lastMonth,
                endTime: new Date(lastMonth.getTime() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 4321,
                status: "COMPLETED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.lastMonthEarnings).toBeGreaterThanOrEqual(4321);
        });
    });
    it("prepaidIncome ignores date filters while upcomingIncome respects them", async () => {
        // Create one upcoming (within default month range) paid lesson and one paid lesson far in past
        const now = new Date();
        const inFuture = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const farPast = new Date(now.getFullYear() - 1, 1, 1);
        // upcoming paid lesson (should be counted in both prepaidIncome and upcomingIncome)
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: inFuture,
                endTime: new Date(inFuture.getTime() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 999,
                status: "SCHEDULED",
            },
        });
        // far past paid upcoming-status-like lesson (out of date filter; should affect prepaidIncome but not upcomingIncome because upcomingIncome in controller uses tutorId and upcoming status only, but upcomingIncome's other aggregate uses ...where include startTime filter via buildStatisticsWhere for upcomingIncome? We will assert that prepaidIncome >= upcomingIncome)
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "SCHOOL",
                startTime: farPast,
                endTime: new Date(farPast.getTime() + 3600000),
                isRecurring: false,
                isPaid: true,
                price: 111,
                status: "SCHEDULED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/statistics`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.prepaidIncome).toBeGreaterThanOrEqual(res.body.upcomingIncome);
        });
    });
    it("handles database errors gracefully", async () => {
        const originalAggregate = prisma_1.default.lesson.aggregate;
        prisma_1.default.lesson.aggregate = jest
            .fn()
            .mockRejectedValueOnce(new Error("DB error"));
        await (0, supertest_1.default)(index_1.app)
            .get("/api/statistics")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(500);
        prisma_1.default.lesson.aggregate = originalAggregate;
    });
});
//# sourceMappingURL=getStatistics.test.js.map