import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
import { hashInvitationToken } from "../../utils/studentInvitationToken";
import {
  getInvitationStatus,
  issueInvitation,
  revokeInvitation,
  validateRawToken,
} from "../studentInvitation";

jest.mock("../email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

describe("studentInvitation service", () => {
  let tutorId: string;
  let otherTutorId: string;
  let studentId: string;
  let archivedStudentId: string;
  let registeredStudentId: string;

  beforeAll(async () => {
    if (!process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL = "http://localhost:3000";
    }

    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Учитель Тест",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;

    const otherTutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Другой Учитель",
        isEmailVerified: true,
      },
    });
    otherTutorId = otherTutor.id;

    const student = await prisma.student.create({
      data: { name: "Иван Иванов", tutorId },
    });
    studentId = student.id;

    const archived = await prisma.student.create({
      data: {
        name: "Архивированный",
        tutorId,
        archived: true,
        archivedAt: new Date(),
      },
    });
    archivedStudentId = archived.id;

    const registered = await prisma.student.create({
      data: { name: "Зарегистрированный", tutorId },
    });
    registeredStudentId = registered.id;
    await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Зарегистрированный",
        studentId: registeredStudentId,
      },
    });
  });

  afterAll(async () => {
    await prisma.studentInvitation
      .deleteMany({ where: { tutorId } })
      .catch(() => undefined);
    await prisma.studentInvitation
      .deleteMany({ where: { tutorId: otherTutorId } })
      .catch(() => undefined);
    await prisma.studentUser
      .deleteMany({ where: { studentId: registeredStudentId } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({
        where: { id: { in: [studentId, archivedStudentId, registeredStudentId] } },
      })
      .catch(() => undefined);
    await prisma.user
      .deleteMany({ where: { id: { in: [tutorId, otherTutorId] } } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.studentInvitation.deleteMany({ where: { studentId } });
  });

  describe("issueInvitation", () => {
    it("creates a PENDING invitation for the tutor's student", async () => {
      const result = await issueInvitation(tutorId, studentId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.inviteUrl).toContain("/student-invite/");
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const stored = await prisma.studentInvitation.findFirst({
        where: { studentId, status: "PENDING" },
      });
      expect(stored).not.toBeNull();
    });

    it("revokes the previous PENDING invitation when a new one is issued", async () => {
      const first = await issueInvitation(tutorId, studentId);
      const second = await issueInvitation(tutorId, studentId);
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);

      const pendings = await prisma.studentInvitation.findMany({
        where: { studentId, status: "PENDING" },
      });
      expect(pendings).toHaveLength(1);

      const revoked = await prisma.studentInvitation.findMany({
        where: { studentId, status: "REVOKED" },
      });
      expect(revoked).toHaveLength(1);
    });

    it("rejects when tutor does not own the student", async () => {
      const result = await issueInvitation(otherTutorId, studentId);
      expect(result).toEqual({ ok: false, reason: "not_owner" });
    });

    it("rejects when student is archived", async () => {
      const result = await issueInvitation(tutorId, archivedStudentId);
      expect(result).toEqual({ ok: false, reason: "archived" });
    });

    it("rejects when student already has a StudentUser", async () => {
      const result = await issueInvitation(tutorId, registeredStudentId);
      expect(result).toEqual({ ok: false, reason: "already_registered" });
    });

    it("rejects when student does not exist", async () => {
      const result = await issueInvitation(tutorId, "non-existent-id");
      expect(result).toEqual({ ok: false, reason: "student_not_found" });
    });
  });

  describe("getInvitationStatus", () => {
    it("returns not_issued when no invitation exists", async () => {
      const status = await getInvitationStatus(tutorId, studentId);
      expect(status).toEqual({ status: "not_issued" });
    });

    it("returns pending with metadata when a PENDING invitation exists", async () => {
      await issueInvitation(tutorId, studentId);
      const status = await getInvitationStatus(tutorId, studentId);
      expect(status).toMatchObject({ status: "pending" });
      if ("createdAt" in status) {
        expect(typeof status.createdAt).toBe("string");
        expect(typeof status.expiresAt).toBe("string");
      }
    });

    it("returns registered when StudentUser is linked", async () => {
      const status = await getInvitationStatus(tutorId, registeredStudentId);
      expect(status).toMatchObject({
        status: "registered",
      });
    });

    it("forbids other tutors", async () => {
      const status = await getInvitationStatus(otherTutorId, studentId);
      expect(status).toEqual({ error: "forbidden" });
    });
  });

  describe("revokeInvitation", () => {
    it("revokes existing PENDING and reports revoked=true", async () => {
      await issueInvitation(tutorId, studentId);
      const result = await revokeInvitation(tutorId, studentId);
      expect(result).toEqual({ ok: true, revoked: true });
      const pendings = await prisma.studentInvitation.findMany({
        where: { studentId, status: "PENDING" },
      });
      expect(pendings).toHaveLength(0);
    });

    it("is idempotent — revoked=false if nothing to revoke", async () => {
      const result = await revokeInvitation(tutorId, studentId);
      expect(result).toEqual({ ok: true, revoked: false });
    });
  });

  describe("validateRawToken", () => {
    it("returns ok with student/tutor names for a valid PENDING token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      expect(issued.ok).toBe(true);
      if (!issued.ok) return;

      const rawToken = issued.inviteUrl.split("/").pop()!;
      const result = await validateRawToken(rawToken);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.studentName).toBe("Иван Иванов");
      expect(result.tutorName).toBe("Учитель Тест");
    });

    it("returns ok=false for a non-existent token", async () => {
      const result = await validateRawToken("definitely-not-a-real-token");
      expect(result.ok).toBe(false);
    });

    it("returns ok=false for a USED token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) return;
      const rawToken = issued.inviteUrl.split("/").pop()!;
      const tokenHash = hashInvitationToken(rawToken);
      await prisma.studentInvitation.update({
        where: { tokenHash },
        data: { status: "USED", usedAt: new Date() },
      });
      const result = await validateRawToken(rawToken);
      expect(result.ok).toBe(false);
    });

    it("returns ok=false for an expired token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) return;
      const rawToken = issued.inviteUrl.split("/").pop()!;
      const tokenHash = hashInvitationToken(rawToken);
      await prisma.studentInvitation.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const result = await validateRawToken(rawToken);
      expect(result.ok).toBe(false);
    });
  });
});
