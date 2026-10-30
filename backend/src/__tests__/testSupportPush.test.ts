import request from "supertest";
import webpush from "web-push";
import { app } from "../index";
import { prisma } from "../lib/prisma";
import { sendWebPush } from "../lib/webPush";
import { uniqueEmail, useVapidEnv } from "./helpers";

describe("test support: push subscriptions and the push sink", () => {
  let userId: string;

  useVapidEnv(webpush.generateVAPIDKeys());

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hash", name: "Анна" },
    });
    userId = user.id;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("should take an encrypted push to a seeded subscription into the sink, not the network, with the payload the notification opens", async () => {
    const send = jest.spyOn(webpush, "sendNotification");
    const key = `sink-${Date.now()}`;
    const seeded = await request(app)
      .post("/api/__test__/push-subscriptions")
      .send({ endpoint: `http://localhost:3131/api/__test__/push-sink/${key}`, userId })
      .expect(201);
    const device = await prisma.pushSubscription.findUniqueOrThrow({
      where: { id: seeded.body.id },
    });

    const payload = {
      title: "Входящий видеозвонок",
      data: {
        type: "incoming_call",
        callId: "call-1",
        url: "/student/cabinet/schedule?call=call-1",
      },
    };
    const outcome = await sendWebPush(device, payload, {
      TTL: 40,
      urgency: "high",
      topic: "topic-of-the-call",
    });

    expect(outcome).toBe("delivered");
    expect(send).not.toHaveBeenCalled();
    const sink = await request(app).get(`/api/__test__/push-sink/${key}`).expect(200);
    expect(sink.body.pushes).toEqual([
      expect.objectContaining({ ttl: "40", urgency: "high", topic: "topic-of-the-call", payload }),
    ]);
  });

  it("should list nothing for a sink no push reached", async () => {
    const sink = await request(app).get("/api/__test__/push-sink/empty").expect(200);

    expect(sink.body.pushes).toEqual([]);
  });
});
