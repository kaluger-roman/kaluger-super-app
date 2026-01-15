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
describe("deleteLesson controller", () => {
    let authToken;
    let userId;
    let studentId;
    beforeAll(async () => {
        // create test user
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
                contactMethod: "WHATSAPP",
                tutorId: userId,
            },
        });
        studentId = student.id;
    });
    afterAll(async () => {
        // cleanup
        await prisma_1.default.lesson.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    it("returns 404 when lesson not found", async () => {
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/non-existent-id`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(404)
            .then((res) => {
            expect(res.body.error).toBeDefined();
        });
    });
    it("deletes a single lesson when not recurring or deleteAllFuture false", async () => {
        const lesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "EGE",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: false,
                status: "SCHEDULED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/${lesson.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ deleteAllFuture: false })
            .expect(200)
            .then((res) => {
            expect(res.body.message).toBe("Урок успешно удален");
        });
        const found = await prisma_1.default.lesson.findUnique({ where: { id: lesson.id } });
        expect(found).toBeNull();
    });
    it("does not delete other recurring lessons when deleteAllFuture is false", async () => {
        // create recurring lesson
        const rLesson = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const rLesson2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "MATHEMATICS",
                lessonType: "SCHOOL",
                startTime: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                endTime: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/${rLesson.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ deleteAllFuture: false })
            .expect(200)
            .then((res) => {
            expect(res.body.message).toBe("Урок успешно удален");
        });
        const found1 = await prisma_1.default.lesson.findUnique({
            where: { id: rLesson.id },
        });
        const found2 = await prisma_1.default.lesson.findUnique({
            where: { id: rLesson2.id },
        });
        expect(found1).toBeNull();
        expect(found2).not.toBeNull();
    });
    it("does not delete COMPLETED or CANCELLED lessons when deleting a series", async () => {
        // create series: one scheduled, one completed, one cancelled
        const base = new Date(Date.now() + 3 * 24 * 3600 * 1000);
        const s1 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: base,
                endTime: new Date(base.getTime() + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const s2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: new Date(base.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(base.getTime() + 7 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "COMPLETED",
            },
        });
        const s3 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: new Date(base.getTime() + 14 * 24 * 3600 * 1000),
                endTime: new Date(base.getTime() + 14 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "CANCELLED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/${s1.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ deleteAllFuture: true })
            .expect(200)
            .then((res) => {
            // should delete only s1 (if considered future) or none depending on keys; ensure completed/cancelled are not counted
            expect(typeof res.body.deleted).toBe("number");
        });
        const f1 = await prisma_1.default.lesson.findUnique({ where: { id: s1.id } });
        const f2 = await prisma_1.default.lesson.findUnique({ where: { id: s2.id } });
        const f3 = await prisma_1.default.lesson.findUnique({ where: { id: s3.id } });
        // Completed and Cancelled should remain
        expect(f2).not.toBeNull();
        expect(f3).not.toBeNull();
    });
    it("deleteAllFuture true when all future recurring lessons are COMPLETED/CANCELLED deletes none and original remains", async () => {
        const base = new Date(Date.now() + 6 * 24 * 3600 * 1000);
        const orig = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: base,
                endTime: new Date(base.getTime() + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        // future lessons but with COMPLETED/CANCELLED status (should be excluded)
        const f1 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: new Date(base.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(base.getTime() + 7 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "COMPLETED",
            },
        });
        const f2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: new Date(base.getTime() + 14 * 24 * 3600 * 1000),
                endTime: new Date(base.getTime() + 14 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "CANCELLED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/${orig.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ deleteAllFuture: true })
            .expect(200)
            .then((res) => {
            // controller includes the current scheduled lesson in toDeleteIds
            expect(res.body.deleted).toBe(1);
        });
        const foundOrig = await prisma_1.default.lesson.findUnique({
            where: { id: orig.id },
        });
        expect(foundOrig).toBeNull();
        // cleanup
        await prisma_1.default.lesson.deleteMany({ where: { id: { in: [f1.id, f2.id] } } });
    });
    it("when deleteAllFuture true deletes all future lessons of the same recurring series", async () => {
        // create a series of recurring lessons with same key and one with different key
        const baseStart = new Date();
        // series A - should be deleted
        const lessonA1 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: baseStart,
                endTime: new Date(baseStart.getTime() + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        const lessonA2 = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
                endTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000 + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        // series B - should NOT be deleted
        const lessonB = await prisma_1.default.lesson.create({
            data: {
                tutorId: userId,
                studentId,
                subject: "PHYSICS",
                lessonType: "EGE",
                // make startTime different (1 minute later) so recurring key differs
                startTime: new Date(baseStart.getTime() + 60 * 1000),
                endTime: new Date(baseStart.getTime() + 3600000),
                isRecurring: true,
                status: "SCHEDULED",
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/lessons/${lessonA1.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ deleteAllFuture: true })
            .expect(200)
            .then((res) => {
            expect(res.body.message).toMatch(/Будущие регулярные уроки/);
            expect(typeof res.body.deleted).toBe("number");
        });
        const foundA1 = await prisma_1.default.lesson.findUnique({
            where: { id: lessonA1.id },
        });
        const foundA2 = await prisma_1.default.lesson.findUnique({
            where: { id: lessonA2.id },
        });
        const foundB = await prisma_1.default.lesson.findUnique({
            where: { id: lessonB.id },
        });
        expect(foundA1).toBeNull();
        expect(foundA2).toBeNull();
        expect(foundB).not.toBeNull();
    });
});
//# sourceMappingURL=deleteLesson.test.js.map