import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
import { hashPassword } from "../../utils";
import { issueInvitation } from "../studentInvitation";
import {
  getStudentSettings,
  loginStudent,
  registerStudentByInvite,
} from "../studentAuth";

jest.mock("../email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

const VALID_PASSWORD = "StrongPass1";

const extractTokenFromUrl = (url: string): string =>
  url.split("/").pop() as string;

describe("studentAuth service", () => {
  let tutorId: string;
  let studentId: string;

  beforeAll(async () => {
    if (!process.env.FRONTEND_URL)
      process.env.FRONTEND_URL = "http://localhost:3000";

    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Анна Петрова",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;

    const student = await prisma.student.create({
      data: { name: "Петя Сидоров", tutorId },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.studentInvitation
      .deleteMany({ where: { tutorId } })
      .catch(() => undefined);
    await prisma.studentUser
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await prisma.student
      .delete({ where: { id: studentId } })
      .catch(() => undefined);
    await prisma.user.delete({ where: { id: tutorId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.studentInvitation.deleteMany({ where: { studentId } });
    await prisma.studentUser.deleteMany({ where: { studentId } });
  });

  describe("registerStudentByInvite", () => {
    const buildDto = async () => {
      const issued = await issueInvitation(tutorId, studentId);
      expect(issued.ok).toBe(true);
      if (!issued.ok) throw new Error("issue failed");
      return {
        token: extractTokenFromUrl(issued.inviteUrl),
        name: "Пётр Сидоров",
        email: faker.internet.email().toLowerCase(),
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      };
    };

    it("creates a StudentUser and consumes the invitation atomically", async () => {
      const dto = await buildDto();
      const result = await registerStudentByInvite(dto);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.token).toEqual(expect.any(String));
      expect(result.data.student.email).toBe(dto.email);
      expect(result.data.student.tutor).toEqual({ name: "Анна Петрова" });

      const user = await prisma.studentUser.findUnique({
        where: { email: dto.email },
      });
      expect(user).not.toBeNull();
      expect(user?.studentId).toBe(studentId);

      const invitations = await prisma.studentInvitation.findMany({
        where: { studentId },
      });
      expect(invitations.every((i) => i.status === "USED")).toBe(true);
    });

    it("rejects mismatched password confirmation", async () => {
      const dto = await buildDto();
      const result = await registerStudentByInvite({
        ...dto,
        passwordConfirmation: "OtherPass1",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects weak password without consuming invitation", async () => {
      const dto = await buildDto();
      const result = await registerStudentByInvite({
        ...dto,
        password: "weak",
        passwordConfirmation: "weak",
      });
      expect(result.ok).toBe(false);
      const invitations = await prisma.studentInvitation.findMany({
        where: { studentId, status: "PENDING" },
      });
      expect(invitations).toHaveLength(1);
    });

    it("rejects invalid email", async () => {
      const dto = await buildDto();
      const result = await registerStudentByInvite({
        ...dto,
        email: "not-an-email",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 410 for an already-used invitation", async () => {
      const dto = await buildDto();
      const first = await registerStudentByInvite(dto);
      expect(first.ok).toBe(true);
      const second = await registerStudentByInvite({
        ...dto,
        email: faker.internet.email().toLowerCase(),
      });
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.status).toBe(410);
    });

    it("returns 409 when email already exists in student_users", async () => {
      const existingEmail = faker.internet.email().toLowerCase();
      await prisma.studentUser.create({
        data: {
          email: existingEmail,
          password: await hashPassword("Other1234"),
          name: "Уже зарегистрирован",
        },
      });

      const dto = await buildDto();
      const result = await registerStudentByInvite({
        ...dto,
        email: existingEmail,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(409);

      await prisma.studentUser.delete({ where: { email: existingEmail } });
    });
  });

  describe("loginStudent", () => {
    let registeredEmail: string;

    beforeEach(async () => {
      const dto = {
        token: "",
        name: "Тест",
        email: faker.internet.email().toLowerCase(),
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      };
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      dto.token = extractTokenFromUrl(issued.inviteUrl);

      const result = await registerStudentByInvite(dto);
      if (!result.ok) throw new Error("register failed");
      registeredEmail = dto.email;
    });

    it("accepts correct credentials and returns a session", async () => {
      const result = await loginStudent({
        email: registeredEmail,
        password: VALID_PASSWORD,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.token).toEqual(expect.any(String));
      expect(result.data.student.email).toBe(registeredEmail);
    });

    it("returns the same 401 for both wrong password and unknown email", async () => {
      const wrongPassword = await loginStudent({
        email: registeredEmail,
        password: "WrongPass1",
      });
      const unknownEmail = await loginStudent({
        email: "nobody@example.com",
        password: VALID_PASSWORD,
      });
      expect(wrongPassword.ok).toBe(false);
      expect(unknownEmail.ok).toBe(false);
      if (!wrongPassword.ok && !unknownEmail.ok) {
        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.error).toBe(unknownEmail.error);
      }
    });
  });

  describe("getStudentSettings", () => {
    let studentUserId: string;

    beforeEach(async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const result = await registerStudentByInvite({
        token: extractTokenFromUrl(issued.inviteUrl),
        name: "Пётр",
        email: faker.internet.email().toLowerCase(),
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      });
      if (!result.ok) throw new Error("register failed");
      studentUserId = result.data.student.id;
    });

    it("returns name, email and tutor name", async () => {
      const settings = await getStudentSettings(studentUserId);
      expect(settings).toMatchObject({
        name: "Пётр",
        tutor: { name: "Анна Петрова" },
      });
    });

    it("returns tutor=null after Student card is deleted", async () => {
      await prisma.student.delete({ where: { id: studentId } });
      const settings = await getStudentSettings(studentUserId);
      expect(settings?.tutor).toBeNull();

      // Recreate for subsequent tests
      const recreated = await prisma.student.create({
        data: { id: studentId, name: "Петя Сидоров", tutorId },
      });
      expect(recreated.id).toBe(studentId);
    });
  });
});
