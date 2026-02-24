import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../index";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/auth";

describe("push subscription integration tests", () => {
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
    await prisma.pushSubscription.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("GET /api/push/vapid-key", () => {
    it("should return VAPID public key", async () => {
      const res = await request(app)
        .get("/api/push/vapid-key")
        .expect(200);

      expect(res.body).toHaveProperty("vapidPublicKey");
      expect(typeof res.body.vapidPublicKey).toBe("string");
      expect(res.body.vapidPublicKey.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/push/subscribe", () => {
    it("should create subscription with valid data and return 201", async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(20)}`;

      const res = await request(app)
        .post("/api/push/subscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          subscription: {
            endpoint,
            keys: {
              p256dh: faker.string.alphanumeric(50),
              auth: faker.string.alphanumeric(20),
            },
          },
          deviceName: "Test Device",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.endpoint).toBe(endpoint);
      expect(res.body.deviceName).toBe("Test Device");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should upsert existing subscription and return 200", async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(20)}`;
      const subscriptionData = {
        subscription: {
          endpoint,
          keys: {
            p256dh: faker.string.alphanumeric(50),
            auth: faker.string.alphanumeric(20),
          },
        },
        deviceName: "Device 1",
      };

      const firstRes = await request(app)
        .post("/api/push/subscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      const secondRes = await request(app)
        .post("/api/push/subscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ ...subscriptionData, deviceName: "Device 2" })
        .expect(200);

      expect(secondRes.body.id).toBe(firstRes.body.id);

      const count = await prisma.pushSubscription.count({
        where: { endpoint },
      });
      expect(count).toBe(1);
    });

    it("should return 400 when subscription data is invalid", async () => {
      const res = await request(app)
        .post("/api/push/subscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          subscription: {
            endpoint: "",
            keys: { p256dh: "", auth: "" },
          },
        })
        .expect(400);

      expect(res.body.error).toBe("Некорректные данные подписки");
    });

    it("should return 400 when endpoint is not a valid URL", async () => {
      const res = await request(app)
        .post("/api/push/subscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          subscription: {
            endpoint: "not-a-url",
            keys: { p256dh: "key", auth: "auth" },
          },
        })
        .expect(400);

      expect(res.body.error).toBe("Некорректные данные подписки");
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .post("/api/push/subscribe")
        .send({
          subscription: {
            endpoint: "https://example.com",
            keys: { p256dh: "key", auth: "auth" },
          },
        })
        .expect(401);
    });
  });

  describe("DELETE /api/push/unsubscribe", () => {
    it("should delete subscription and return 200", async () => {
      const endpoint = `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(20)}`;

      await prisma.pushSubscription.create({
        data: {
          endpoint,
          p256dh: "key",
          auth: "auth",
          userId,
        },
      });

      const res = await request(app)
        .delete("/api/push/unsubscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ endpoint })
        .expect(200);

      expect(res.body.message).toBe("Подписка удалена");

      const count = await prisma.pushSubscription.count({
        where: { endpoint },
      });
      expect(count).toBe(0);
    });

    it("should return 404 when subscription not found", async () => {
      const res = await request(app)
        .delete("/api/push/unsubscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ endpoint: "https://nonexistent.example.com" })
        .expect(404);

      expect(res.body.error).toBe("Подписка не найдена");
    });

    it("should return 400 when endpoint is missing", async () => {
      const res = await request(app)
        .delete("/api/push/unsubscribe")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe("Некорректные данные подписки");
    });
  });

  describe("GET /api/push/subscriptions", () => {
    it("should return all subscriptions for authenticated user", async () => {
      const endpoint1 = `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(20)}`;
      const endpoint2 = `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(20)}`;

      await prisma.pushSubscription.createMany({
        data: [
          { endpoint: endpoint1, p256dh: "key1", auth: "auth1", userId, deviceName: "Device 1" },
          { endpoint: endpoint2, p256dh: "key2", auth: "auth2", userId, deviceName: "Device 2" },
        ],
      });

      const res = await request(app)
        .get("/api/push/subscriptions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.subscriptions).toHaveLength(2);
      expect(res.body.subscriptions[0]).toHaveProperty("id");
      expect(res.body.subscriptions[0]).toHaveProperty("endpoint");
      expect(res.body.subscriptions[0]).toHaveProperty("deviceName");
      expect(res.body.subscriptions[0]).toHaveProperty("createdAt");
    });

    it("should return only current user subscriptions", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: "hashed",
          name: faker.person.fullName(),
        },
      });

      await prisma.pushSubscription.create({
        data: {
          endpoint: `https://other.example.com/${faker.string.alphanumeric(10)}`,
          p256dh: "key",
          auth: "auth",
          userId: otherUser.id,
        },
      });

      await prisma.pushSubscription.create({
        data: {
          endpoint: `https://my.example.com/${faker.string.alphanumeric(10)}`,
          p256dh: "key",
          auth: "auth",
          userId,
        },
      });

      const res = await request(app)
        .get("/api/push/subscriptions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.subscriptions).toHaveLength(1);
      expect(res.body.subscriptions[0].endpoint).toContain("my.example.com");

      // Cleanup other user
      await prisma.pushSubscription.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it("should return empty array when no subscriptions exist", async () => {
      const res = await request(app)
        .get("/api/push/subscriptions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.subscriptions).toEqual([]);
    });
  });
});
