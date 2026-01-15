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
describe("createLesson integration tests", () => {
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
    it("returns 400 when validation fails (missing fields)", async () => {
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({})
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBeDefined();
        });
    });
    it("returns 404 when student not found", async () => {
        const body = {
            studentId: "not-exist",
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            isRecurring: false,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(404)
            .then((res) => {
            expect(res.body.error).toBe("Ученик не найден");
        });
    });
    it("creates a scheduled single lesson and falls back to student.hourlyRate", async () => {
        // ensure student has hourlyRate
        await prisma_1.default.student.update({
            where: { id: studentId },
            data: { hourlyRate: 1200 },
        });
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: new Date(Date.now() + 3600000).toISOString(),
            endTime: new Date(Date.now() + 7200000).toISOString(),
            isRecurring: false,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(201)
            .then(async (res) => {
            expect(res.body.lesson).toBeDefined();
            expect(res.body.lesson.status).toBe("SCHEDULED");
            // verify price fallback
            const created = await prisma_1.default.lesson.findUnique({
                where: { id: res.body.lesson.id },
            });
            expect(created?.price).toBe(1200);
        });
    });
    it("creates IN_PROGRESS and COMPLETED statuses correctly", async () => {
        // IN_PROGRESS: start < now < end
        const start = new Date(Date.now() - 1000 * 60 * 30).toISOString();
        const end = new Date(Date.now() + 1000 * 60 * 30).toISOString();
        const inProgressBody = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "EGE",
            startTime: start,
            endTime: end,
            isRecurring: false,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(inProgressBody)
            .expect(201)
            .then((res) => {
            expect(res.body.lesson.status).toBe("IN_PROGRESS");
        });
        // COMPLETED: end <= now
        const cstart = new Date(Date.now() - 3600000 * 2).toISOString();
        const cend = new Date(Date.now() - 3600000).toISOString();
        const completedBody = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "EGE",
            startTime: cstart,
            endTime: cend,
            isRecurring: false,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(completedBody)
            .expect(201)
            .then((res) => {
            expect(res.body.lesson.status).toBe("COMPLETED");
        });
    });
    it("returns 400 when scheduling conflict exists", async () => {
        // create an existing lesson
        const exist = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 24 * 3600 * 1000),
                endTime: new Date(Date.now() + 24 * 3600 * 1000 + 3600000),
                isRecurring: false,
                status: "SCHEDULED",
            },
        });
        // attempt to create overlapping lesson
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: new Date(Date.now() + 24 * 3600 * 1000 + 1800000).toISOString(),
            endTime: new Date(Date.now() + 24 * 3600 * 1000 + 5400000).toISOString(),
            isRecurring: false,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBe("Временной слот конфликтует с существующим уроком");
        });
    });
    it("treats price 0 as falsy and falls back to student.hourlyRate", async () => {
        // ensure student has hourlyRate
        await prisma_1.default.student.update({
            where: { id: studentId },
            data: { hourlyRate: 500 },
        });
        // choose a time far enough to avoid conflicts with other tests
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 10 * 24 * 3600 * 1000 + 3600000).toISOString(),
            isRecurring: false,
            price: 0,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(201)
            .then(async (res) => {
            const created = await prisma_1.default.lesson.findUnique({
                where: { id: res.body.lesson.id },
            });
            expect(created?.price).toBe(500);
        });
    });
    it("creates recurring lessons and skips conflicted dates", async () => {
        // remove existing lessons for clarity
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        const start = new Date();
        const end = new Date(start.getTime() + 3600000);
        // create a conflict on second week
        const conflictStart = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
        const conflictEnd = new Date(conflictStart.getTime() + 3600000);
        await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: conflictStart,
                endTime: conflictEnd,
                isRecurring: false,
                status: "SCHEDULED",
            },
        });
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            isRecurring: true,
            description: "desc",
            homework: "hw",
            notes: "nt",
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(201)
            .then(async (res) => {
            expect(res.body.lesson).toBeDefined();
            // created lessons count should be >0
            const count = await prisma_1.default.lesson.count({
                where: { tutorId: userId, isRecurring: true },
            });
            expect(count).toBeGreaterThan(0);
            // first recurring lesson should keep description/homework/notes
            const first = await prisma_1.default.lesson.findFirst({
                where: { tutorId: userId, isRecurring: true },
                orderBy: { startTime: "asc" },
            });
            expect(first?.description).toBeDefined();
        });
    });
    it("creates recurring lessons when no conflicts (all occurrences created)", async () => {
        // remove existing lessons for clarity
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        const start = new Date();
        const end = new Date(start.getTime() + 3600000);
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            isRecurring: true,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(201)
            .then(async (res) => {
            expect(res.body.lesson).toBeDefined();
            const count = await prisma_1.default.lesson.count({
                where: { tutorId: userId, isRecurring: true },
            });
            // should create roughly 12-13 weekly lessons for 3 months
            expect(count).toBeGreaterThanOrEqual(12);
            expect(res.body.message).toMatch(/Создано/);
        });
    });
    it("returns 400 when recurring lessons conflict everywhere", async () => {
        // remove existing lessons
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        const start = new Date();
        const end = new Date(start.getTime() + 3600000);
        // Create conflicts on every week for ~13 weeks
        const weeks = 13;
        for (let i = 0; i < weeks; i++) {
            const s = new Date(start.getTime() + i * 7 * 24 * 3600 * 1000);
            const e = new Date(s.getTime() + 3600000);
            await prisma_1.default.lesson.create({
                data: {
                    tutorId: userId,
                    studentId,
                    subject: "MATHEMATICS",
                    lessonType: "SCHOOL",
                    startTime: s,
                    endTime: e,
                    isRecurring: false,
                    status: "SCHEDULED",
                },
            });
        }
        const body = {
            studentId,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            isRecurring: true,
        };
        await (0, supertest_1.default)(index_1.app)
            .post(`/api/lessons`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBe("Невозможно создать регулярные уроки из-за конфликтов в расписании");
        });
    });
});
//# sourceMappingURL=createLesson.test.js.map