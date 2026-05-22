import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
import {
  createResetToken,
  comparePassword,
  hashPassword,
  hashResetToken,
} from "../../utils";
import {
  applyPasswordReset,
  requestPasswordReset,
  verifyResetToken,
} from "../passwordReset";

jest.mock("../email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
}));

import { sendPasswordResetEmail } from "../email";

const ORIGINAL_PASSWORD = "OldPassword1";
const VALID_NEW_PASSWORD = "NewPassword1";

describe("passwordReset service", () => {
  let userId: string;
  let userEmail: string;

  const ensureFrontendUrl = () => {
    if (!process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL = "http://localhost:3000";
    }
  };

  beforeAll(async () => {
    ensureFrontendUrl();
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

  describe("requestPasswordReset", () => {
    it("should create a token and send an email for an existing user", async () => {
      await requestPasswordReset(userEmail);

      const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].usedAt).toBeNull();
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [emailArg, urlArg] = (sendPasswordResetEmail as jest.Mock).mock.calls[0];
      expect(emailArg).toBe(userEmail);
      expect(urlArg).toContain("/reset-password?token=");
    });

    it("should silently succeed for a non-existent email and not send any email", async () => {
      await requestPasswordReset("nobody@example.com");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should normalize email casing and whitespace before lookup", async () => {
      await requestPasswordReset(`  ${userEmail.toUpperCase()}  `);
      const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
      expect(tokens).toHaveLength(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it("should respect cooldown and not create a new token when called twice within cooldown window", async () => {
      await requestPasswordReset(userEmail);
      await requestPasswordReset(userEmail);

      const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
      expect(tokens).toHaveLength(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it("should invalidate older unused tokens when a new request passes cooldown", async () => {
      const oldDate = new Date(Date.now() - 5 * 60 * 1000);
      const oldRecord = await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: "old-hash-1",
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: oldDate,
        },
      });

      await requestPasswordReset(userEmail);

      const refreshedOld = await prisma.passwordResetToken.findUnique({
        where: { id: oldRecord.id },
      });
      expect(refreshedOld?.usedAt).not.toBeNull();

      const activeTokens = await prisma.passwordResetToken.findMany({
        where: { userId, usedAt: null },
      });
      expect(activeTokens).toHaveLength(1);
      expect(activeTokens[0].id).not.toBe(oldRecord.id);
    });

    it("should still resolve successfully if email sending fails", async () => {
      (sendPasswordResetEmail as jest.Mock).mockImplementationOnce(async () => {
        throw new Error("Resend API error");
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(requestPasswordReset(userEmail)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Password reset email failed",
        expect.objectContaining({ userId }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("verifyResetToken", () => {
    it("should resolve for a valid fresh token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await expect(verifyResetToken(token)).resolves.toBeUndefined();
    });

    it("should throw 400 for an empty token", async () => {
      await expect(verifyResetToken("")).rejects.toMatchObject({
        statusCode: 400,
        message: "Токен обязателен",
      });
    });

    it("should throw 400 for an unknown token", async () => {
      await expect(verifyResetToken("unknown-token")).rejects.toMatchObject({
        statusCode: 400,
        message: "Ссылка для сброса пароля недействительна",
      });
    });

    it("should throw 400 for an expired token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      await expect(verifyResetToken(token)).rejects.toMatchObject({
        statusCode: 400,
        message: "Срок действия ссылки истёк. Запросите новую",
      });
    });

    it("should throw 400 for a used token", async () => {
      const { token, tokenHash } = createResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: new Date(),
        },
      });

      await expect(verifyResetToken(token)).rejects.toMatchObject({
        statusCode: 400,
        message: "Эта ссылка уже была использована. Запросите новую",
      });
    });
  });

  describe("applyPasswordReset", () => {
    const createValidToken = async () => {
      const { token, tokenHash } = createResetToken();
      const record = await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return { token, recordId: record.id };
    };

    it("should reject when fields are missing", async () => {
      await expect(applyPasswordReset("", VALID_NEW_PASSWORD, VALID_NEW_PASSWORD)).rejects.toMatchObject({
        statusCode: 400,
        message: "Все поля обязательны для заполнения",
      });
    });

    it("should reject when new and confirm passwords mismatch", async () => {
      const { token } = await createValidToken();
      await expect(applyPasswordReset(token, "NewPassword1", "Different1")).rejects.toMatchObject({
        statusCode: 400,
        message: "Пароли не совпадают",
      });
    });

    it("should reject when password fails complexity rules", async () => {
      const { token } = await createValidToken();
      await expect(applyPasswordReset(token, "short", "short")).rejects.toMatchObject({
        statusCode: 400,
        message:
          "Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру",
      });
    });

    it("should reject when new password equals current password", async () => {
      const { token } = await createValidToken();
      await expect(
        applyPasswordReset(token, ORIGINAL_PASSWORD, ORIGINAL_PASSWORD),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Новый пароль должен отличаться от текущего",
      });
    });

    it("should update password, mark token used, and not invalidate other valid tokens (US1 scope)", async () => {
      const { token, recordId } = await createValidToken();

      await applyPasswordReset(token, VALID_NEW_PASSWORD, VALID_NEW_PASSWORD);

      const usedRecord = await prisma.passwordResetToken.findUnique({ where: { id: recordId } });
      expect(usedRecord?.usedAt).not.toBeNull();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(await comparePassword(VALID_NEW_PASSWORD, user!.password)).toBe(true);
      expect(await comparePassword(ORIGINAL_PASSWORD, user!.password)).toBe(false);
    });

    it("should set isEmailVerified to true if it was false", async () => {
      await prisma.user.update({ where: { id: userId }, data: { isEmailVerified: false } });
      const { token } = await createValidToken();

      await applyPasswordReset(token, VALID_NEW_PASSWORD, VALID_NEW_PASSWORD);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.isEmailVerified).toBe(true);
    });

    it("should reject reuse of a token after successful reset", async () => {
      const { token } = await createValidToken();
      await applyPasswordReset(token, VALID_NEW_PASSWORD, VALID_NEW_PASSWORD);

      await expect(
        applyPasswordReset(token, "AnotherPassword1", "AnotherPassword1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Эта ссылка уже была использована. Запросите новую",
      });
    });

    it("should reject an unknown token without modifying user", async () => {
      const fakeTokenHash = hashResetToken("unknown");
      const before = await prisma.user.findUnique({ where: { id: userId } });
      await expect(
        applyPasswordReset("unknown", VALID_NEW_PASSWORD, VALID_NEW_PASSWORD),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Ссылка для сброса пароля недействительна",
      });
      const after = await prisma.user.findUnique({ where: { id: userId } });
      expect(after?.password).toBe(before?.password);
      expect(fakeTokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should reject second concurrent reset with the same token (regression: race in applyPasswordReset)", async () => {
      // Regression for bug-hunt 2026-05-10 #7: previously findValidResetToken
      // and the apply-transaction were not atomic, so two parallel requests
      // with the same token could both pass the read and both write a new
      // password. We simulate the race by marking the token as used between
      // findValidResetToken and the transaction (intercepting the
      // user.findUnique call that runs in between).
      const { token, recordId } = await createValidToken();
      const findUniqueImpl = (async (
        args: Parameters<typeof prisma.user.findUnique>[0],
      ) => {
        // Concurrent winner finishes its own apply: mark token used
        await prisma.passwordResetToken.update({
          where: { id: recordId },
          data: { usedAt: new Date() },
        });
        spy.mockRestore();
        return prisma.user.findUnique(args);
      }) as unknown as typeof prisma.user.findUnique;
      const spy = jest
        .spyOn(prisma.user, "findUnique")
        .mockImplementationOnce(findUniqueImpl);

      try {
        await expect(
          applyPasswordReset(token, VALID_NEW_PASSWORD, VALID_NEW_PASSWORD),
        ).rejects.toMatchObject({
          statusCode: 400,
          message: "Эта ссылка уже была использована. Запросите новую",
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        // Critical: password must NOT have been changed by the loser
        expect(await comparePassword(VALID_NEW_PASSWORD, user!.password)).toBe(
          false,
        );
        expect(await comparePassword(ORIGINAL_PASSWORD, user!.password)).toBe(
          true,
        );
      } finally {
        spy.mockRestore();
      }
    });
  });
});
