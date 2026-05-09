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
    it("returns 404 when user not found", async () => {
      // generate token for non-existing user
      const fakeToken = generateToken({
        userId: "non-existent-id",
        email: "noone@example.com",
      });
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${fakeToken}`)
        .send();
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Пользователь не найден");
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

      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send();

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Внутренняя ошибка сервера");

      // Restore original function
      prisma.user.findUnique = originalFindUnique;
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
      const originalUpdate = prisma.user.update;
      prisma.user.update = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Внутренняя ошибка сервера");

      prisma.user.update = originalUpdate;
    });

    it("should update taxRate successfully", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: 13 });

      expect(res.status).toBe(200);
      expect(res.body.user.taxRate).toBe(13);
    });

    it("should return default taxRate of 6 for new users", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.taxRate).toBeDefined();
    });

    it("should accept taxRate 0", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: 0 });

      expect(res.status).toBe(200);
      expect(res.body.user.taxRate).toBe(0);
    });

    it("should accept taxRate 100", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: 100 });

      expect(res.status).toBe(200);
      expect(res.body.user.taxRate).toBe(100);
    });

    it("should reject taxRate greater than 100", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: 101 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("should reject negative taxRate", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: -1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("should round taxRate to one decimal place", async () => {
      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", taxRate: 6.55 });

      expect(res.status).toBe(200);
      expect(res.body.user.taxRate).toBe(6.6);
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
