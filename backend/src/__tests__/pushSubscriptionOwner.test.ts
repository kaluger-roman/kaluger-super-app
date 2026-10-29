import { prisma } from "../lib/prisma";
import { uniqueEmail } from "./helpers";

const uniqueEndpoint = (): string =>
  `https://push.example.org/send/${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("push_subscriptions single owner", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hash", name: "Анна" },
    });
    tutorId = tutor.id;
    const student = await prisma.student.create({ data: { name: "Иван", tutorId } });
    studentId = student.id;
    const studentUser = await prisma.studentUser.create({
      data: { email: uniqueEmail(), password: "hash", name: "Иван", studentId },
    });
    studentUserId = studentUser.id;
  });

  afterEach(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { OR: [{ userId: tutorId }, { studentUserId }] },
    });
  });

  afterAll(async () => {
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
  });

  it("should reject a subscription without an owner", async () => {
    await expect(
      prisma.pushSubscription.create({
        data: { endpoint: uniqueEndpoint(), p256dh: "key", auth: "auth" },
      })
    ).rejects.toThrow(/push_subscriptions_single_owner/);
  });

  it("should reject a subscription owned by a tutor and a student at once", async () => {
    await expect(
      prisma.pushSubscription.create({
        data: {
          endpoint: uniqueEndpoint(),
          p256dh: "key",
          auth: "auth",
          userId: tutorId,
          studentUserId,
        },
      })
    ).rejects.toThrow(/push_subscriptions_single_owner/);
  });

  it("should store a student-owned subscription on the web push channel by default", async () => {
    const subscription = await prisma.pushSubscription.create({
      data: { endpoint: uniqueEndpoint(), p256dh: "key", auth: "auth", studentUserId },
    });

    expect(subscription.channel).toBe("WEB_PUSH");
    expect(subscription.userId).toBeNull();
    expect(subscription.studentUserId).toBe(studentUserId);
  });

  it("should keep tutor-owned subscriptions as before", async () => {
    const subscription = await prisma.pushSubscription.create({
      data: { endpoint: uniqueEndpoint(), p256dh: "key", auth: "auth", userId: tutorId },
    });

    expect(subscription.channel).toBe("WEB_PUSH");
    expect(subscription.studentUserId).toBeNull();
  });

  it("should delete the student's subscriptions together with the student account", async () => {
    const email = uniqueEmail();
    const otherStudent = await prisma.student.create({ data: { name: "Пётр", tutorId } });
    const otherUser = await prisma.studentUser.create({
      data: { email, password: "hash", name: "Пётр", studentId: otherStudent.id },
    });
    await prisma.pushSubscription.create({
      data: {
        endpoint: uniqueEndpoint(),
        p256dh: "key",
        auth: "auth",
        studentUserId: otherUser.id,
      },
    });

    await prisma.studentUser.delete({ where: { id: otherUser.id } });
    await prisma.student.delete({ where: { id: otherStudent.id } });

    expect(await prisma.pushSubscription.count({ where: { studentUserId: otherUser.id } })).toBe(0);
  });
});
