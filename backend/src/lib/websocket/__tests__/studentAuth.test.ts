import { faker } from "@faker-js/faker";
import prisma from "../../prisma";
import { generateAdminToken, generateToken } from "../../../utils/auth";
import { generateStudentToken } from "../../../utils/studentAuth";
import { authenticateStudentWebSocket } from "../studentAuth";

describe("authenticateStudentWebSocket", () => {
  let studentUserId: string;
  let studentEmail: string;
  let studentVersion: number;

  beforeAll(async () => {
    const studentUser = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "WS Test Student",
      },
    });
    studentUserId = studentUser.id;
    studentEmail = studentUser.email;
    studentVersion = studentUser.tokenVersion;
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: studentUserId } }).catch(() => undefined);
  });

  it("returns payload when student JWT is valid", async () => {
    const token = generateStudentToken({
      studentUserId,
      email: studentEmail,
      isStudent: true,
      tokenVersion: studentVersion,
    });

    const ws: any = { close: jest.fn() };
    const request: any = { url: `/?token=${encodeURIComponent(token)}` };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toEqual({
      studentUserId,
      email: studentEmail,
    });
    expect(ws.close).not.toHaveBeenCalled();
  });

  it("rejects when token query parameter is missing", async () => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: "/" };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "No token provided");
  });

  it("rejects a tutor JWT signed with the wrong secret", async () => {
    const tutorToken = generateToken({
      userId: "u-1",
      email: "t@example.com",
    });
    const ws: any = { close: jest.fn() };
    const request: any = {
      url: `/?token=${encodeURIComponent(tutorToken)}`,
    };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("rejects an admin JWT signed with the admin secret", async () => {
    const adminToken = generateAdminToken({
      email: "admin@example.com",
      isAdmin: true,
    });
    const ws: any = { close: jest.fn() };
    const request: any = {
      url: `/?token=${encodeURIComponent(adminToken)}`,
    };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("rejects a malformed token", async () => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: "/?token=not.a.jwt" };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("rejects token with stale tokenVersion (regression: bug-hunt 2026-05-24 #5)", async () => {
    const token = generateStudentToken({
      studentUserId,
      email: studentEmail,
      isStudent: true,
      tokenVersion: studentVersion,
    });

    await prisma.studentUser.update({
      where: { id: studentUserId },
      data: { tokenVersion: { increment: 1 } },
    });

    const ws: any = { close: jest.fn() };
    const request: any = { url: `/?token=${encodeURIComponent(token)}` };

    const result = await authenticateStudentWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Token revoked");

    await prisma.studentUser.update({
      where: { id: studentUserId },
      data: { tokenVersion: studentVersion },
    });
  });
});
