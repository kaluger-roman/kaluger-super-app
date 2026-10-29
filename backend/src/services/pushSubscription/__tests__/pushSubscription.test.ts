import { randomUUID } from "crypto";
import { uniqueEmail } from "../../../__tests__/helpers";
import { prisma } from "../../../lib/prisma";
import { bindPushSubscription, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER } from "..";

const newEndpoint = () => `https://push.example.com/${randomUUID()}`;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

describe("bindPushSubscription", () => {
  let tutorId: string;
  let otherTutorId: string;
  let studentUserId: string;

  const tutor = () => ({ kind: "tutor" as const, id: tutorId });
  const student = () => ({ kind: "student" as const, id: studentUserId });
  const dto = (endpoint: string, keys = { p256dh: "p", auth: "a" }, deviceName?: string) => ({
    subscription: { endpoint, keys },
    deviceName,
  });

  const seedDevices = (owner: { userId: string } | { studentUserId: string }, count: number) =>
    Promise.all(
      Array.from({ length: count }, (_, index) =>
        prisma.pushSubscription.create({
          data: {
            endpoint: newEndpoint(),
            p256dh: "p",
            auth: "a",
            createdAt: minutesAgo(count - index),
            ...owner,
          },
        })
      )
    );

  beforeAll(async () => {
    const [user, otherUser, studentUser] = await Promise.all([
      prisma.user.create({ data: { email: uniqueEmail(), password: "hash", name: "Анна" } }),
      prisma.user.create({ data: { email: uniqueEmail(), password: "hash", name: "Ольга" } }),
      prisma.studentUser.create({ data: { email: uniqueEmail(), password: "hash", name: "Иван" } }),
    ]);
    tutorId = user.id;
    otherTutorId = otherUser.id;
    studentUserId = studentUser.id;
  });

  afterEach(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { OR: [{ userId: { in: [tutorId, otherTutorId] } }, { studentUserId }] },
    });
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: studentUserId } });
    await prisma.user.deleteMany({ where: { id: { in: [tutorId, otherTutorId] } } });
  });

  it("should create a web push subscription owned by the student only", async () => {
    const endpoint = newEndpoint();

    const result = await bindPushSubscription(student(), dto(endpoint, undefined, "iPhone"));

    expect(result.outcome).toBe("created");
    const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
    expect(stored).toMatchObject({
      channel: "WEB_PUSH",
      studentUserId,
      userId: null,
      deviceName: "iPhone",
    });
  });

  it("should update the keys of the owner's own endpoint", async () => {
    const endpoint = newEndpoint();
    const seeded = await prisma.pushSubscription.create({
      data: { endpoint, p256dh: "old", auth: "old", userId: tutorId },
    });

    const result = await bindPushSubscription(
      tutor(),
      dto(endpoint, { p256dh: "new", auth: "new" })
    );

    expect(result).toMatchObject({ outcome: "updated", subscription: { id: seeded.id } });
    const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
    expect(stored).toMatchObject({ p256dh: "new", auth: "new", userId: tutorId });
  });

  it("should forbid another owner's endpoint sent without its keys and keep it", async () => {
    const endpoint = newEndpoint();
    await prisma.pushSubscription.create({
      data: { endpoint, p256dh: "p", auth: "a", userId: otherTutorId },
    });

    const result = await bindPushSubscription(student(), dto(endpoint, { p256dh: "p", auth: "x" }));

    expect(result).toEqual({ outcome: "forbidden" });
    const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
    expect(stored).toMatchObject({ userId: otherTutorId, studentUserId: null, auth: "a" });
  });

  it("should move another owner's endpoint to the holder of its keys", async () => {
    const endpoint = newEndpoint();
    const seeded = await prisma.pushSubscription.create({
      data: { endpoint, p256dh: "p", auth: "a", studentUserId },
    });

    const result = await bindPushSubscription(tutor(), dto(endpoint));

    expect(result).toMatchObject({ outcome: "updated", subscription: { id: seeded.id } });
    const stored = await prisma.pushSubscription.findUniqueOrThrow({ where: { endpoint } });
    expect(stored).toMatchObject({ userId: tutorId, studentUserId: null });
  });

  describe("devices per owner cap", () => {
    it("should drop the owner's device registered longest ago beyond the cap", async () => {
      const seeded = await seedDevices({ studentUserId }, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      const endpoint = newEndpoint();

      await bindPushSubscription(student(), dto(endpoint));

      const rows = await prisma.pushSubscription.findMany({ where: { studentUserId } });
      expect(rows).toHaveLength(MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      expect(rows.map((row) => row.endpoint).sort()).toEqual(
        [...seeded.slice(1).map((row) => row.endpoint), endpoint].sort()
      );
    });

    it("should keep a device that registers again and drop the next oldest", async () => {
      const seeded = await seedDevices({ userId: tutorId }, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      const [oldest, secondOldest] = seeded;

      await bindPushSubscription(tutor(), dto(oldest.endpoint));
      await bindPushSubscription(tutor(), dto(newEndpoint()));

      const endpoints = (
        await prisma.pushSubscription.findMany({ where: { userId: tutorId } })
      ).map((row) => row.endpoint);
      expect(endpoints).toHaveLength(MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      expect(endpoints).toContain(oldest.endpoint);
      expect(endpoints).not.toContain(secondOldest.endpoint);
    });

    it("should count a taken over device against the new owner and leave other owners alone", async () => {
      await seedDevices({ userId: tutorId }, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      const otherDevices = await seedDevices({ userId: otherTutorId }, 3);
      const taken = await prisma.pushSubscription.create({
        data: { endpoint: newEndpoint(), p256dh: "p", auth: "a", studentUserId },
      });

      await bindPushSubscription(tutor(), dto(taken.endpoint));

      const rows = await prisma.pushSubscription.findMany({ where: { userId: tutorId } });
      expect(rows).toHaveLength(MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      expect(rows.map((row) => row.id)).toContain(taken.id);
      expect(await prisma.pushSubscription.count({ where: { userId: otherTutorId } })).toBe(
        otherDevices.length
      );
    });

    it("should not drop anything while the owner is within the cap", async () => {
      await seedDevices({ studentUserId }, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER - 1);

      await bindPushSubscription(student(), dto(newEndpoint()));

      expect(await prisma.pushSubscription.count({ where: { studentUserId } })).toBe(
        MAX_PUSH_SUBSCRIPTIONS_PER_OWNER
      );
    });
  });
});
