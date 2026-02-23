import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("news integration tests", () => {
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

  beforeEach(async () => {
    await prisma.newsReadStatus.deleteMany({ where: { userId } });
    await prisma.newsItem.deleteMany();
  });

  afterAll(async () => {
    await prisma.newsReadStatus.deleteMany({ where: { userId } });
    await prisma.newsItem.deleteMany();
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("GET /api/news", () => {
    it("should return empty list when no news exist", async () => {
      const res = await request(app)
        .get("/api/news")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.news).toEqual([]);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it("should return news sorted by publishedAt descending", async () => {
      const older = await prisma.newsItem.create({
        data: {
          title: "Old news",
          content: "Old content",
          publishedAt: new Date("2024-01-01"),
        },
      });
      const newer = await prisma.newsItem.create({
        data: {
          title: "New news",
          content: "New content",
          publishedAt: new Date("2024-06-01"),
        },
      });

      const res = await request(app)
        .get("/api/news")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.news).toHaveLength(2);
      expect(res.body.news[0].id).toBe(newer.id);
      expect(res.body.news[1].id).toBe(older.id);
    });

    it("should use default pagination (page=1, limit=20)", async () => {
      await prisma.newsItem.create({
        data: {
          title: "News",
          content: "Content",
          publishedAt: new Date(),
        },
      });

      const res = await request(app)
        .get("/api/news")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    it("should respect page and limit query params", async () => {
      for (let i = 0; i < 5; i++) {
        await prisma.newsItem.create({
          data: {
            title: `News ${i}`,
            content: `Content ${i}`,
            publishedAt: new Date(2024, 0, i + 1),
          },
        });
      }

      const res = await request(app)
        .get("/api/news?page=2&limit=2")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.news).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it("should clamp page to min 1, limit to min 1 / max 100", async () => {
      const resMinPage = await request(app)
        .get("/api/news?page=-5")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(resMinPage.body.pagination.page).toBe(1);

      const resMaxLimit = await request(app)
        .get("/api/news?limit=999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(resMaxLimit.body.pagination.limit).toBe(100);
    });

    it("should return correct response format", async () => {
      await prisma.newsItem.create({
        data: {
          title: "Test Title",
          content: "Test Content",
          version: "1.0.0",
          publishedAt: new Date("2024-06-15T12:00:00Z"),
        },
      });

      const res = await request(app)
        .get("/api/news")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const item = res.body.news[0];
      expect(item).toHaveProperty("id");
      expect(item.title).toBe("Test Title");
      expect(item.content).toBe("Test Content");
      expect(item.version).toBe("1.0.0");
      expect(item.publishedAt).toBe("2024-06-15T12:00:00.000Z");
      expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should return 401 without auth token", async () => {
      await request(app).get("/api/news").expect(401);
    });
  });

  describe("GET /api/news/has-unread", () => {
    it("should return false when no news exist", async () => {
      const res = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.hasUnread).toBe(false);
    });

    it("should return true when news exist but no read status", async () => {
      await prisma.newsItem.create({
        data: {
          title: "Unread",
          content: "Content",
          publishedAt: new Date(),
        },
      });

      const res = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.hasUnread).toBe(true);
    });

    it("should return true when lastReadAt < latest publishedAt", async () => {
      await prisma.newsItem.create({
        data: {
          title: "New",
          content: "Content",
          publishedAt: new Date("2024-06-15"),
        },
      });

      await prisma.newsReadStatus.create({
        data: {
          userId,
          lastReadAt: new Date("2024-06-01"),
        },
      });

      const res = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.hasUnread).toBe(true);
    });

    it("should return false when lastReadAt >= latest publishedAt", async () => {
      await prisma.newsItem.create({
        data: {
          title: "Old",
          content: "Content",
          publishedAt: new Date("2024-06-01"),
        },
      });

      await prisma.newsReadStatus.create({
        data: {
          userId,
          lastReadAt: new Date("2024-06-15"),
        },
      });

      const res = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.hasUnread).toBe(false);
    });
  });

  describe("POST /api/news/mark-read", () => {
    it("should create read status on first call", async () => {
      await request(app)
        .post("/api/news/mark-read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const status = await prisma.newsReadStatus.findUnique({
        where: { userId },
      });

      expect(status).not.toBeNull();
      expect(status!.lastReadAt).toBeInstanceOf(Date);
    });

    it("should update lastReadAt on subsequent calls", async () => {
      await prisma.newsReadStatus.create({
        data: {
          userId,
          lastReadAt: new Date("2024-01-01"),
        },
      });

      await request(app)
        .post("/api/news/mark-read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const status = await prisma.newsReadStatus.findUnique({
        where: { userId },
      });

      expect(status!.lastReadAt.getTime()).toBeGreaterThan(
        new Date("2024-01-01").getTime()
      );
    });

    it("should return Russian success message", async () => {
      const res = await request(app)
        .post("/api/news/mark-read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.message).toBe("Новости отмечены как прочитанные");
    });
  });

  describe("cross-endpoint", () => {
    it("should return hasUnread false after mark-read", async () => {
      await prisma.newsItem.create({
        data: {
          title: "News",
          content: "Content",
          publishedAt: new Date(),
        },
      });

      const beforeRes = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(beforeRes.body.hasUnread).toBe(true);

      await request(app)
        .post("/api/news/mark-read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const afterRes = await request(app)
        .get("/api/news/has-unread")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(afterRes.body.hasUnread).toBe(false);
    });
  });
});
