import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../index";
import prisma from "../../lib/prisma";
import { generateToken, hashPassword } from "../../utils/auth";

jest.mock("../../services/email", () => ({
  sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
}));

describe("Change Email Endpoints", () => {
  let authToken: string;
  let userId: string;
  let userEmail: string;
  const password = "Password1A";

  beforeAll(async () => {
    const hashedPassword = await hashPassword(password);
    userEmail = faker.internet.email();
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        name: faker.person.fullName(),
        isEmailVerified: true,
      },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("POST /api/auth/change-email", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/auth/change-email")
        .send({ newEmail: "new@example.com", password });
      expect(res.status).toBe(401);
    });

    it("should return 400 when fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail: "new@example.com" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Все поля обязательны для заполнения");
    });

    it("should return 400 when password is wrong", async () => {
      const res = await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail: "new@example.com", password: "WrongPass1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Неверный пароль");
    });

    it("should return 400 when new email equals current", async () => {
      const res = await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail: userEmail, password });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Новый email должен отличаться от текущего");
    });

    it("should initiate email change successfully", async () => {
      const newEmail = faker.internet.email();
      const res = await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail, password });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Код верификации отправлен на новый email");

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.pendingEmail).toBe(newEmail);
    });
  });

  describe("POST /api/auth/verify-email-change", () => {
    it("should return 400 when code is missing", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email-change")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Код верификации обязателен");
    });

    it("should return 400 when code is wrong", async () => {
      // Ensure there's a pending email change
      const newEmail = faker.internet.email();
      await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail, password });

      const res = await request(app)
        .post("/api/auth/verify-email-change")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "000000" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Неверный код верификации");
    });

    it("should verify and change email successfully", async () => {
      const newEmail = faker.internet.email();
      await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail, password });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const code = user!.verificationCode!;

      const res = await request(app)
        .post("/api/auth/verify-email-change")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Email успешно изменён");
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(newEmail);

      // Update for subsequent tests
      userEmail = newEmail;
      authToken = res.body.token;
    });
  });

  describe("POST /api/auth/resend-email-change-code", () => {
    it("should return 400 when no pending email change", async () => {
      const res = await request(app)
        .post("/api/auth/resend-email-change-code")
        .set("Authorization", `Bearer ${authToken}`)
        .send();
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Нет запроса на смену email");
    });

    it("should return 429 when within cooldown window", async () => {
      const newEmail = faker.internet.email();
      await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail, password });

      const res = await request(app)
        .post("/api/auth/resend-email-change-code")
        .set("Authorization", `Bearer ${authToken}`)
        .send();
      expect(res.status).toBe(429);
      expect(res.body.error).toBe("Подождите перед повторной отправкой кода");
    });

    it("should resend code successfully after cooldown", async () => {
      const newEmail = faker.internet.email();
      await request(app)
        .post("/api/auth/change-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newEmail, password });

      await prisma.user.update({
        where: { id: userId },
        data: { verificationCodeSentAt: new Date(Date.now() - 61_000) },
      });

      const res = await request(app)
        .post("/api/auth/resend-email-change-code")
        .set("Authorization", `Bearer ${authToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Код верификации повторно отправлен");
    });
  });
});
