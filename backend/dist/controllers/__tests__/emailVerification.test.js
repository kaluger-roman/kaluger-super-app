"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const index_1 = require("../../index");
const faker_1 = require("@faker-js/faker");
const emailService = __importStar(require("../../services/email"));
jest.mock("../../services/email");
describe("Email Verification Controller", () => {
    const mockSendVerificationEmail = emailService.sendVerificationEmail;
    beforeEach(() => {
        jest.clearAllMocks();
        mockSendVerificationEmail.mockResolvedValue();
    });
    afterAll(async () => {
        await prisma_1.default.$disconnect();
    });
    describe("POST /api/auth/verify-email", () => {
        it("should return 400 when email or code is missing", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: "test@example.com" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email и код подтверждения обязательны");
        });
        it("should return 400 when only code is provided", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ code: "123456" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email и код подтверждения обязательны");
        });
        it("should return 404 when user not found", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: "nonexistent@example.com", code: "123456" });
            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Пользователь не найден");
        });
        it("should return 400 when email already verified", async () => {
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: true,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: user.email, code: "123456" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email уже подтвержден");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should return 400 when verification code not found", async () => {
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: user.email, code: "123456" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Код подтверждения не найден. Запросите новый код");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should return 400 when verification code is expired", async () => {
            const expiredDate = new Date();
            expiredDate.setMinutes(expiredDate.getMinutes() - 20); // 20 минут назад
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                    verificationCode: "123456",
                    verificationCodeExpiry: expiredDate,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: user.email, code: "123456" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Срок действия кода истек. Запросите новый код");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should return 400 when verification code is incorrect", async () => {
            const futureDate = new Date();
            futureDate.setMinutes(futureDate.getMinutes() + 15);
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                    verificationCode: "123456",
                    verificationCodeExpiry: futureDate,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: user.email, code: "654321" });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Неверный код подтверждения");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should successfully verify email and return token", async () => {
            const futureDate = new Date();
            futureDate.setMinutes(futureDate.getMinutes() + 15);
            const verificationCode = "123456";
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                    verificationCode,
                    verificationCodeExpiry: futureDate,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/verify-email")
                .send({ email: user.email, code: verificationCode });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Email успешно подтвержден");
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toMatchObject({
                id: user.id,
                email: user.email,
                name: user.name,
                isEmailVerified: true,
            });
            const updatedUser = await prisma_1.default.user.findUnique({
                where: { id: user.id },
            });
            expect(updatedUser?.isEmailVerified).toBe(true);
            expect(updatedUser?.verificationCode).toBeNull();
            expect(updatedUser?.verificationCodeExpiry).toBeNull();
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
    });
    describe("POST /api/auth/resend-verification", () => {
        it("should return 400 when email is missing", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/resend-verification")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email обязателен");
        });
        it("should return 404 when user not found", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/resend-verification")
                .send({ email: "nonexistent@example.com" });
            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Пользователь не найден");
        });
        it("should return 400 when email already verified", async () => {
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: true,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/resend-verification")
                .send({ email: user.email });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email уже подтвержден");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should generate new code and send email successfully", async () => {
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/resend-verification")
                .send({ email: user.email });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Код подтверждения отправлен на email");
            expect(mockSendVerificationEmail).toHaveBeenCalledWith(user.email, expect.any(String));
            const updatedUser = await prisma_1.default.user.findUnique({
                where: { id: user.id },
            });
            expect(updatedUser?.verificationCode).toBeDefined();
            expect(updatedUser?.verificationCodeExpiry).toBeDefined();
            expect(updatedUser?.verificationCode).toHaveLength(6);
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
        it("should return 500 when email sending fails", async () => {
            const user = await prisma_1.default.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: "hashed",
                    name: faker_1.faker.person.fullName(),
                    isEmailVerified: false,
                },
            });
            mockSendVerificationEmail.mockRejectedValueOnce(new Error("Email service error"));
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/auth/resend-verification")
                .send({ email: user.email });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe("Ошибка отправки письма. Попробуйте позже");
            await prisma_1.default.user.delete({ where: { id: user.id } });
        });
    });
});
//# sourceMappingURL=emailVerification.test.js.map