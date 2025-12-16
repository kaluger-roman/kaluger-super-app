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
        email: faker.internet.email(),
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
        "Email, пароль и имя обязательны для заполнения"
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

    it("creates user and returns token on success", async () => {
      const email = faker.internet.email();
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email, password: "Password1A", name: "User" });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({ email, name: "User" });

      // Clean up created user
      await prisma.user.delete({ where: { id: res.body.user.id } });
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

    it("returns token and user on success", async () => {
      // create user with known password using utils.hashPassword
      const password = "Password1A";
      // create via register route to ensure hashing
      const email = faker.internet.email();
      await request(app)
        .post("/api/auth/register")
        .send({ email, password, name: "L" })
        .expect(201);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(email);

      // cleanup
      await prisma.user.delete({ where: { email } }).catch(() => undefined);
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
  });
});
