import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("tax-periods endpoints", () => {
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

  describe("PUT /api/tax-periods", () => {
    it("returns 401 without token", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .send({ periods: [] });
      expect(res.status).toBe(401);
    });

    it("returns 400 when periods is not an array", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: "wrong" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Поле periods должно быть массивом");
    });

    it("creates the full list in a single request", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          periods: [
            { startDate: "2024-01-01", rate: 6 },
            { startDate: "2025-06-01", rate: 4 },
            { startDate: "2026-01-01", rate: 13 },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.map((p: { rate: number }) => p.rate)).toEqual([6, 4, 13]);
    });

    it("replaces an existing list atomically", async () => {
      await prisma.taxRatePeriod.createMany({
        data: [
          { userId, startDate: new Date("2024-01-01"), rate: 6 },
          { userId, startDate: new Date("2025-06-01"), rate: 4 },
        ],
      });

      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          periods: [
            { startDate: "2024-01-01", rate: 7 },
            { startDate: "2026-01-01", rate: 13 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      const stored = await prisma.taxRatePeriod.findMany({
        where: { userId },
        orderBy: { startDate: "asc" },
      });
      expect(stored.map((p) => p.rate)).toEqual([7, 13]);
    });

    it("returns 400 on duplicate startDates within payload", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          periods: [
            { startDate: "2024-01-01", rate: 6 },
            { startDate: "2024-01-01", rate: 7 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Период с такой датой начала уже существует",
      );
    });

    it("returns 400 when duplicate startDates differ only by ISO format", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          periods: [
            { startDate: "2024-01-01", rate: 6 },
            { startDate: "2024-01-01T00:00:00.000Z", rate: 7 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Период с такой датой начала уже существует",
      );
    });

    it("returns 400 when rate is below 0", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: [{ startDate: "2024-01-01", rate: -1 }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("returns 400 when rate is above 100", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: [{ startDate: "2024-01-01", rate: 101 }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ставка налога должна быть от 0 до 100");
    });

    it("rounds rate to one decimal place", async () => {
      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: [{ startDate: "2024-01-01", rate: 6.55 }] });
      expect(res.status).toBe(200);
      expect(res.body[0].rate).toBe(6.6);
    });

    it("allows empty list when taxEnabled=false", async () => {
      await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });

      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: [] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("rejects empty list when taxEnabled=true", async () => {
      await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2024-01-01"), rate: 6 },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { taxEnabled: true },
      });

      const res = await request(app)
        .put("/api/tax-periods")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periods: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Нельзя удалить последний период при включённом учёте налога",
      );
    });
  });
});
