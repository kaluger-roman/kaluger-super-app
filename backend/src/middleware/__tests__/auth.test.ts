import request from "supertest";
import express, { Request, Response } from "express";

// Mock verifyToken from utils/auth
jest.mock("../../utils/auth", () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from "../../utils/auth";
import { authenticateToken, AuthRequest } from "../auth";

const app = express();

app.get("/protected", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ ok: true, user: req.user });
});

describe("authenticateToken middleware", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен доступа обязателен" });
  });

  it("should return 401 when Authorization header has no token", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Токен доступа обязателен" });
  });

  it("should return 403 when verifyToken returns falsy", async () => {
    (verifyToken as jest.Mock).mockReturnValue(null);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(verifyToken).toHaveBeenCalledWith("invalid-token");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Недействительный или истекший токен" });
  });

  it("should call next and attach user when verifyToken returns payload", async () => {
    const fakePayload = { userId: "user-1", email: "a@b.c" };
    (verifyToken as jest.Mock).mockReturnValue(fakePayload);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(verifyToken).toHaveBeenCalledWith("valid-token");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, user: fakePayload });
  });
});
