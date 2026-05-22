import request from "supertest";
import prisma from "../../lib/prisma";
import { app } from "../../index";
import { generateToken } from "../../utils/auth";
import { faker } from "@faker-js/faker";

describe("Auth Controller", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("register", () => {
    it("returns 400 when required fields missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "a@b" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Email, пароль и имя обязательны для заполнения",
      );
    });

    it("returns 400 on invalid email or password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "bad", password: "Password1", name: "Name" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Неверный формат email");

      const res2 = await request(app)
        .post("/api/auth/register")
        .send({ email: "good@example.com", password: "short", name: "Name" });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toMatch(/Пароль должен содержать/);
    });

    it("returns 409 when user exists", async () => {
      // user created in beforeAll
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: (await prisma.user.findUnique({ where: { id: userId } }))!
            .email,
          password: "Password1",
          name: "Name",
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Пользователь уже существует");
    });

    it("creates user and sends verification code", async () => {
      const email = faker.internet.email();
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email, password: "Password1A", name: "User" });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeUndefined();
      expect(res.body.user).toMatchObject({
        email: email.toLowerCase(),
        name: "User",
        isEmailVerified: false,
      });
      expect(res.body.message).toMatch(/подтверждения/);

      // Clean up created user
      await prisma.user.delete({ where: { id: res.body.user.id } });
    });

    it("normalizes email to lowercase and rejects mixed-case duplicates (regression: case-insensitive uniqueness)", async () => {
      const lowerEmail = `case-${faker.string.alphanumeric(6).toLowerCase()}@example.com`;
      const upperEmail = lowerEmail.toUpperCase();

      const first = await request(app)
        .post("/api/auth/register")
        .send({ email: upperEmail, password: "Password1A", name: "First" });
      expect(first.status).toBe(201);
      expect(first.body.user.email).toBe(lowerEmail);

      const second = await request(app)
        .post("/api/auth/register")
        .send({ email: lowerEmail, password: "Password1A", name: "Dup" });
      expect(second.status).toBe(409);

      await prisma.user.delete({ where: { id: first.body.user.id } });
    });
  });

  describe("login", () => {
    it("returns 400 when missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "a@b" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email и пароль обязательны для заполнения");
    });

    it("returns 401 when user not found or password invalid", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nope@example.com", password: "Password1" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Неверные учетные данные");

      // Create a user with a different hash so password check fails
      const temp = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "notmatching",
          name: "T",
        },
      });
      const res2 = await request(app)
        .post("/api/auth/login")
        .send({ email: temp.email, password: "Password1" });
      expect(res2.status).toBe(401);
      await prisma.user.delete({ where: { id: temp.id } });
    });

    it("returns token and user on successful login", async () => {
      const password = "Password1A";
      const email = faker.internet.email();

      // Create and immediately verify the user
      await request(app)
        .post("/api/auth/register")
        .send({ email, password, name: "L" })
        .expect(201);

      // Verify email manually (emails aren't sent in tests)
      const normalizedEmail = email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      await prisma.user.update({
        where: { id: user!.id },
        data: { isEmailVerified: true },
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(normalizedEmail);
      // Regression for bug-hunt 2026-05-09 round-2: frontend navigation
      // gates on response.user.isEmailVerified === true; if backend omits
      // the field, verified users get stuck on the login page.
      expect(res.body.user.isEmailVerified).toBe(true);

      // cleanup
      await prisma.user
        .delete({ where: { email: normalizedEmail } })
        .catch(() => undefined);
    });

    it("login should accept email with different letter case (regression: case-insensitive login)", async () => {
      const password = "Password1A";
      const email = `Mixed-${faker.string.alphanumeric(5)}@Example.COM`;

      await request(app)
        .post("/api/auth/register")
        .send({ email, password, name: "L" })
        .expect(201);

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      await prisma.user.update({
        where: { id: user!.id },
        data: { isEmailVerified: true },
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: email.toUpperCase(), password });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(normalizedEmail);

      await prisma.user
        .delete({ where: { email: normalizedEmail } })
        .catch(() => undefined);
    });

    it("returns 403 when email not verified", async () => {
      const password = "Password1A";
      const email = faker.internet.email();

      await request(app)
        .post("/api/auth/register")
        .send({ email, password, name: "L" })
        .expect(201);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Email не подтвержден/);

      // cleanup
      await prisma.user
        .delete({ where: { email: email.toLowerCase() } })
        .catch(() => undefined);
    });
  });

  describe("getProfile", () => {
    it("returns 401 when token references non-existent user (revoked)", async () => {
      // generate token for non-existing user
      const fakeToken = generateToken({
        userId: "non-existent-id",
        email: "noone@example.com",
      });
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${fakeToken}`)
        .send();
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Токен отозван");
    });

    it("returns user profile on success", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBeDefined();
    });

    it("returns 500 on database error", async () => {
      // Mock prisma to throw an error
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      try {
        const res = await request(app)
          .get("/api/auth/profile")
          .set("Authorization", `Bearer ${authToken}`)
          .send();

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Внутренняя ошибка сервера");
      } finally {
        // Restore original function regardless of assertion outcome,
        // so a leaked mock cannot break later tests.
        prisma.user.findUnique = originalFindUnique;
      }
    });
  });

  describe("updateProfile", () => {
    it("returns 400 when name is empty", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Имя не может быть пустым");
    });

    it("returns 400 when name is only whitespace", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Имя не может быть пустым");
    });

    it("updates user profile successfully", async () => {
      const newName = faker.person.fullName();
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: newName });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Профиль успешно обновлен");
      expect(res.body.user.name).toBe(newName);
      expect(res.body.user.id).toBe(userId);
    });

    it("trims whitespace from name", async () => {
      const newName = faker.person.fullName();
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: `  ${newName}  ` });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe(newName);
    });

    it("returns 500 on database error", async () => {
      const originalTransaction = prisma.$transaction;
      prisma.$transaction = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error")) as typeof prisma.$transaction;

      try {
        const res = await request(app)
          .put("/api/auth/profile")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ name: "Test" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Внутренняя ошибка сервера");
      } finally {
        prisma.$transaction = originalTransaction;
      }
    });

    it("returns taxEnabled=false by default for new user", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.taxEnabled).toBe(false);
    });

    it("rejects enabling taxEnabled when user has no periods", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ taxEnabled: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Чтобы включить учёт налога, добавьте хотя бы один период",
      );
    });

    it("enables taxEnabled when user has at least one period", async () => {
      await prisma.taxRatePeriod.create({
        data: {
          userId,
          startDate: new Date("2024-01-01"),
          rate: 6,
        },
      });

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ taxEnabled: true });

      expect(res.status).toBe(200);
      expect(res.body.user.taxEnabled).toBe(true);

      await prisma.taxRatePeriod.deleteMany({ where: { userId } });
      await prisma.user.update({
        where: { id: userId },
        data: { taxEnabled: false },
      });
    });

    it("disables taxEnabled regardless of periods", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { taxEnabled: true },
      });

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ taxEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.user.taxEnabled).toBe(false);
    });

    it("rejects non-boolean taxEnabled", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ taxEnabled: "yes" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Поле taxEnabled должно быть булевым");
    });
  });

  describe("error handling", () => {
    it("handles database errors in register", async () => {
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app).post("/api/auth/register").send({
        email: faker.internet.email(),
        password: "Password1A",
        name: "Test User",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Внутренняя ошибка сервера");

      prisma.user.findUnique = originalFindUnique;
    });

    it("handles database errors in login", async () => {
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password1A",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Внутренняя ошибка сервера");

      prisma.user.findUnique = originalFindUnique;
    });
  });
});
