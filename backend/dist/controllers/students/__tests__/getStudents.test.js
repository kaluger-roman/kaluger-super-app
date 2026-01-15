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
describe("get students integration tests", () => {
    let authToken;
    let userId;
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
    });
    beforeEach(async () => {
        // ensure fresh state for each test
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
    });
    afterAll(async () => {
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    it("returns students for authenticated user", async () => {
        // create students for this tutor
        const st1 = await prisma_1.default.student.create({
            data: {
                name: "S1",
                contactMethod: "WHATSAPP",
                phone: "+70000000001",
                tutorId: userId,
            },
        });
        const st2 = await prisma_1.default.student.create({
            data: {
                name: "S2",
                contactMethod: "WHATSAPP",
                phone: "+70000000002",
                tutorId: userId,
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(Array.isArray(res.body.students)).toBe(true);
            const ids = res.body.students.map((s) => s.id);
            expect(ids).toEqual(expect.arrayContaining([st1.id, st2.id]));
        });
    });
    it("returns 404 for missing student", async () => {
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/students/non-existent-id`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(404)
            .then((res) => {
            expect(res.body.error).toBe("Ученик не найден");
        });
    });
    it("returns student when exists", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "Exist",
                contactMethod: "WHATSAPP",
                phone: "+70000000003",
                tutorId: userId,
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(res.body.student).toBeDefined();
            expect(res.body.student.id).toBe(student.id);
        });
    });
    it("includes last 5 lessons ordered by startTime desc", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "WithLessons",
                contactMethod: "WHATSAPP",
                phone: "+70000000004",
                tutorId: userId,
            },
        });
        // create 6 lessons with increasing startTime (older -> newer)
        const now = Date.now();
        const lessonIds = [];
        for (let i = 0; i < 6; i++) {
            const start = new Date(now + i * 60 * 60 * 1000); // each hour later
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const l = await prisma_1.default.lesson.create({
                data: {
                    studentId: student.id,
                    tutorId: userId,
                    startTime: start,
                    endTime: end,
                },
            });
            lessonIds.push(l.id);
        }
        // controller returns all lessons for single student (ordered desc)
        const expected = lessonIds.slice().reverse();
        await (0, supertest_1.default)(index_1.app)
            .get(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
            expect(Array.isArray(res.body.student.lessons)).toBe(true);
            expect(res.body.student.lessons).toHaveLength(6);
            const returnedIds = res.body.student.lessons.map((l) => l.id);
            expect(returnedIds).toEqual(expected);
        });
    });
});
//# sourceMappingURL=getStudents.test.js.map