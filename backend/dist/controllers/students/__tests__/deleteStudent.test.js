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
describe("deleteStudent integration tests", () => {
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
    afterAll(async () => {
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    it("deletes student and returns success message", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "ToDelete",
                contactMethod: "WHATSAPP",
                phone: "+79990007777",
                tutorId: userId,
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then(async (res) => {
            expect(res.body.message).toBe("Ученик успешно удален");
            const found = await prisma_1.default.student.findUnique({
                where: { id: student.id },
            });
            expect(found).toBeNull();
        });
    });
    it("returns 404 when student not found or belongs to another tutor", async () => {
        await (0, supertest_1.default)(index_1.app)
            .delete("/api/students/non-existent-id")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(404);
    });
    it("handles database errors gracefully", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "TestStudent",
                contactMethod: "WHATSAPP",
                phone: faker_1.faker.phone.number(),
                tutorId: userId,
            },
        });
        const originalDelete = prisma_1.default.student.delete;
        prisma_1.default.student.delete = jest
            .fn()
            .mockRejectedValueOnce(new Error("DB error"));
        await (0, supertest_1.default)(index_1.app)
            .delete(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(500);
        prisma_1.default.student.delete = originalDelete;
    });
});
//# sourceMappingURL=deleteStudent.test.js.map