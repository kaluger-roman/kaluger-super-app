import { faker } from "@faker-js/faker";
import prisma from "../../lib/prisma";
import { hashPassword } from "../../utils/auth";
import {
  initiateEmailChange,
  verifyEmailChange,
  resendEmailChangeCode,
} from "../changeEmail";

jest.mock("../email", () => ({
  sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
}));

describe("changeEmail service", () => {
  let userId: string;
  let userEmail: string;
  const password = "Password1A";

  beforeAll(async () => {
    const hashedPassword = await hashPassword(password);
    userEmail = faker.internet.email().toLowerCase();
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        name: faker.person.fullName(),
        isEmailVerified: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("initiateEmailChange", () => {
    it("should throw 404 when user not found", async () => {
      await expect(
        initiateEmailChange("non-existent-id", "new@example.com", password),
      ).rejects.toMatchObject({ message: "Пользователь не найден", statusCode: 404 });
    });

    it("should throw 400 when password is wrong", async () => {
      await expect(
        initiateEmailChange(userId, "new@example.com", "WrongPass1"),
      ).rejects.toMatchObject({ message: "Неверный пароль", statusCode: 400 });
    });

    it("should throw 400 when email format is invalid", async () => {
      await expect(
        initiateEmailChange(userId, "invalid-email", password),
      ).rejects.toMatchObject({ message: "Некорректный формат email", statusCode: 400 });
    });

    it("should throw 400 when email is not verified", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: false },
      });

      try {
        await expect(
          initiateEmailChange(userId, "new@example.com", password),
        ).rejects.toMatchObject({ message: "Сначала подтвердите текущий email", statusCode: 400 });
      } finally {
        await prisma.user.update({
          where: { id: userId },
          data: { isEmailVerified: true },
        });
      }
    });

    it("should throw 400 when new email equals current", async () => {
      await expect(
        initiateEmailChange(userId, userEmail, password),
      ).rejects.toMatchObject({ message: "Новый email должен отличаться от текущего", statusCode: 400 });
    });

    it("should throw 409 when email already taken", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Other",
        },
      });
      try {
        await expect(
          initiateEmailChange(userId, otherUser.email, password),
        ).rejects.toMatchObject({ message: "Этот email уже используется", statusCode: 409 });
      } finally {
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });

    it("should set pendingEmail and verificationCode", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.pendingEmail).toBe(newEmail);
      expect(user!.verificationCode).toBeDefined();
      expect(user!.verificationCodeExpiry).toBeDefined();
    });
  });

  describe("verifyEmailChange", () => {
    it("should throw 400 when no pending email", async () => {
      // Reset pending email
      await prisma.user.update({
        where: { id: userId },
        data: { pendingEmail: null, verificationCode: null, verificationCodeExpiry: null },
      });

      await expect(
        verifyEmailChange(userId, "123456"),
      ).rejects.toMatchObject({ message: "Нет запроса на смену email", statusCode: 400 });
    });

    it("should throw 400 when code is wrong", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      await expect(
        verifyEmailChange(userId, "000000"),
      ).rejects.toMatchObject({ message: "Неверный код верификации", statusCode: 400 });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.verificationAttempts).toBe(1);
      expect(user!.verificationCode).not.toBeNull();
    });

    it("should invalidate code after 5 wrong attempts", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      for (let i = 0; i < 4; i++) {
        await expect(
          verifyEmailChange(userId, "000000"),
        ).rejects.toMatchObject({ statusCode: 400 });
      }

      await expect(
        verifyEmailChange(userId, "000000"),
      ).rejects.toMatchObject({
        message: "Превышено количество попыток. Запросите новый код",
        statusCode: 400,
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.verificationCode).toBeNull();
      expect(user!.verificationCodeExpiry).toBeNull();
      expect(user!.verificationAttempts).toBe(0);
      expect(user!.pendingEmail).toBe(newEmail);
    });

    it("should count concurrent wrong-code submits atomically (regression: bug-hunt 2026-05-24 #1)", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      const PARALLEL_REQUESTS = 4;
      const results = await Promise.allSettled(
        Array.from({ length: PARALLEL_REQUESTS }, () =>
          verifyEmailChange(userId, "000000"),
        ),
      );

      results.forEach((r) => {
        expect(r.status).toBe("rejected");
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.verificationAttempts).toBe(PARALLEL_REQUESTS);
    });

    it("should suggest requesting a new code after the code was invalidated", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      // Force the locked-out state: code cleared, pendingEmail preserved
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationCode: null,
          verificationCodeExpiry: null,
          verificationCodeSentAt: null,
        },
      });

      await expect(
        verifyEmailChange(userId, "000000"),
      ).rejects.toMatchObject({
        message: "Код подтверждения не найден. Запросите новый код",
        statusCode: 400,
      });
    });

    it("should throw 400 when code is expired", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      // Expire the code
      await prisma.user.update({
        where: { id: userId },
        data: { verificationCodeExpiry: new Date(Date.now() - 1000) },
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      await expect(
        verifyEmailChange(userId, user!.verificationCode!),
      ).rejects.toMatchObject({ message: "Срок действия кода верификации истёк", statusCode: 400 });
    });

    it("should change email successfully", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      const userBefore = await prisma.user.findUnique({ where: { id: userId } });
      const result = await verifyEmailChange(userId, userBefore!.verificationCode!);

      expect(result.token).toBeDefined();
      expect(result.user).toMatchObject({ email: newEmail });

      const userAfter = await prisma.user.findUnique({ where: { id: userId } });
      expect(userAfter!.email).toBe(newEmail);
      expect(userAfter!.pendingEmail).toBeNull();
      expect(userAfter!.verificationCode).toBeNull();

      // Update userEmail for subsequent tests
      userEmail = newEmail;
    });
  });

  describe("resendEmailChangeCode", () => {
    it("should throw 400 when no pending email", async () => {
      await expect(
        resendEmailChangeCode(userId),
      ).rejects.toMatchObject({ message: "Нет запроса на смену email", statusCode: 400 });
    });

    it("should generate new code", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      const userBefore = await prisma.user.findUnique({ where: { id: userId } });
      const oldCode = userBefore!.verificationCode;

      // Move sentAt past cooldown window
      await prisma.user.update({
        where: { id: userId },
        data: { verificationCodeSentAt: new Date(Date.now() - 61_000) },
      });

      await resendEmailChangeCode(userId);

      const userAfter = await prisma.user.findUnique({ where: { id: userId } });
      expect(userAfter!.verificationCode).not.toBe(oldCode);
      expect(userAfter!.pendingEmail).toBe(newEmail);
    });

    it("should throw 429 when called within 60s cooldown", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      await expect(resendEmailChangeCode(userId)).rejects.toMatchObject({
        message: "Подождите перед повторной отправкой кода",
        statusCode: 429,
      });
    });

    it("should reset verificationAttempts on resend", async () => {
      const newEmail = faker.internet.email().toLowerCase();
      await initiateEmailChange(userId, newEmail, password);

      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationAttempts: 3,
          verificationCodeSentAt: new Date(Date.now() - 61_000),
        },
      });

      await resendEmailChangeCode(userId);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.verificationAttempts).toBe(0);
    });
  });
});
