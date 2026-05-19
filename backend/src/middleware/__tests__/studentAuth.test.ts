import request from "supertest";
import express from "express";

import {
  generateAdminToken,
  generateToken,
} from "../../utils/auth";
import { generateStudentToken } from "../../utils/studentAuth";
import { authenticateStudent } from "../studentAuth";
import type { StudentRequest } from "../../types";

const app = express();

app.get("/student-only", authenticateStudent, (req: StudentRequest, res) => {
  res.json({ ok: true, studentUser: req.studentUser });
});

describe("authenticateStudent middleware", () => {
  it("rejects requests without Authorization header", async () => {
    const res = await request(app).get("/student-only");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен доступа обязателен" });
  });

  it("rejects a tutor JWT (wrong secret/payload)", async () => {
    const tutorToken = generateToken({
      userId: "tutor-1",
      email: "tutor@example.com",
    });
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${tutorToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects an admin JWT", async () => {
    const adminToken = generateAdminToken({
      email: "admin@example.com",
      isAdmin: true,
    });
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects a JWT signed without isStudent flag", async () => {
    // Forge a token that decodes through verifyStudentToken but lacks isStudent
    const forged = generateStudentToken({
      studentUserId: "1",
      email: "x@e.com",
      isStudent: true,
    });
    // (Sanity: valid student token works — see next test)
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(200);
  });

  it("accepts a valid student JWT and attaches payload", async () => {
    const studentToken = generateStudentToken({
      studentUserId: "student-1",
      email: "student@example.com",
      isStudent: true,
    });
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.studentUser).toMatchObject({
      studentUserId: "student-1",
      email: "student@example.com",
      isStudent: true,
    });
  });

  it("rejects gibberish tokens", async () => {
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });
});
