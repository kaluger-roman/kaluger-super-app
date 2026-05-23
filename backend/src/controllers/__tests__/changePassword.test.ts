import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../index";
import prisma from "../../lib/prisma";
import { generateToken, hashPassword } from "../../utils/auth";

describe("POST /api/auth/change-password", () => {
  let authToken: string;
  let userId: string;
  const currentPassword = "OldPassword1";

  beforeAll(async () => {
    const hashedPassword = await hashPassword(currentPassword);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: hashedPassword,
        name: faker.person.fullName(),
        isEmailVerified: true,
      },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("should return 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({
        currentPassword,
        newPassword: "NewPassword1",
        confirmPassword: "NewPassword1",
      });
    expect(res.status).toBe(401);
  });

  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Все поля обязательны для заполнения");
  });

  it("should return 400 when passwords do not match", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword,
        newPassword: "NewPassword1",
        confirmPassword: "Different1",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Пароли не совпадают");
  });

  it("should return 400 when current password is wrong", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword: "WrongPassword1",
        newPassword: "NewPassword1",
        confirmPassword: "NewPassword1",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Неверный текущий пароль");
  });

  it("should return 400 when new password fails validation", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword,
        newPassword: "short",
        confirmPassword: "short",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Пароль должен содержать/);
  });

  it("should return 400 when new password equals current password", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword,
        newPassword: currentPassword,
        confirmPassword: currentPassword,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Новый пароль должен отличаться от текущего");
  });

  it("should change password successfully, return fresh JWT, and revoke old token", async () => {
    const newPassword = "NewPassword1";
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Пароль успешно изменён");
    // Fresh JWT minted with bumped tokenVersion — frontend uses this to stay
    // logged in after the old token is revoked.
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user).toMatchObject({ id: userId });

    // New password works for login.
    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: (await prisma.user.findUnique({ where: { id: userId } }))!.email, password: newPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // The OLD token is revoked: subsequent request with it returns 401.
    const res2 = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword,
        newPassword: "AnotherPassword1",
        confirmPassword: "AnotherPassword1",
      });
    expect(res2.status).toBe(401);
    expect(res2.body.error).toBe("Токен отозван");

    // But the NEW token returned by change-password works (regression: PR
    // previously discarded the new token, silently logging the user out).
    const res3 = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${res.body.token}`);
    expect(res3.status).toBe(200);
    expect(res3.body.user.id).toBe(userId);
  });

  it("should return 401 when token references non-existent user", async () => {
    const fakeToken = generateToken({
      userId: "non-existent-id",
      email: "noone@example.com",
    });
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        currentPassword: "Password1",
        newPassword: "NewPassword1",
        confirmPassword: "NewPassword1",
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Токен отозван");
  });
});
