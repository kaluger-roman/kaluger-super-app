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
describe("updateStudent integration tests", () => {
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
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
    });
    afterAll(async () => {
        await prisma_1.default.student.deleteMany({ where: { tutorId: userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    it("returns 400 when validation fails (invalid hourlyRate)", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "ToUpdate",
                contactMethod: "WHATSAPP",
                phone: "+79990006666",
                tutorId: userId,
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .put(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ hourlyRate: -10 })
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBe("Почасовая ставка должна быть положительной");
        });
    });
    it("returns 404 when student does not exist or belongs to another tutor", async () => {
        // create student for different user
        const otherUser = await prisma_1.default.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: "hashed",
                name: faker_1.faker.person.fullName(),
            },
        });
        const otherStudent = await prisma_1.default.student.create({
            data: {
                name: "Other",
                contactMethod: "WHATSAPP",
                phone: "+79990005555",
                tutorId: otherUser.id,
            },
        });
        await (0, supertest_1.default)(index_1.app)
            .put(`/api/students/${otherStudent.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ name: "NewName" })
            .expect(404)
            .then((res) => {
            expect(res.body.error).toBe("Ученик не найден");
        });
        // cleanup
        await prisma_1.default.student.delete({ where: { id: otherStudent.id } });
        await prisma_1.default.user.delete({ where: { id: otherUser.id } });
    });
    it("successfully updates student and converts empty strings to null", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "ToConvert",
                contactMethod: "WHATSAPP",
                phone: "+79990004444",
                parentPhone: "+70001112233",
                telegramNick: "tg_old",
                parentName: "Parent",
                notes: "Some notes",
                hourlyRate: 1500,
                grade: 9,
                tutorId: userId,
            },
        });
        const payload = {
            name: "Updated",
            parentPhone: "", // should become null
            telegramNick: "", // should become null
            parentName: "", // should become null
            phone: "", // should become null
            notes: "", // should become null
            hourlyRate: null, // should become null
            grade: null, // should become null
        };
        await (0, supertest_1.default)(index_1.app)
            .put(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(200)
            .then(async (res) => {
            expect(res.body.message).toBe("Ученик успешно обновлен");
            expect(res.body.student).toBeDefined();
            const updated = await prisma_1.default.student.findUnique({
                where: { id: student.id },
            });
            expect(updated).toBeTruthy();
            expect(updated?.name).toBe("Updated");
            expect(updated?.parentPhone).toBeNull();
            expect(updated?.telegramNick).toBeNull();
            expect(updated?.parentName).toBeNull();
            expect(updated?.phone).toBeNull();
            expect(updated?.notes).toBeNull();
            expect(updated?.hourlyRate).toBeNull();
            expect(updated?.grade).toBeNull();
        });
    });
    it("handles database errors gracefully", async () => {
        const student = await prisma_1.default.student.create({
            data: {
                name: "ErrorTest",
                contactMethod: "WHATSAPP",
                phone: faker_1.faker.phone.number(),
                tutorId: userId,
            },
        });
        const originalUpdate = prisma_1.default.student.update;
        prisma_1.default.student.update = jest
            .fn()
            .mockRejectedValueOnce(new Error("DB error"));
        await (0, supertest_1.default)(index_1.app)
            .put(`/api/students/${student.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ name: "NewName" })
            .expect(500);
        prisma_1.default.student.update = originalUpdate;
    });
});
//# sourceMappingURL=updateStudent.test.js.map