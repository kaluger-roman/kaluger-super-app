import request from "supertest";
import { faker } from "@faker-js/faker";

import { app } from "../../index";
import prisma from "../../lib/prisma";
import { hashPassword } from "../../utils";
import { generateToken } from "../../utils/auth";
import { issueInvitation } from "../../services/studentInvitation";

jest.mock("../../services/email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

const VALID_PASSWORD = "StrongPass1";

describe("studentAuth + studentInvitations controllers", () => {
  let tutorId: string;
  let tutorToken: string;
  let studentId: string;

  beforeAll(async () => {
    if (!process.env.FRONTEND_URL)
      process.env.FRONTEND_URL = "http://localhost:3000";
    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: await hashPassword(VALID_PASSWORD),
        name: "Тутор Тестов",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;
    tutorToken = generateToken({ userId: tutor.id, email: tutor.email });

    const student = await prisma.student.create({
      data: { name: "Ученик Тестов", tutorId },
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
    await prisma.student.delete({ where: { id: studentId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: tutorId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.studentInvitation.deleteMany({ where: { studentId } });
    await prisma.studentUser.deleteMany({ where: { studentId } });
  });

  describe("POST /api/students/:id/invitations", () => {
    it("creates an invitation (tutor as owner) and returns inviteUrl + expiresAt", async () => {
      const res = await request(app)
        .post(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: "pending" });
      expect(res.body.inviteUrl).toContain("/student-invite/");
      expect(typeof res.body.expiresAt).toBe("string");
    });

    it("rejects non-owner tutor with 403", async () => {
      const other = await prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Другой",
          isEmailVerified: true,
        },
      });
      const otherToken = generateToken({
        userId: other.id,
        email: other.email,
      });
      const res = await request(app)
        .post(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      await prisma.user.delete({ where: { id: other.id } });
    });

    it("rejects with 409 if student already has an account", async () => {
      await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Реги",
          studentId,
        },
      });
      const res = await request(app)
        .post(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(409);
    });

    it("returns 401 without auth token", async () => {
      const res = await request(app).post(
        `/api/students/${studentId}/invitations`
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown student id", async () => {
      const res = await request(app)
        .post(`/api/students/00000000-0000-0000-0000-000000000000/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(404);
    });

    it("returns 409 for archived student", async () => {
      const archived = await prisma.student.create({
        data: { name: "Архивный", tutorId, archived: true },
      });
      const res = await request(app)
        .post(`/api/students/${archived.id}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(409);
      await prisma.student.delete({ where: { id: archived.id } });
    });
  });

  describe("GET /api/students/:id/invitations", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get(
        `/api/students/${studentId}/invitations`
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown student", async () => {
      const res = await request(app)
        .get(`/api/students/00000000-0000-0000-0000-000000000000/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(404);
    });

    it("returns 403 for non-owner tutor", async () => {
      const other = await prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Чужой",
          isEmailVerified: true,
        },
      });
      const otherToken = generateToken({
        userId: other.id,
        email: other.email,
      });
      const res = await request(app)
        .get(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      await prisma.user.delete({ where: { id: other.id } });
    });

    it("returns not_issued when no invitation exists", async () => {
      const res = await request(app)
        .get(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "not_issued" });
    });

    it("returns pending after issue", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");

      const res = await request(app)
        .get(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("pending");
      expect(typeof res.body.createdAt).toBe("string");
      expect(typeof res.body.expiresAt).toBe("string");
    });

    it("returns registered when student already has an account", async () => {
      const email = faker.internet.email().toLowerCase();
      await prisma.studentUser.create({
        data: { email, password: "hash", name: "Реги", studentId },
      });
      const res = await request(app)
        .get(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "registered",
        studentEmail: email,
      });
    });
  });

  describe("DELETE /api/students/:id/invitations", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).delete(
        `/api/students/${studentId}/invitations`
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown student", async () => {
      const res = await request(app)
        .delete(`/api/students/00000000-0000-0000-0000-000000000000/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(404);
    });

    it("returns 403 for non-owner tutor", async () => {
      const other = await prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Чужой",
          isEmailVerified: true,
        },
      });
      const otherToken = generateToken({
        userId: other.id,
        email: other.email,
      });
      const res = await request(app)
        .delete(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      await prisma.user.delete({ where: { id: other.id } });
    });

    it("returns 204 and marks pending invitation as REVOKED", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");

      const res = await request(app)
        .delete(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(204);

      const pending = await prisma.studentInvitation.findFirst({
        where: { studentId, status: "PENDING" },
      });
      expect(pending).toBeNull();
    });

    it("returns 204 even when there is nothing to revoke", async () => {
      const res = await request(app)
        .delete(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(204);
    });
  });

  describe("POST /api/student-auth/register", () => {
    it("completes registration end-to-end via HTTP", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop();
      const email = faker.internet.email().toLowerCase();

      const res = await request(app).post("/api/student-auth/register").send({
        token,
        name: "Петя",
        email,
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      });
      expect(res.status).toBe(201);
      expect(res.body.student.email).toBe(email);
      expect(res.body.token).toEqual(expect.any(String));
    });

    it("returns 410 on a used token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop();

      await request(app).post("/api/student-auth/register").send({
        token,
        name: "Петя",
        email: faker.internet.email().toLowerCase(),
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      });

      const res = await request(app).post("/api/student-auth/register").send({
        token,
        name: "Петя2",
        email: faker.internet.email().toLowerCase(),
        password: VALID_PASSWORD,
        passwordConfirmation: VALID_PASSWORD,
      });
      expect(res.status).toBe(410);
    });
  });

  describe("GET /api/student-invitations/validate/:token", () => {
    it("returns valid:true with student/tutor names for a PENDING token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop();

      const res = await request(app).get(
        `/api/student-invitations/validate/${token}`
      );
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        valid: true,
        studentName: "Ученик Тестов",
        tutorName: "Тутор Тестов",
      });
    });

    it("returns valid:false for unknown token (no enumeration leak)", async () => {
      const res = await request(app).get(
        "/api/student-invitations/validate/totally-unknown"
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: false });
    });

    it("returns valid:false for expired token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop()!;

      await prisma.studentInvitation.updateMany({
        where: { studentId, status: "PENDING" },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app).get(
        `/api/student-invitations/validate/${token}`
      );
      expect(res.body).toEqual({ valid: false });
    });

    it("returns valid:false for revoked token", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop()!;

      await request(app)
        .delete(`/api/students/${studentId}/invitations`)
        .set("Authorization", `Bearer ${tutorToken}`);

      const res = await request(app).get(
        `/api/student-invitations/validate/${token}`
      );
      expect(res.body).toEqual({ valid: false });
    });

    it("returns valid:false when student already registered", async () => {
      const issued = await issueInvitation(tutorId, studentId);
      if (!issued.ok) throw new Error("issue failed");
      const token = issued.inviteUrl.split("/").pop()!;

      await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Реги",
          studentId,
        },
      });

      const res = await request(app).get(
        `/api/student-invitations/validate/${token}`
      );
      expect(res.body).toEqual({ valid: false });
    });
  });

  describe("Cross-role guard", () => {
    it("tutor JWT cannot access /api/student-auth/me", async () => {
      const res = await request(app)
        .get("/api/student-auth/me")
        .set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(401);
    });
  });
});
