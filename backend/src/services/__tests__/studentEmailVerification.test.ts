import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
import { verifyStudentEmailCode } from "../studentEmailVerification";
import { MAX_VERIFICATION_ATTEMPTS } from "../../utils/verification";

jest.mock("../email", () => ({
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

describe("studentEmailVerification service", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("verifyStudentEmailCode", () => {
    it("locks the user out under concurrent wrong-code requests (regression: non-atomic verificationAttempts increment)", async () => {
      // Если increment делать через read-modify-write, параллельные запросы
      // читают одинаковый снапшот, перезаписывают друг друга — и счётчик
      // никогда не достигает MAX_VERIFICATION_ATTEMPTS. Атомарный
      // `{ increment: 1 }` сериализует инкременты в БД.
      const studentUser = await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "x",
          name: "Race Test",
          isEmailVerified: false,
          verificationCode: "123456",
          verificationCodeExpiry: new Date(Date.now() + 60 * 60 * 1000),
          verificationCodeSentAt: new Date(),
          verificationAttempts: 0,
        },
      });

      try {
        const concurrent = MAX_VERIFICATION_ATTEMPTS + 1;
        const results = await Promise.all(
          Array.from({ length: concurrent }).map(() =>
            verifyStudentEmailCode(studentUser.id, "000000")
          )
        );

        const after = await prisma.studentUser.findUnique({
          where: { id: studentUser.id },
        });

        expect(after?.verificationCode).toBeNull();
        expect(after?.verificationCodeExpiry).toBeNull();
        expect(
          results.some((r) => !r.ok && r.reason === "attempts_exceeded")
        ).toBe(true);
      } finally {
        await prisma.studentUser.delete({ where: { id: studentUser.id } });
      }
    });

    it("returns wrong_code and increments the counter on a single wrong attempt", async () => {
      const studentUser = await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "x",
          name: "Increment Test",
          isEmailVerified: false,
          verificationCode: "123456",
          verificationCodeExpiry: new Date(Date.now() + 60 * 60 * 1000),
          verificationCodeSentAt: new Date(),
          verificationAttempts: 0,
        },
      });

      try {
        const result = await verifyStudentEmailCode(studentUser.id, "000000");
        const after = await prisma.studentUser.findUnique({
          where: { id: studentUser.id },
        });

        expect(result).toEqual({ ok: false, reason: "wrong_code" });
        expect(after?.verificationAttempts).toBe(1);
        expect(after?.verificationCode).toBe("123456");
      } finally {
        await prisma.studentUser.delete({ where: { id: studentUser.id } });
      }
    });

    it("verifies and clears the code on the correct attempt", async () => {
      const studentUser = await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "x",
          name: "Success Test",
          isEmailVerified: false,
          verificationCode: "654321",
          verificationCodeExpiry: new Date(Date.now() + 60 * 60 * 1000),
          verificationCodeSentAt: new Date(),
          verificationAttempts: 0,
        },
      });

      try {
        const result = await verifyStudentEmailCode(studentUser.id, "654321");
        const after = await prisma.studentUser.findUnique({
          where: { id: studentUser.id },
        });

        expect(result).toEqual({ ok: true });
        expect(after?.isEmailVerified).toBe(true);
        expect(after?.verificationCode).toBeNull();
      } finally {
        await prisma.studentUser.delete({ where: { id: studentUser.id } });
      }
    });
  });
});
