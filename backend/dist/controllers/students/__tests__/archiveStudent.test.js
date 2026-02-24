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
describe("Student Archiving", () => {
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
    describe("PUT /api/students/:id/archive", () => {
        it("should archive student and delete future lessons", async () => {
            const futureLesson = await prisma_1.default.lesson.create({
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
                },
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/students/${studentId}/archive`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                archiveReason: "COMPLETED_STUDIES",
                archiveComment: "Ученик завершил курс",
            })
                .expect(200);
            expect(response.body.student).toMatchObject({
                id: studentId,
                archived: true,
                archiveReason: "COMPLETED_STUDIES",
                archiveComment: "Ученик завершил курс",
            });
            expect(response.body.student.archivedAt).toBeTruthy();
            const deletedLesson = await prisma_1.default.lesson.findUnique({
                where: { id: futureLesson.id },
            });
            expect(deletedLesson).toBeNull();
        });
        it("should archive student without reason or comment", async () => {
            const anotherStudent = await prisma_1.default.student.create({
                data: {
                    name: faker_1.faker.person.fullName(),
                    tutorId: userId,
                    contactMethod: "WHATSAPP",
                    phone: faker_1.faker.phone.number(),
                },
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/students/${anotherStudent.id}/archive`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(200);
            expect(response.body.student).toMatchObject({
                id: anotherStudent.id,
                archived: true,
                archiveReason: null,
                archiveComment: null,
            });
        });
        it("should return 404 when student not found", async () => {
            await (0, supertest_1.default)(index_1.app)
                .put("/api/students/non-existent-id/archive")
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(404);
        });
        it("should handle database errors", async () => {
            const originalTransaction = prisma_1.default.$transaction;
            prisma_1.default.$transaction = jest
                .fn()
                .mockRejectedValueOnce(new Error("DB error"));
            await (0, supertest_1.default)(index_1.app)
                .put(`/api/students/${studentId}/archive`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(500);
            prisma_1.default.$transaction = originalTransaction;
        });
    });
    describe("PUT /api/students/:id/unarchive", () => {
        it("should unarchive student", async () => {
            const archivedStudent = await prisma_1.default.student.create({
                data: {
                    name: faker_1.faker.person.fullName(),
                    tutorId: userId,
                    contactMethod: "WHATSAPP",
                    phone: faker_1.faker.phone.number(),
                    archived: true,
                    archivedAt: new Date(),
                    archiveReason: "COMPLETED_STUDIES",
                    archiveComment: "Test comment",
                },
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/students/${archivedStudent.id}/unarchive`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(200);
            expect(response.body.student).toMatchObject({
                id: archivedStudent.id,
                archived: false,
                archivedAt: null,
                archiveReason: null,
                archiveComment: null,
            });
        });
        it("should return 404 when student not found", async () => {
            await (0, supertest_1.default)(index_1.app)
                .put("/api/students/non-existent-id/unarchive")
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(404);
        });
        it("should handle database errors", async () => {
            const archivedStudent = await prisma_1.default.student.create({
                data: {
                    name: faker_1.faker.person.fullName(),
                    tutorId: userId,
                    contactMethod: "WHATSAPP",
                    phone: faker_1.faker.phone.number(),
                    archived: true,
                    archivedAt: new Date(),
                },
            });
            const originalUpdate = prisma_1.default.student.update;
            prisma_1.default.student.update = jest
                .fn()
                .mockRejectedValueOnce(new Error("DB error"));
            await (0, supertest_1.default)(index_1.app)
                .put(`/api/students/${archivedStudent.id}/unarchive`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({})
                .expect(500);
            prisma_1.default.student.update = originalUpdate;
        });
    });
});
//# sourceMappingURL=archiveStudent.test.js.map