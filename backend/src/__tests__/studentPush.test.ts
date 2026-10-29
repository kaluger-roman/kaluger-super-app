import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../index";
import { prisma } from "../lib/prisma";
import { MAX_PUSH_SUBSCRIPTIONS_PER_OWNER } from "../services";
import { generateStudentToken } from "../utils/studentAuth";
import { uniqueEmail } from "./helpers";

const newEndpoint = () => `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(24)}`;

const createStudentUser = async () => {
  const studentUser = await prisma.studentUser.create({
    data: { email: uniqueEmail(), password: "hashed", name: "Иван" },
  });
  const token = generateStudentToken({
    studentUserId: studentUser.id,
    email: studentUser.email,
    isStudent: true,
    tokenVersion: studentUser.tokenVersion,
  });
  return { studentUserId: studentUser.id, token };
};

describe("student push subscription API", () => {
  let studentUserId: string;
  let studentToken: string;
  let tutorId: string;

  beforeAll(async () => {
    ({ studentUserId, token: studentToken } = await createStudentUser());
    const tutor = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hashed", name: "Анна Сергеевна" },
    });
    tutorId = tutor.id;
  });

  beforeEach(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { OR: [{ studentUserId }, { userId: tutorId }] },
    });
  });

  afterAll(async () => {
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
    await prisma.$disconnect();
  });

  describe("POST /api/student-push/subscribe", () => {
    it("should create a WEB_PUSH subscription owned by the student and return 201", async () => {
      const endpoint = newEndpoint();

      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          subscription: { endpoint, keys: { p256dh: "p", auth: "a" } },
          deviceName: "iPhone",
        })
        .expect(201);

      expect(res.body).toMatchObject({ endpoint, deviceName: "iPhone" });
      expect(typeof res.body.id).toBe("string");
      expect(typeof res.body.createdAt).toBe("string");
      const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
      expect(stored).toMatchObject({
        channel: "WEB_PUSH",
        studentUserId,
        userId: null,
        p256dh: "p",
        auth: "a",
      });
    });

    it("should update keys of the student's own endpoint and return 200", async () => {
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "old", auth: "old", studentUserId },
      });

      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ subscription: { endpoint, keys: { p256dh: "new", auth: "new" } } })
        .expect(200);

      expect(res.body.endpoint).toBe(endpoint);
      expect(res.body.deviceName).toBeNull();
      const rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ p256dh: "new", auth: "new", studentUserId });
    });

    it.each([
      [{}],
      [{ subscription: { endpoint: "not-a-url", keys: { p256dh: "p", auth: "a" } } }],
      [{ subscription: { endpoint: "https://push.example.com/x", keys: { p256dh: "p" } } }],
      [{ subscription: { endpoint: 42, keys: { p256dh: "p", auth: "a" } } }],
    ])("should return 400 for invalid subscription data %#", async (body) => {
      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(body)
        .expect(400);

      expect(res.body.error).toBe("Некорректные данные подписки");
    });

    it("should return 400 when device name is too long", async () => {
      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          subscription: { endpoint: newEndpoint(), keys: { p256dh: "p", auth: "a" } },
          deviceName: "x".repeat(101),
        })
        .expect(400);

      expect(res.body.error).toBe("Название устройства слишком длинное");
    });

    it("should return 403 for a tutor's endpoint sent without its keys", async () => {
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", userId: tutorId },
      });

      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ subscription: { endpoint, keys: { p256dh: "x", auth: "y" } } })
        .expect(403);

      expect(res.body.error).toBe("Подписка принадлежит другому пользователю");
      const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
      expect(stored).toMatchObject({ userId: tutorId, studentUserId: null, p256dh: "p" });
    });

    it("should return 403 for another student's endpoint sent without its keys", async () => {
      const other = await createStudentUser();
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", studentUserId: other.studentUserId },
      });

      try {
        const res = await request(app)
          .post("/api/student-push/subscribe")
          .set("Authorization", `Bearer ${studentToken}`)
          .send({ subscription: { endpoint, keys: { p256dh: "x", auth: "y" } } })
          .expect(403);

        expect(res.body.error).toBe("Подписка принадлежит другому пользователю");
        const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
        expect(stored.studentUserId).toBe(other.studentUserId);
      } finally {
        await prisma.studentUser.delete({ where: { id: other.studentUserId } });
      }
    });

    it("should return 403 when only one of the keys matches", async () => {
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", userId: tutorId },
      });

      await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ subscription: { endpoint, keys: { p256dh: "p", auth: "other" } } })
        .expect(403);

      const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
      expect(stored.userId).toBe(tutorId);
    });

    it("should move a tutor's subscription to the student whose browser holds it", async () => {
      const endpoint = newEndpoint();
      const seeded = await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", userId: tutorId },
      });

      const res = await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ subscription: { endpoint, keys: { p256dh: "p", auth: "a" } } })
        .expect(200);

      expect(res.body).toMatchObject({ id: seeded.id, endpoint });
      const rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: null, studentUserId, channel: "WEB_PUSH" });
      expect(await prisma.pushSubscription.count({ where: { userId: tutorId } })).toBe(0);
    });

    it("should move another student's subscription to the student whose browser holds it", async () => {
      const other = await createStudentUser();
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", studentUserId: other.studentUserId },
      });

      try {
        await request(app)
          .post("/api/student-push/subscribe")
          .set("Authorization", `Bearer ${studentToken}`)
          .send({ subscription: { endpoint, keys: { p256dh: "p", auth: "a" } } })
          .expect(200);

        const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
        expect(stored).toMatchObject({ studentUserId, userId: null });
      } finally {
        await prisma.studentUser.delete({ where: { id: other.studentUserId } });
      }
    });

    it("should drop the student's device registered longest ago beyond the per-owner cap", async () => {
      const seeded = await Promise.all(
        Array.from({ length: MAX_PUSH_SUBSCRIPTIONS_PER_OWNER }, (_, index) =>
          prisma.pushSubscription.create({
            data: {
              endpoint: newEndpoint(),
              p256dh: "p",
              auth: "a",
              studentUserId,
              createdAt: new Date(Date.now() - (MAX_PUSH_SUBSCRIPTIONS_PER_OWNER - index) * 60_000),
            },
          })
        )
      );
      const endpoint = newEndpoint();

      await request(app)
        .post("/api/student-push/subscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ subscription: { endpoint, keys: { p256dh: "p", auth: "a" } } })
        .expect(201);

      const endpoints = (await prisma.pushSubscription.findMany({ where: { studentUserId } })).map(
        (row) => row.endpoint
      );
      expect(endpoints).toHaveLength(MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      expect(endpoints).toContain(endpoint);
      expect(endpoints).not.toContain(seeded[0].endpoint);
    });

    it("should return 401 without a token", async () => {
      await request(app)
        .post("/api/student-push/subscribe")
        .send({ subscription: { endpoint: newEndpoint(), keys: { p256dh: "p", auth: "a" } } })
        .expect(401);
    });
  });

  describe("DELETE /api/student-push/unsubscribe", () => {
    it("should delete the student's own subscription", async () => {
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", studentUserId },
      });

      const res = await request(app)
        .delete("/api/student-push/unsubscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ endpoint })
        .expect(200);

      expect(res.body.message).toBe("Подписка удалена");
      expect(await prisma.pushSubscription.findUnique({ where: { endpoint } })).toBeNull();
    });

    it("should return 404 and keep the subscription when it belongs to a tutor", async () => {
      const endpoint = newEndpoint();
      await prisma.pushSubscription.create({
        data: { endpoint, p256dh: "p", auth: "a", userId: tutorId },
      });

      const res = await request(app)
        .delete("/api/student-push/unsubscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ endpoint })
        .expect(404);

      expect(res.body.error).toBe("Подписка не найдена");
      expect(await prisma.pushSubscription.findUnique({ where: { endpoint } })).not.toBeNull();
    });

    it("should return 404 for an unknown endpoint", async () => {
      await request(app)
        .delete("/api/student-push/unsubscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ endpoint: newEndpoint() })
        .expect(404);
    });

    it("should return 400 when endpoint is missing", async () => {
      const res = await request(app)
        .delete("/api/student-push/unsubscribe")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe("Некорректные данные подписки");
    });
  });

  it("should delete the student's subscriptions together with the student account", async () => {
    const student = await createStudentUser();
    const endpoint = newEndpoint();
    await prisma.pushSubscription.create({
      data: { endpoint, p256dh: "p", auth: "a", studentUserId: student.studentUserId },
    });

    await prisma.studentUser.delete({ where: { id: student.studentUserId } });

    expect(await prisma.pushSubscription.findUnique({ where: { endpoint } })).toBeNull();
  });
});
