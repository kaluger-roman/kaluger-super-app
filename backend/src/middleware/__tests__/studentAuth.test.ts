import request from "supertest";
import express from "express";
import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
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
  let realStudentUserId: string;
  let realStudentEmail: string;
  let realStudentVersion: number;

  beforeAll(async () => {
    const studentUser = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Test Student",
      },
    });
    realStudentUserId = studentUser.id;
    realStudentEmail = studentUser.email;
    realStudentVersion = studentUser.tokenVersion;
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: realStudentUserId } }).catch(() => undefined);
  });

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

  it("accepts a valid student JWT and attaches payload", async () => {
    const studentToken = generateStudentToken({
      studentUserId: realStudentUserId,
      email: realStudentEmail,
      isStudent: true,
      tokenVersion: realStudentVersion,
    });
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.studentUser).toMatchObject({
      studentUserId: realStudentUserId,
      email: realStudentEmail,
      isStudent: true,
      tokenVersion: realStudentVersion,
    });
  });

  it("rejects gibberish tokens", async () => {
    const res = await request(app)
      .get("/student-only")
      .set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });

  it("rejects token with stale tokenVersion (regression: bug-hunt 2026-05-24 #5)", async () => {
    const studentToken = generateStudentToken({
      studentUserId: realStudentUserId,
      email: realStudentEmail,
      isStudent: true,
      tokenVersion: realStudentVersion,
    });

    await prisma.studentUser.update({
      where: { id: realStudentUserId },
      data: { tokenVersion: { increment: 1 } },
    });

    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен отозван" });

    await prisma.studentUser.update({
      where: { id: realStudentUserId },
      data: { tokenVersion: realStudentVersion },
    });
  });

  it("rejects token for deleted studentUser (regression: bug-hunt 2026-05-24 #5)", async () => {
    const tempStudent = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Temp Student",
      },
    });
    const studentToken = generateStudentToken({
      studentUserId: tempStudent.id,
      email: tempStudent.email,
      isStudent: true,
      tokenVersion: tempStudent.tokenVersion,
    });

    await prisma.studentUser.delete({ where: { id: tempStudent.id } });

    const res = await request(app)
      .get("/student-only")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен отозван" });
  });
});
