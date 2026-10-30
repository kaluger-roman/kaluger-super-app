import request from "supertest";

import { app } from "../index";
import { prisma } from "../lib/prisma";
import { generateAdminToken, generateToken } from "../utils/auth";
import { generateStudentToken } from "../utils/studentAuth";
import { uniqueEmail } from "./helpers";

describe("Cross-role security regression (SC-004, FR-017a, FR-018)", () => {
  let tutorId: string;
  let tutorToken: string;
  let studentUserId: string;
  let studentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Tutor",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;
    tutorToken = generateToken({ userId: tutor.id, email: tutor.email });

    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Student",
      },
    });
    studentUserId = studentUser.id;
    studentToken = generateStudentToken({
      studentUserId,
      email: studentUser.email,
      isStudent: true,
      tokenVersion: studentUser.tokenVersion,
    });

    adminToken = generateAdminToken({
      email: "admin@example.com",
      isAdmin: true,
    });
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: studentUserId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: tutorId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("Student JWT must NOT access tutor endpoints", () => {
    const tutorEndpoints = [
      ["GET", "/api/auth/profile"],
      ["GET", "/api/students"],
      ["GET", "/api/lessons"],
      ["GET", "/api/statistics"],
      ["GET", "/api/statistics/income-history"],
      ["GET", "/api/tax-periods"],
      ["GET", "/api/calls/history"],
      ["GET", "/api/news"],
      ["GET", "/api/reminder-settings"],
    ] as const;

    test.each(tutorEndpoints)("%s %s rejects student JWT", async (method, path) => {
      const res =
        method === "GET"
          ? await request(app).get(path).set("Authorization", `Bearer ${studentToken}`)
          : await request(app).post(path).set("Authorization", `Bearer ${studentToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("Tutor JWT must NOT access student endpoints", () => {
    const studentEndpoints = [
      "/api/student-auth/me",
      "/api/student-cabinet/lessons",
      "/api/student/calls/history",
    ];

    test.each(studentEndpoints)("GET %s rejects tutor JWT", async (path) => {
      const res = await request(app).get(path).set("Authorization", `Bearer ${tutorToken}`);
      expect(res.status).toBe(401);
    });

    test.each([
      ["POST", "/api/student-push/subscribe"],
      ["DELETE", "/api/student-push/unsubscribe"],
    ] as const)("%s %s rejects tutor JWT", async (method, path) => {
      const body = {
        subscription: { endpoint: "https://push.example.com/x", keys: { p256dh: "p", auth: "a" } },
        endpoint: "https://push.example.com/x",
      };
      const res =
        method === "POST"
          ? await request(app).post(path).set("Authorization", `Bearer ${tutorToken}`).send(body)
          : await request(app).delete(path).set("Authorization", `Bearer ${tutorToken}`).send(body);
      expect(res.status).toBe(401);
    });
  });

  describe("Student JWT must NOT manage tutor push subscriptions", () => {
    test.each([
      ["POST", "/api/push/subscribe"],
      ["DELETE", "/api/push/unsubscribe"],
      ["GET", "/api/push/subscriptions"],
    ] as const)("%s %s rejects student JWT", async (method, path) => {
      const body = {
        subscription: { endpoint: "https://push.example.com/y", keys: { p256dh: "p", auth: "a" } },
        endpoint: "https://push.example.com/y",
      };
      const auth = `Bearer ${studentToken}`;
      const res =
        method === "GET"
          ? await request(app).get(path).set("Authorization", auth)
          : method === "POST"
            ? await request(app).post(path).set("Authorization", auth).send(body)
            : await request(app).delete(path).set("Authorization", auth).send(body);
      expect(res.status).toBe(401);
    });
  });

  describe("Admin JWT must NOT access student endpoints", () => {
    test("GET /api/student-auth/me rejects admin JWT", async () => {
      const res = await request(app)
        .get("/api/student-auth/me")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });

    test("GET /api/student-cabinet/lessons rejects admin JWT", async () => {
      const res = await request(app)
        .get("/api/student-cabinet/lessons")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe("Public student invitation validate accepts unauthenticated requests", () => {
    test("works without any auth header (no enumeration leak)", async () => {
      const res = await request(app).get("/api/student-invitations/validate/totally-unknown-token");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: false });
    });
  });
});
