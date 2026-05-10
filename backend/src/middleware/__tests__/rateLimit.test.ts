import express from "express";
import request from "supertest";
import { authRouter } from "../../routes/auth";
import { passwordResetRateLimiter } from "../rateLimit";

describe("rate limit middleware (regression: brute-force protection)", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  const buildApp = (
    limiterName:
      | "authRateLimiter"
      | "adminLoginRateLimiter"
      | "passwordResetRateLimiter",
  ) => {
    process.env.NODE_ENV = "production";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const limiters = require("../rateLimit");
    const app = express();
    app.use(express.json());
    app.post("/test", limiters[limiterName], (_req, res) =>
      res.status(200).json({ ok: true })
    );
    return app;
  };

  it("authRateLimiter should block requests after the 20th in a 15-min window", async () => {
    const app = buildApp("authRateLimiter");

    for (let i = 0; i < 20; i++) {
      await request(app).post("/test").expect(200);
    }
    const blocked = await request(app).post("/test");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("Слишком много попыток. Попробуйте позже");
  });

  it("adminLoginRateLimiter should block requests after the 5th in a 15-min window", async () => {
    const app = buildApp("adminLoginRateLimiter");

    for (let i = 0; i < 5; i++) {
      await request(app).post("/test").expect(200);
    }
    const blocked = await request(app).post("/test");
    expect(blocked.status).toBe(429);
  });

  it("passwordResetRateLimiter should block requests after the 5th in a 15-min window", async () => {
    const app = buildApp("passwordResetRateLimiter");

    for (let i = 0; i < 5; i++) {
      await request(app).post("/test").expect(200);
    }
    const blocked = await request(app).post("/test");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("Слишком много попыток. Попробуйте позже");
  });

  it("limiters should skip rate limiting in test environment", async () => {
    process.env.NODE_ENV = "test";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authRateLimiter } = require("../rateLimit");
    const app = express();
    app.use(express.json());
    app.post("/test", authRateLimiter, (_req, res) =>
      res.status(200).json({ ok: true })
    );

    for (let i = 0; i < 25; i++) {
      await request(app).post("/test").expect(200);
    }
  });
});

describe("auth router (regression: rate-limit on /reset-password*)", () => {
  type RouteLayer = {
    route?: { path: string; stack: Array<{ handle: unknown }> };
  };

  const stack = (authRouter as unknown as { stack: RouteLayer[] }).stack;

  it.each([
    ["/forgot-password"],
    ["/reset-password/verify"],
    ["/reset-password"],
  ])("should apply passwordResetRateLimiter to %s", (path) => {
    const layer = stack.find((l) => l.route?.path === path);
    expect(layer?.route).toBeDefined();
    const handlers = layer!.route!.stack.map((s) => s.handle);
    expect(handlers).toContain(passwordResetRateLimiter);
  });
});
