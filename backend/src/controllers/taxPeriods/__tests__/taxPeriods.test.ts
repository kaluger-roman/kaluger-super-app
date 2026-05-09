import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("tax-periods CRUD", () => {
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
    await prisma.taxRatePeriod.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.taxRatePeriod.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { taxEnabled: false },
    });
  });

  describe("GET /api/tax-periods", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/tax-periods");
      expect(res.status).toBe(401);
    });

    it("returns empty array for user without periods", async () => {
      const res = await request(app)
        .get("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns periods sorted by startDate ascending", async () => {
      await prisma.taxRatePeriod.createMany({
        data: [
          { userId, startDate: new Date("2025-06-01"), rate: 4 },
          { userId, startDate: new Date("2024-01-01"), rate: 6 },
          { userId, startDate: new Date("2026-01-01"), rate: 13 },
        ],
      });

      const res = await request(app)
        .get("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].rate).toBe(6);
      expect(res.body[1].rate).toBe(4);
      expect(res.body[2].rate).toBe(13);
    });
  });

  describe("POST /api/tax-periods", () => {
    it("creates a new period with valid data", async () => {
      const res = await request(app)
        .post("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-06-01", rate: 4 });

      expect(res.status).toBe(201);
      expect(res.body.rate).toBe(4);
      expect(res.body.startDate).toContain("2025-06-01");
    });

    it("returns 400 on duplicate startDate", async () => {
      await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });

      const res = await request(app)
        .post("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-06-01", rate: 6 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Период с такой датой начала уже существует",
      );
    });

    it("returns 400 when rate is below 0", async () => {
      const res = await request(app)
        .post("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-06-01", rate: -1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("returns 400 when rate is above 100", async () => {
      const res = await request(app)
        .post("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-06-01", rate: 101 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("rounds rate to one decimal place", async () => {
      const res = await request(app)
        .post("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-06-01", rate: 6.55 });
      expect(res.status).toBe(201);
      expect(res.body.rate).toBe(6.6);
    });

    it("returns 401 without token", async () => {
      const res = await request(app)
        .post("/api/tax-periods")
        .send({ startDate: "2025-06-01", rate: 4 });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/tax-periods/:id", () => {
    it("updates rate only", async () => {
      const created = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });

      const res = await request(app)
        .patch(`/api/tax-periods/${created.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rate: 7 });

      expect(res.status).toBe(200);
      expect(res.body.rate).toBe(7);
    });

    it("updates startDate only", async () => {
      const created = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });

      const res = await request(app)
        .patch(`/api/tax-periods/${created.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2025-07-01" });

      expect(res.status).toBe(200);
      expect(res.body.startDate).toContain("2025-07-01");
    });

    it("returns 400 on duplicate startDate", async () => {
      await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });
      const second = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });

      const res = await request(app)
        .patch(`/api/tax-periods/${second.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ startDate: "2024-01-01" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Период с такой датой начала уже существует",
      );
    });

    it("returns 404 for foreign period", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
        },
      });
      const foreign = await prisma.taxRatePeriod.create({
        data: {
          userId: otherUser.id,
          startDate: new Date("2024-01-01"),
          rate: 6,
        },
      });

      const res = await request(app)
        .patch(`/api/tax-periods/${foreign.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rate: 7 });

      expect(res.status).toBe(404);

      await prisma.taxRatePeriod.delete({ where: { id: foreign.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it("returns 400 on rate out of range", async () => {
      const created = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });

      const res = await request(app)
        .patch(`/api/tax-periods/${created.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rate: 150 });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/tax-periods/:id", () => {
    it("returns 204 on success", async () => {
      const a = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });
      const b = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2025-06-01"), rate: 4 },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { taxEnabled: true },
      });

      const res = await request(app)
        .delete(`/api/tax-periods/${b.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(204);
      const remaining = await prisma.taxRatePeriod.findMany({
        where: { userId },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(a.id);
    });

    it("rejects deleting last period when taxEnabled=true", async () => {
      const only = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { taxEnabled: true },
      });

      const res = await request(app)
        .delete(`/api/tax-periods/${only.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Нельзя удалить последний период при включённом учёте налога",
      );
    });

    it("allows deleting last period when taxEnabled=false", async () => {
      const only = await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });

      const res = await request(app)
        .delete(`/api/tax-periods/${only.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 for foreign period", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
        },
      });
      const foreign = await prisma.taxRatePeriod.create({
        data: {
          userId: otherUser.id,
          startDate: new Date("2024-01-01"),
          rate: 6,
        },
      });

      const res = await request(app)
        .delete(`/api/tax-periods/${foreign.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);

      await prisma.taxRatePeriod.delete({ where: { id: foreign.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
