"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const faker_1 = require("@faker-js/faker");
const index_1 = require("../../../index");
const prisma_1 = __importDefault(require("../../../lib/prisma"));
const auth_1 = require("../../../utils/auth");
describe("news integration tests", () => {
    let authToken;
    let userId;
    beforeAll(async () => {
        const user = await prisma_1.default.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: "hashed",
                name: faker_1.faker.person.fullName(),
            },
        });
        userId = user.id;
        authToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
    });
    beforeEach(async () => {
        await prisma_1.default.newsReadStatus.deleteMany({ where: { userId } });
        await prisma_1.default.newsItem.deleteMany();
    });
    afterAll(async () => {
        await prisma_1.default.newsReadStatus.deleteMany({ where: { userId } });
        await prisma_1.default.newsItem.deleteMany();
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    describe("GET /api/news", () => {
        it("should return empty list when no news exist", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
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
            const older = await prisma_1.default.newsItem.create({
                data: {
                    title: "Old news",
                    content: "Old content",
                    publishedAt: new Date("2024-01-01"),
                },
            });
            const newer = await prisma_1.default.newsItem.create({
                data: {
                    title: "New news",
                    content: "New content",
                    publishedAt: new Date("2024-06-01"),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.news).toHaveLength(2);
            expect(res.body.news[0].id).toBe(newer.id);
            expect(res.body.news[1].id).toBe(older.id);
        });
        it("should use default pagination (page=1, limit=20)", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "News",
                    content: "Content",
                    publishedAt: new Date(),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(20);
        });
        it("should respect page and limit query params", async () => {
            for (let i = 0; i < 5; i++) {
                await prisma_1.default.newsItem.create({
                    data: {
                        title: `News ${i}`,
                        content: `Content ${i}`,
                        publishedAt: new Date(2024, 0, i + 1),
                    },
                });
            }
            const res = await (0, supertest_1.default)(index_1.app)
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
            const resMinPage = await (0, supertest_1.default)(index_1.app)
                .get("/api/news?page=-5")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(resMinPage.body.pagination.page).toBe(1);
            const resMaxLimit = await (0, supertest_1.default)(index_1.app)
                .get("/api/news?limit=999")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(resMaxLimit.body.pagination.limit).toBe(100);
        });
        it("should return correct response format", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "Test Title",
                    content: "Test Content",
                    version: "1.0.0",
                    publishedAt: new Date("2024-06-15T12:00:00Z"),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
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
            await (0, supertest_1.default)(index_1.app).get("/api/news").expect(401);
        });
    });
    describe("GET /api/news/has-unread", () => {
        it("should return false when no news exist", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.hasUnread).toBe(false);
        });
        it("should return true when news exist but no read status", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "Unread",
                    content: "Content",
                    publishedAt: new Date(),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.hasUnread).toBe(true);
        });
        it("should return true when lastReadAt < latest publishedAt", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "New",
                    content: "Content",
                    publishedAt: new Date("2024-06-15"),
                },
            });
            await prisma_1.default.newsReadStatus.create({
                data: {
                    userId,
                    lastReadAt: new Date("2024-06-01"),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.hasUnread).toBe(true);
        });
        it("should return false when lastReadAt >= latest publishedAt", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "Old",
                    content: "Content",
                    publishedAt: new Date("2024-06-01"),
                },
            });
            await prisma_1.default.newsReadStatus.create({
                data: {
                    userId,
                    lastReadAt: new Date("2024-06-15"),
                },
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.hasUnread).toBe(false);
        });
    });
    describe("POST /api/news/mark-read", () => {
        it("should create read status on first call", async () => {
            await (0, supertest_1.default)(index_1.app)
                .post("/api/news/mark-read")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            const status = await prisma_1.default.newsReadStatus.findUnique({
                where: { userId },
            });
            expect(status).not.toBeNull();
            expect(status.lastReadAt).toBeInstanceOf(Date);
        });
        it("should update lastReadAt on subsequent calls", async () => {
            await prisma_1.default.newsReadStatus.create({
                data: {
                    userId,
                    lastReadAt: new Date("2024-01-01"),
                },
            });
            await (0, supertest_1.default)(index_1.app)
                .post("/api/news/mark-read")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            const status = await prisma_1.default.newsReadStatus.findUnique({
                where: { userId },
            });
            expect(status.lastReadAt.getTime()).toBeGreaterThan(new Date("2024-01-01").getTime());
        });
        it("should return Russian success message", async () => {
            const res = await (0, supertest_1.default)(index_1.app)
                .post("/api/news/mark-read")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.message).toBe("Новости отмечены как прочитанные");
        });
    });
    describe("cross-endpoint", () => {
        it("should return hasUnread false after mark-read", async () => {
            await prisma_1.default.newsItem.create({
                data: {
                    title: "News",
                    content: "Content",
                    publishedAt: new Date(),
                },
            });
            const beforeRes = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(beforeRes.body.hasUnread).toBe(true);
            await (0, supertest_1.default)(index_1.app)
                .post("/api/news/mark-read")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            const afterRes = await (0, supertest_1.default)(index_1.app)
                .get("/api/news/has-unread")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
            expect(afterRes.body.hasUnread).toBe(false);
        });
    });
});
//# sourceMappingURL=news.test.js.map