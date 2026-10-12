import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { reconcileReceivedAmounts } from "../receivedAmount";

describe("reconcileReceivedAmounts", () => {
  let tutorId: string;
  let otherTutorId: string;

  const createLesson = (data: {
    tutorId: string;
    isPaid: boolean;
    price: number | null;
    receivedAmount: number | null;
  }) =>
    prisma.lesson.create({
      data: {
        ...data,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });

  const receivedOf = async (id: string) =>
    (await prisma.lesson.findUniqueOrThrow({ where: { id } })).receivedAmount?.toNumber() ?? null;

  beforeEach(async () => {
    const [tutor, otherTutor] = await Promise.all(
      [0, 1].map(() =>
        prisma.user.create({
          data: { email: `reconcile-${randomUUID()}@test.local`, password: "x", name: "Учитель" },
        })
      )
    );
    tutorId = tutor.id;
    otherTutorId = otherTutor.id;
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: { in: [tutorId, otherTutorId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [tutorId, otherTutorId] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should fill the price into a paid lesson written without a received amount", async () => {
    const lesson = await createLesson({ tutorId, isPaid: true, price: 1500, receivedAmount: null });

    const result = await reconcileReceivedAmounts({ tutorIds: [tutorId] });

    expect(result).toEqual({ filled: 1, cleared: 0 });
    expect(await receivedOf(lesson.id)).toBe(1500);
  });

  it("should fill zero into a paid lesson without a price", async () => {
    const lesson = await createLesson({ tutorId, isPaid: true, price: null, receivedAmount: null });

    await reconcileReceivedAmounts({ tutorIds: [tutorId] });

    expect(await receivedOf(lesson.id)).toBe(0);
  });

  it("should clear the received amount of a lesson that was unpaid without it", async () => {
    const lesson = await createLesson({
      tutorId,
      isPaid: false,
      price: 1500,
      receivedAmount: 1500,
    });

    const result = await reconcileReceivedAmounts({ tutorIds: [tutorId] });

    expect(result).toEqual({ filled: 0, cleared: 1 });
    expect(await receivedOf(lesson.id)).toBeNull();
  });

  it("should keep consistent lessons untouched and be idempotent", async () => {
    const paid = await createLesson({ tutorId, isPaid: true, price: 2000, receivedAmount: 1800 });
    const unpaid = await createLesson({
      tutorId,
      isPaid: false,
      price: 2000,
      receivedAmount: null,
    });

    expect(await reconcileReceivedAmounts({ tutorIds: [tutorId] })).toEqual({
      filled: 0,
      cleared: 0,
    });
    expect(await receivedOf(paid.id)).toBe(1800);
    expect(await receivedOf(unpaid.id)).toBeNull();
  });

  it("should not touch lessons of tutors outside the scope", async () => {
    const other = await createLesson({
      tutorId: otherTutorId,
      isPaid: true,
      price: 1500,
      receivedAmount: null,
    });

    await reconcileReceivedAmounts({ tutorIds: [tutorId] });

    expect(await receivedOf(other.id)).toBeNull();
  });

  it("should do nothing for an empty scope", async () => {
    expect(await reconcileReceivedAmounts({ tutorIds: [] })).toEqual({ filled: 0, cleared: 0 });
  });
});
