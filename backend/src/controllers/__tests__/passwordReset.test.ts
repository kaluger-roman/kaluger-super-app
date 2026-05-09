import request from "supertest";
import { faker } from "@faker-js/faker";

jest.mock("../../services/email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
}));

import { app } from "../../index";
import prisma from "../../lib/prisma";
import { createResetToken, hashPassword, comparePassword } from "../../utils";
import { sendPasswordResetEmail } from "../../services/email";

const ORIGINAL_PASSWORD = "OldPassword1";
const VALID_NEW_PASSWORD = "NewPassword1";

describe("Password reset endpoints", () => {
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    if (!process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL = "http://localhost:3000";
    }
    const hashedPassword = await hashPassword(ORIGINAL_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: hashedPassword,
        name: faker.person.fullName(),
        isEmailVerified: true,
      },
    });
    userId = user.id;
    userEmail = user.email;
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    (sendPasswordResetEmail as jest.Mock).mockClear();
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(ORIGINAL_PASSWORD), isEmailVerified: true },
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("should return 400 when email is missing", async () => {
      const res = await request(app).post("/api/auth/forgot-password").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email обязателен");
    });

    it("should return 400 for malformed email", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Некорректный формат email");
    });

    it("should return neutral 200 and send email when user exists", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: userEmail });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Если адрес зарегистрирован/);
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

      const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
      expect(tokens).toHaveLength(1);
    });

    it("should return the same neutral 200 when user does not exist and not send email", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nobody@example.com" });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Если адрес зарегистрирован/);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/reset-password/verify", () => {
    it("should return 200 valid for a fresh token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
      });

      const res = await request(app)
        .post("/api/auth/reset-password/verify")
        .send({ token });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: true });
    });

    it("should return 400 for missing token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password/verify")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Токен обязателен");
    });

    it("should return 400 for unknown token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password/verify")
        .send({ token: "some-fake-token" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ссылка для сброса пароля недействительна");
    });

    it("should return 400 for expired token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt: new Date(Date.now() - 60_000) },
      });

      const res = await request(app)
        .post("/api/auth/reset-password/verify")
        .send({ token });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Срок действия ссылки истёк. Запросите новую");
    });

    it("should return 400 for used token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: new Date(),
        },
      });

      const res = await request(app)
        .post("/api/auth/reset-password/verify")
        .send({ token });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Эта ссылка уже была использована. Запросите новую");
    });
  });

  describe("POST /api/auth/reset-password", () => {
    const createValidToken = async () => {
      const { token, tokenHash } = createResetToken();
      const record = await prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
      });
      return { token, recordId: record.id };
    };

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token: "x" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Все поля обязательны для заполнения");
    });

    it("should return 400 when passwords do not match", async () => {
      const { token } = await createValidToken();
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, newPassword: "NewPassword1", confirmPassword: "Different1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Пароли не совпадают");
    });

    it("should return 400 when password fails complexity rules", async () => {
      const { token } = await createValidToken();
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, newPassword: "short", confirmPassword: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Пароль должен содержать/);
    });

    it("should return 400 when new password matches current password", async () => {
      const { token } = await createValidToken();
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: ORIGINAL_PASSWORD,
          confirmPassword: ORIGINAL_PASSWORD,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Новый пароль должен отличаться от текущего");
    });

    it("should reset password and login should succeed with new password", async () => {
      const { token, recordId } = await createValidToken();

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: VALID_NEW_PASSWORD,
          confirmPassword: VALID_NEW_PASSWORD,
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Пароль успешно изменён");

      const used = await prisma.passwordResetToken.findUnique({ where: { id: recordId } });
      expect(used?.usedAt).not.toBeNull();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(await comparePassword(VALID_NEW_PASSWORD, user!.password)).toBe(true);

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: userEmail, password: VALID_NEW_PASSWORD });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();

      const loginOldRes = await request(app)
        .post("/api/auth/login")
        .send({ email: userEmail, password: ORIGINAL_PASSWORD });
      expect(loginOldRes.status).toBe(401);
    });

    it("should reject reuse of a used token", async () => {
      const { token } = await createValidToken();

      await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: VALID_NEW_PASSWORD,
          confirmPassword: VALID_NEW_PASSWORD,
        })
        .expect(200);

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: "AnotherPassword1",
          confirmPassword: "AnotherPassword1",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Эта ссылка уже была использована. Запросите новую");
    });
  });
});
