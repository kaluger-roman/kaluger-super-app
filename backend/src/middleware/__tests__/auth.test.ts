import request from "supertest";
import type { Response } from "express";
import express from "express";
import { faker } from "@faker-js/faker";

import { prisma } from "../../lib/prisma";
import { __clearTokenVersionCacheForTests } from "../../lib/tokenVersionCache";
import { generateToken } from "../../utils/auth";
import type { AuthRequest } from "../auth";
import { authenticateToken } from "../auth";

const app = express();

app.get("/protected", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ ok: true, user: req.user });
});

const readTimezone = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  return user.timezone;
};

// The timezone write in the middleware is fire-and-forget, so poll the row
// instead of asserting right after the response.
const waitForTimezone = async (userId: string, expected: string | null): Promise<string | null> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const timezone = await readTimezone(userId);
    if (timezone === expected) return timezone;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return readTimezone(userId);
};

describe("authenticateToken middleware", () => {
  let userId: string;
  let email: string;
  let token: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Auth Middleware User",
        isEmailVerified: true,
      },
    });
    userId = user.id;
    email = user.email;
    token = generateToken({ userId, email, tokenVersion: user.tokenVersion });
  });

  beforeEach(async () => {
    // Reset the in-process tokenVersion cache so every test exercises the
    // DB lookup path, not a value cached by a previous test.
    __clearTokenVersionCacheForTests();
    await prisma.user.update({
      where: { id: userId },
      data: { timezone: null },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен доступа обязателен" });
  });

  it("should return 401 when Authorization header has no token", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен доступа обязателен" });
  });

  it("should return 401 when the token is not a valid JWT", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Недействительный или истекший токен" });
  });

  it("should call next and attach user when the token is valid", async () => {
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({ userId, email });
  });

  it("should return 401 when the token's tokenVersion does not match the user's", async () => {
    const staleToken = generateToken({ userId, email, tokenVersion: 99 });

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${staleToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен отозван" });
  });

  it("should return 401 when the token's user no longer exists", async () => {
    const orphanToken = generateToken({
      userId: "user-does-not-exist",
      email: "ghost@example.com",
      tokenVersion: 0,
    });

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${orphanToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен отозван" });
  });

  it("should save valid x-timezone to user", async () => {
    await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .set("x-timezone", "Europe/Moscow")
      .expect(200);

    expect(await waitForTimezone(userId, "Europe/Moscow")).toBe("Europe/Moscow");
  });

  it("should NOT save invalid x-timezone to user", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { timezone: "Asia/Tokyo" },
    });

    await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .set("x-timezone", "INVALID/TZ")
      .expect(200);

    // Give a would-be write time to land before asserting nothing changed.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await readTimezone(userId)).toBe("Asia/Tokyo");
  });
});
