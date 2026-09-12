import { faker } from "@faker-js/faker";
import { prisma } from "../../lib/prisma";
import { verifyToken } from "../../utils/auth";
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  TaxPeriodsRequiredError,
  UserAlreadyExistsError,
} from "../../utils";
import { getUserProfile, loginUser, registerUser, updateUserProfile } from "../auth";
import { sendVerificationEmail } from "../email";

jest.mock("../email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

describe("auth service", () => {
  const password = "Password1A";
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  const register = async () => {
    const email = faker.internet.email().toLowerCase();
    const user = await registerUser({ email, password, name: "Тест" });
    createdUserIds.push(user.id);
    return { email, user };
  };

  describe("registerUser", () => {
    it("should create an unverified user and send the verification code", async () => {
      const { email, user } = await register();

      expect(user).toMatchObject({ email, name: "Тест", isEmailVerified: false });
      expect(user).not.toHaveProperty("password");
      expect(sendVerificationEmail).toHaveBeenCalledWith(email, expect.any(String));
      const stored = await prisma.user.findUnique({ where: { id: user.id } });
      expect(stored?.verificationCode).toBeTruthy();
      expect(stored?.password).not.toBe(password);
    });

    it("should throw UserAlreadyExistsError for a duplicate email", async () => {
      const { email } = await register();
      await expect(registerUser({ email, password, name: "Тест" })).rejects.toBeInstanceOf(
        UserAlreadyExistsError
      );
    });

    it("should still register when the email fails to send", async () => {
      (sendVerificationEmail as jest.Mock).mockRejectedValueOnce(new Error("smtp down"));
      const { user } = await register();
      expect(user.id).toBeTruthy();
    });
  });

  describe("loginUser", () => {
    it("should throw InvalidCredentialsError for an unknown email", async () => {
      await expect(loginUser({ email: "nobody@example.com", password })).rejects.toBeInstanceOf(
        InvalidCredentialsError
      );
    });

    it("should throw InvalidCredentialsError for a wrong password", async () => {
      const { email } = await register();
      await expect(loginUser({ email, password: "WrongPass1" })).rejects.toBeInstanceOf(
        InvalidCredentialsError
      );
    });

    it("should throw EmailNotVerifiedError until the email is confirmed", async () => {
      const { email } = await register();
      await expect(loginUser({ email, password })).rejects.toBeInstanceOf(EmailNotVerifiedError);
    });

    it("should return a token carrying userId and tokenVersion for a verified user", async () => {
      const { email, user } = await register();
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, tokenVersion: 3 },
      });

      const result = await loginUser({ email, password });

      expect(result.user).toMatchObject({ id: user.id, isEmailVerified: true });
      expect(verifyToken(result.token)).toMatchObject({
        userId: user.id,
        tokenVersion: 3,
      });
    });
  });

  describe("getUserProfile", () => {
    it("should return the public profile with createdAt", async () => {
      const { user } = await register();
      const profile = await getUserProfile(user.id);
      expect(profile).toMatchObject({ id: user.id, email: user.email });
      expect(profile?.createdAt).toBeInstanceOf(Date);
      expect(profile).not.toHaveProperty("password");
    });

    it("should return null for an unknown user", async () => {
      expect(await getUserProfile("missing-id")).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("should update the name", async () => {
      const { user } = await register();
      const updated = await updateUserProfile(user.id, { name: "Новое имя" });
      expect(updated.name).toBe("Новое имя");
    });

    it("should refuse to enable tax without rate periods", async () => {
      const { user } = await register();
      await expect(updateUserProfile(user.id, { taxEnabled: true })).rejects.toBeInstanceOf(
        TaxPeriodsRequiredError
      );
      const stored = await prisma.user.findUnique({ where: { id: user.id } });
      expect(stored?.taxEnabled).toBe(false);
    });

    it("should enable tax when at least one rate period exists", async () => {
      const { user } = await register();
      await prisma.taxRatePeriod.create({
        data: { userId: user.id, startDate: new Date("2026-01-01"), rate: 6 },
      });
      const updated = await updateUserProfile(user.id, { taxEnabled: true });
      expect(updated.taxEnabled).toBe(true);
    });
  });
});
