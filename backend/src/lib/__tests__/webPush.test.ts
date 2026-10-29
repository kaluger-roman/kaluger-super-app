import { createECDH, randomBytes } from "crypto";
import webpush, { WebPushError } from "web-push";
import { prisma } from "../prisma";
import { isWebPushConfigured, sendWebPush } from "../webPush";
import { uniqueEmail, useVapidEnv } from "../../__tests__/helpers";

const browserKeys = () => {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    p256dh: ecdh.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  };
};

describe("lib/webPush", () => {
  let userId: string;
  let sendMock: jest.SpyInstance;

  useVapidEnv(webpush.generateVAPIDKeys());

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hashed", name: "Преподаватель" },
    });
    userId = user.id;
  });

  beforeEach(() => {
    sendMock = jest
      .spyOn(webpush, "sendNotification")
      .mockResolvedValue({ statusCode: 201, body: "", headers: {} });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.pushSubscription.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  const createDevice = () =>
    prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${randomBytes(6).toString("hex")}`,
        userId,
        ...browserKeys(),
      },
    });

  it("should hand the push to web-push with the VAPID keys, the delivery options and a timeout", async () => {
    const device = await createDevice();

    const outcome = await sendWebPush(
      device,
      { title: "Входящий видеозвонок" },
      { TTL: 40, urgency: "high", topic: "abcdefghijklmnopqrstuvwxyz012345" }
    );

    expect(outcome).toBe("delivered");
    expect(sendMock).toHaveBeenCalledWith(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify({ title: "Входящий видеозвонок" }),
      {
        TTL: 40,
        urgency: "high",
        topic: "abcdefghijklmnopqrstuvwxyz012345",
        timeout: 10_000,
        vapidDetails: {
          subject: "mailto:test@test.com",
          publicKey: process.env.VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        },
      }
    );
  });

  it("should forget a subscription the push service no longer knows", async () => {
    const device = await createDevice();
    sendMock.mockRejectedValue(new WebPushError("Gone", 410, {}, "", device.endpoint));

    expect(await sendWebPush(device, {})).toBe("gone");
    expect(await prisma.pushSubscription.findUnique({ where: { id: device.id } })).toBeNull();
  });

  it("should keep the subscription when the push service fails or cannot be reached", async () => {
    const device = await createDevice();
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    sendMock.mockRejectedValueOnce(new WebPushError("Error", 500, {}, "", device.endpoint));
    expect(await sendWebPush(device, {})).toBe("failed");
    sendMock.mockRejectedValueOnce(new Error("Socket timeout"));
    expect(await sendWebPush(device, {})).toBe("failed");

    expect(await prisma.pushSubscription.findUnique({ where: { id: device.id } })).not.toBeNull();
  });

  it("should send nothing without VAPID keys", async () => {
    const device = await createDevice();
    delete process.env.VAPID_SUBJECT;

    expect(isWebPushConfigured()).toBe(false);
    expect(await sendWebPush(device, {})).toBe("failed");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("should count as configured with all three VAPID values", () => {
    expect(isWebPushConfigured()).toBe(true);
  });
});
