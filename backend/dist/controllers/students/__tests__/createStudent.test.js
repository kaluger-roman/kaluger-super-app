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
describe("createStudent integration tests", () => {
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
    it("returns 400 when validation fails (missing name)", async () => {
        const payload = {
            contactMethod: "WHATSAPP",
            phone: "+79990001122",
        };
        await (0, supertest_1.default)(index_1.app)
            .post("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBeDefined();
        });
    });
    it("creates student and returns 201 with student", async () => {
        const payload = {
            name: "Test Student",
            contactMethod: "WHATSAPP",
            phone: "+79990001122",
            grade: 10,
        };
        await (0, supertest_1.default)(index_1.app)
            .post("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(201)
            .then(async (res) => {
            expect(res.body.message).toBe("Ученик успешно создан");
            expect(res.body.student).toBeDefined();
            const created = await prisma_1.default.student.findUnique({
                where: { id: res.body.student.id },
            });
            expect(created).toBeTruthy();
            expect(created?.tutorId).toBe(userId);
        });
    });
    it("returns 400 when creating duplicate phone for same tutor", async () => {
        const payload = {
            name: "Dup Student",
            contactMethod: "WHATSAPP",
            phone: "+79990009999",
        };
        // first create should succeed
        await (0, supertest_1.default)(index_1.app)
            .post("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(201);
        // second create with same phone should trigger unique constraint
        await (0, supertest_1.default)(index_1.app)
            .post("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBe("У вас уже есть ученик с таким номером телефона");
        });
    });
    it("returns 400 when contactMethod is missing", async () => {
        const payload = {
            name: "NoContact",
            // contactMethod missing
        };
        await (0, supertest_1.default)(index_1.app)
            .post("/api/students")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload)
            .expect(400)
            .then((res) => {
            expect(res.body.error).toBe("Не выбран способ связи (WhatsApp или Telegram)");
        });
    });
});
//# sourceMappingURL=createStudent.test.js.map