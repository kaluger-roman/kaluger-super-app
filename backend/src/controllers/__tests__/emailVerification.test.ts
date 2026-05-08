import request from "supertest";
import prisma from "../../lib/prisma";
import { app } from "../../index";
import { faker } from "@faker-js/faker";
import * as emailService from "../../services/email";

jest.mock("../../services/email");

describe("Email Verification Controller", () => {
  const mockSendVerificationEmail =
    emailService.sendVerificationEmail as jest.MockedFunction<
      typeof emailService.sendVerificationEmail
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendVerificationEmail.mockResolvedValue();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/auth/verify-email", () => {
    it("should return 400 when email or code is missing", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email и код подтверждения обязательны");
    });

    it("should return 400 when only code is provided", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ code: "123456" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email и код подтверждения обязательны");
    });

    it("should return 404 when user not found", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: "nonexistent@example.com", code: "123456" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Пользователь не найден");
    });

    it("should return 400 when email already verified", async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: true,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: user.email, code: "123456" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email уже подтвержден");

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should return 400 when verification code not found", async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: user.email, code: "123456" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Код подтверждения не найден. Запросите новый код",
      );

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should return 400 when verification code is expired", async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 20); // 20 минут назад

      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
          verificationCode: "123456",
          verificationCodeExpiry: expiredDate,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: user.email, code: "123456" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Срок действия кода истек. Запросите новый код",
      );

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should return 400 when verification code is incorrect", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);

      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
          verificationCode: "123456",
          verificationCodeExpiry: futureDate,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: user.email, code: "654321" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Неверный код подтверждения");

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.verificationAttempts).toBe(1);
      expect(updatedUser?.verificationCode).toBe("123456");

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should invalidate code after 5 wrong attempts", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);

      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
          verificationCode: "123456",
          verificationCodeExpiry: futureDate,
          verificationAttempts: 4,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ email: user.email, code: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Превышено количество попыток. Запросите новый код",
      );

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.verificationCode).toBeNull();
      expect(updatedUser?.verificationCodeExpiry).toBeNull();
      expect(updatedUser?.verificationAttempts).toBe(0);
      expect(updatedUser?.isEmailVerified).toBe(false);

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should successfully verify email and return token", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      const verificationCode = "123456";

      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
          verificationCode,
          verificationCodeExpiry: futureDate,
          verificationAttempts: 2,
        },
      });

      const res = await request(app)
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

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.isEmailVerified).toBe(true);
      expect(updatedUser?.verificationCode).toBeNull();
      expect(updatedUser?.verificationCodeExpiry).toBeNull();
      expect(updatedUser?.verificationAttempts).toBe(0);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe("POST /api/auth/resend-verification", () => {
    it("should return 400 when email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email обязателен");
    });

    it("should return 404 when user not found", async () => {
      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Пользователь не найден");
    });

    it("should return 400 when email already verified", async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: true,
        },
      });

      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: user.email });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email уже подтвержден");

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should generate new code and send email successfully", async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
          verificationAttempts: 3,
        },
      });

      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Код подтверждения отправлен на email");

      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        user.email,
        expect.any(String),
      );

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.verificationCode).toBeDefined();
      expect(updatedUser?.verificationCodeExpiry).toBeDefined();
      expect(updatedUser?.verificationCode).toHaveLength(6);
      expect(updatedUser?.verificationAttempts).toBe(0);
      expect(updatedUser?.verificationCodeSentAt).not.toBeNull();

      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should return 500 when email sending fails", async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
          isEmailVerified: false,
        },
      });

      mockSendVerificationEmail.mockRejectedValueOnce(
        new Error("Email service error"),
      );

      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: user.email });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Ошибка отправки письма. Попробуйте позже");

      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
