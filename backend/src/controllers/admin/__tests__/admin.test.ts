import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import {
  generateAdminToken,
  generateToken,
  hashPassword,
} from "../../../utils/auth";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

describe("admin integration tests", () => {
  const adminEmail = "admin@test.com";
  const adminPassword = "TestAdmin123";
  let adminToken: string;

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_PASSWORD_HASH = await hashPassword(adminPassword);
    adminToken = generateAdminToken({ email: adminEmail, isAdmin: true });
  });

  afterAll(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD_HASH;
  });

  describe("POST /api/admin/login", () => {
    it("should return token with valid credentials", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe("string");
    });

    it("should return 401 with wrong password", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ email: adminEmail, password: "wrongPassword123" })
        .expect(401);

      expect(res.body.error).toBe("Неверный email или пароль");
    });

    it("should return 401 when password equals stored hash literally (regression: plain compare removed)", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({
          email: adminEmail,
          password: process.env.ADMIN_PASSWORD_HASH,
        })
        .expect(401);

      expect(res.body.error).toBe("Неверный email или пароль");
    });

    it("should accept email with different letter case (regression: email normalization)", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ email: adminEmail.toUpperCase(), password: adminPassword })
        .expect(200);

      expect(res.body.token).toBeDefined();
    });

    it("should return 401 with wrong email", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ email: "wrong@test.com", password: adminPassword })
        .expect(401);

      expect(res.body.error).toBe("Неверный email или пароль");
    });

    it("should return 400 when email is missing", async () => {
      await request(app)
        .post("/api/admin/login")
        .send({ password: adminPassword })
        .expect(400);
    });

    it("should return 400 when password is missing", async () => {
      await request(app)
        .post("/api/admin/login")
        .send({ email: adminEmail })
        .expect(400);
    });

    it("should return 400 with invalid email format", async () => {
      await request(app)
        .post("/api/admin/login")
        .send({ email: "not-an-email", password: adminPassword })
        .expect(400);
    });
  });

  describe("GET /api/admin/overview", () => {
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
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: userId } });
    });

    it("should return system overview with admin token", async () => {
      const res = await request(app)
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("usersCount");
      expect(res.body).toHaveProperty("studentsCount");
      expect(res.body).toHaveProperty("lessonsCount");
      expect(res.body).toHaveProperty("serverUptime");
      expect(typeof res.body.usersCount).toBe("number");
      expect(typeof res.body.serverUptime).toBe("number");
      expect(res.body.usersCount).toBeGreaterThanOrEqual(1);
    });

    it("should return 401 without token", async () => {
      await request(app).get("/api/admin/overview").expect(401);
    });

    it("should reject regular user token", async () => {
      const userToken = generateToken({
        userId: "test",
        email: "user@test.com",
      });

      await request(app)
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
