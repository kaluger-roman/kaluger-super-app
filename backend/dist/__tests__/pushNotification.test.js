"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const pushNotification_1 = require("../services/pushNotification");
jest.mock("web-push", () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
}));
describe("pushNotification service", () => {
    let userId;
    beforeAll(async () => {
        process.env.VAPID_PUBLIC_KEY = "test-public-key";
        process.env.VAPID_PRIVATE_KEY = "test-private-key";
        process.env.VAPID_SUBJECT = "mailto:test@test.com";
        const user = await prisma_1.default.user.create({
            data: {
                email: faker_1.faker.internet.email(),
                password: "hashed",
                name: faker_1.faker.person.fullName(),
            },
        });
        userId = user.id;
    });
    beforeEach(async () => {
        await prisma_1.default.pushSubscription.deleteMany({ where: { userId } });
        web_push_1.default.sendNotification.mockReset();
    });
    afterAll(async () => {
        await prisma_1.default.pushSubscription.deleteMany({ where: { userId } });
        await prisma_1.default.user.delete({ where: { id: userId } });
        await prisma_1.default.$disconnect();
    });
    describe("sendPushToUser", () => {
        const payload = {
            title: "Test",
            body: "Test body",
            tag: "test-tag",
            data: {
                type: "lesson_reminder",
                lessonId: "lesson-1",
                url: "/lessons",
            },
        };
        it("should send push to all user subscriptions", async () => {
            await prisma_1.default.pushSubscription.createMany({
                data: [
                    { endpoint: "https://push1.example.com", p256dh: "key1", auth: "auth1", userId },
                    { endpoint: "https://push2.example.com", p256dh: "key2", auth: "auth2", userId },
                ],
            });
            web_push_1.default.sendNotification.mockResolvedValue({});
            const result = await (0, pushNotification_1.sendPushToUser)(userId, payload);
            expect(web_push_1.default.sendNotification).toHaveBeenCalledTimes(2);
            expect(result.sent).toBe(2);
            expect(result.failed).toBe(0);
        });
        it("should return zero counts when no subscriptions exist", async () => {
            const result = await (0, pushNotification_1.sendPushToUser)(userId, payload);
            expect(web_push_1.default.sendNotification).not.toHaveBeenCalled();
            expect(result.sent).toBe(0);
            expect(result.failed).toBe(0);
        });
        it("should delete stale subscription on 410 error", async () => {
            await prisma_1.default.pushSubscription.create({
                data: {
                    endpoint: "https://stale.example.com",
                    p256dh: "key",
                    auth: "auth",
                    userId,
                },
            });
            web_push_1.default.sendNotification.mockRejectedValue({ statusCode: 410 });
            const result = await (0, pushNotification_1.sendPushToUser)(userId, payload);
            expect(result.sent).toBe(0);
            expect(result.failed).toBe(1);
            const count = await prisma_1.default.pushSubscription.count({
                where: { userId },
            });
            expect(count).toBe(0);
        });
        it("should delete stale subscription on 404 error", async () => {
            await prisma_1.default.pushSubscription.create({
                data: {
                    endpoint: "https://notfound.example.com",
                    p256dh: "key",
                    auth: "auth",
                    userId,
                },
            });
            web_push_1.default.sendNotification.mockRejectedValue({ statusCode: 404 });
            const result = await (0, pushNotification_1.sendPushToUser)(userId, payload);
            expect(result.failed).toBe(1);
            const count = await prisma_1.default.pushSubscription.count({
                where: { userId },
            });
            expect(count).toBe(0);
        });
    });
    describe("formatReminderTitle", () => {
        it("should format minutes correctly", () => {
            expect((0, pushNotification_1.formatReminderTitle)(5)).toBe("Урок через 5 минут");
            expect((0, pushNotification_1.formatReminderTitle)(30)).toBe("Урок через 30 минут");
        });
        it("should format 60 minutes as 1 hour", () => {
            expect((0, pushNotification_1.formatReminderTitle)(60)).toBe("Урок через 1 час");
        });
    });
    describe("formatReminderBody", () => {
        it("should format lesson info in Russian", () => {
            const start = new Date("2026-02-24T15:00:00");
            const end = new Date("2026-02-24T16:00:00");
            const result = (0, pushNotification_1.formatReminderBody)("MATHEMATICS", "EGE", "Иванов Пётр", start, end);
            expect(result).toBe("Математика (ЕГЭ) — Иванов Пётр, 15:00–16:00");
        });
        it("should handle all subject and lesson type combinations", () => {
            const start = new Date("2026-02-24T09:00:00");
            const end = new Date("2026-02-24T10:30:00");
            expect((0, pushNotification_1.formatReminderBody)("PHYSICS", "OGE", "Петрова Анна", start, end)).toBe("Физика (ОГЭ) — Петрова Анна, 09:00–10:30");
            expect((0, pushNotification_1.formatReminderBody)("MATHEMATICS", "SCHOOL", "Сидоров Иван", start, end)).toBe("Математика (Школа) — Сидоров Иван, 09:00–10:30");
            expect((0, pushNotification_1.formatReminderBody)("PHYSICS", "OLYMPICS", "Козлов Дмитрий", start, end)).toBe("Физика (Олимпиады) — Козлов Дмитрий, 09:00–10:30");
        });
    });
});
//# sourceMappingURL=pushNotification.test.js.map