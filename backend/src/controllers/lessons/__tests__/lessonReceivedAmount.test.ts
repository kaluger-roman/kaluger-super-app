import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import * as wsManager from "../../../lib/wsManager";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const at = (daysFromNow: number, hourUtc = 10) => {
  const date = new Date(Date.now() + daysFromNow * DAY_MS);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

describe("lesson receivedAmount", () => {
  let userId: string;
  let authToken: string;
  let studentId: string;

  const createLessonRow = (data: {
    startTime: Date;
    status?: "SCHEDULED" | "CANCELLED" | "COMPLETED";
    isPaid?: boolean;
    paymentDate?: Date | null;
    price?: number | null;
    receivedAmount?: number | null;
  }) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: data.startTime,
        endTime: new Date(data.startTime.getTime() + HOUR_MS),
        status: data.status ?? "SCHEDULED",
        isPaid: data.isPaid ?? false,
        paymentDate: data.paymentDate ?? null,
        price: data.price === undefined ? 2000 : data.price,
        receivedAmount: data.receivedAmount ?? null,
      },
    });

  const findLesson = (id: string) => prisma.lesson.findUniqueOrThrow({ where: { id } });

  const putLesson = (id: string, body: Record<string, unknown>) =>
    request(app).put(`/api/lessons/${id}`).set("Authorization", `Bearer ${authToken}`).send(body);

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `received-${randomUUID()}@test.local`, password: "x", name: "Учитель" },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
    const student = await prisma.student.create({
      data: { name: "Ученик", contactMethod: "WHATSAPP", tutorId: userId },
    });
    studentId = student.id;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("PUT /api/lessons/:id", () => {
    it("should store the price as the received amount when payment is marked without an amount", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

      const res = await putLesson(lesson.id, {
        isPaid: true,
        paymentDate: at(-1, 0).toISOString(),
      }).expect(200);

      expect(res.body.lesson.receivedAmount).toBe(2000);
      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(2000);
    });

    it("should store zero when a lesson without a price is marked paid", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED", price: null });

      const res = await putLesson(lesson.id, { isPaid: true }).expect(200);

      expect(res.body.lesson.receivedAmount).toBe(0);
    });

    it("should clear the received amount when the payment is removed", async () => {
      const lesson = await createLessonRow({
        startTime: at(-2),
        status: "COMPLETED",
        isPaid: true,
        paymentDate: at(-1, 0),
        receivedAmount: 2000,
      });

      const res = await putLesson(lesson.id, { isPaid: false }).expect(200);

      expect(res.body.lesson.receivedAmount).toBeNull();
      expect((await findLesson(lesson.id)).receivedAmount).toBeNull();
    });

    it("should move the received amount of a cancelled paid lesson to the next unpaid lesson", async () => {
      const paymentDate = at(-1, 0);
      const cancelled = await createLessonRow({
        startTime: at(2),
        isPaid: true,
        paymentDate,
        receivedAmount: 1800,
      });
      const recipient = await createLessonRow({ startTime: at(5) });

      await putLesson(cancelled.id, { status: "CANCELLED" }).expect(200);

      const updatedRecipient = await findLesson(recipient.id);
      expect(updatedRecipient.isPaid).toBe(true);
      expect(updatedRecipient.paymentDate?.toISOString()).toBe(paymentDate.toISOString());
      expect(updatedRecipient.receivedAmount?.toNumber()).toBe(1800);

      const updatedCancelled = await findLesson(cancelled.id);
      expect(updatedCancelled.isPaid).toBe(false);
      expect(updatedCancelled.paymentDate).toBeNull();
      expect(updatedCancelled.receivedAmount).toBeNull();
    });

    it("should move the price of a cancelled paid lesson without a stored amount, as the cancel dialog shows", async () => {
      const cancelled = await createLessonRow({
        startTime: at(2),
        isPaid: true,
        paymentDate: at(-1, 0),
        price: 2500,
        receivedAmount: null,
      });
      const recipient = await createLessonRow({ startTime: at(5), price: 2500 });

      await putLesson(cancelled.id, { status: "CANCELLED" }).expect(200);

      expect((await findLesson(recipient.id)).receivedAmount?.toNumber()).toBe(2500);
    });

    it("should keep the payment on a cancelled paid lesson when there is nowhere to move it", async () => {
      const paymentDate = at(-1, 0);
      const cancelled = await createLessonRow({
        startTime: at(2),
        isPaid: true,
        paymentDate,
        receivedAmount: 1800,
      });

      await putLesson(cancelled.id, { status: "CANCELLED" }).expect(200);

      const updated = await findLesson(cancelled.id);
      expect(updated.status).toBe("CANCELLED");
      expect(updated.isPaid).toBe(true);
      expect(updated.paymentDate).toEqual(paymentDate);
      expect(updated.receivedAmount?.toNumber()).toBe(1800);
    });

    it("should keep the payment when the next unpaid lesson has another price", async () => {
      const cancelled = await createLessonRow({
        startTime: at(2),
        isPaid: true,
        paymentDate: at(-1, 0),
        receivedAmount: 2000,
      });
      const pricier = await createLessonRow({ startTime: at(5), price: 2500 });

      await putLesson(cancelled.id, { status: "CANCELLED" }).expect(200);

      expect((await findLesson(cancelled.id)).isPaid).toBe(true);
      expect((await findLesson(pricier.id)).isPaid).toBe(false);
    });
  });

  describe("PUT /api/lessons/:id received amount editing", () => {
    const paidLessonRow = (receivedAmount = 2000) =>
      createLessonRow({
        startTime: at(-2),
        status: "COMPLETED",
        isPaid: true,
        paymentDate: at(-1, 0),
        receivedAmount,
      });

    it("should store the amount sent when marking the lesson paid", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

      const res = await putLesson(lesson.id, {
        isPaid: true,
        paymentDate: at(-1, 0).toISOString(),
        receivedAmount: 1800,
      }).expect(200);

      expect(res.body.lesson.receivedAmount).toBe(1800);
      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(1800);
    });

    it("should keep the received amount when the price of a paid lesson changes", async () => {
      const lesson = await paidLessonRow();

      await putLesson(lesson.id, { price: 2500 }).expect(200);

      const updated = await findLesson(lesson.id);
      expect(updated.price?.toNumber()).toBe(2500);
      expect(updated.receivedAmount?.toNumber()).toBe(2000);
    });

    it("should keep the received amount when the form is saved again without changes", async () => {
      const lesson = await paidLessonRow(1800);
      const paymentDate = lesson.paymentDate!.toISOString();

      await putLesson(lesson.id, { isPaid: true, paymentDate, price: 2000 }).expect(200);
      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(1800);

      await putLesson(lesson.id, {
        isPaid: true,
        paymentDate,
        price: 2000,
        receivedAmount: 1800,
      }).expect(200);
      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(1800);
    });

    it("should keep the received amount when only the payment date changes", async () => {
      const lesson = await paidLessonRow(1800);
      const newPaymentDate = at(-2, 0);

      await putLesson(lesson.id, { paymentDate: newPaymentDate.toISOString() }).expect(200);

      const updated = await findLesson(lesson.id);
      expect(updated.paymentDate?.toISOString()).toBe(newPaymentDate.toISOString());
      expect(updated.receivedAmount?.toNumber()).toBe(1800);
    });

    it("should change only the received amount of a paid lesson", async () => {
      const lesson = await paidLessonRow();

      const res = await putLesson(lesson.id, { receivedAmount: 2500 }).expect(200);

      expect(res.body.lesson.receivedAmount).toBe(2500);
      const updated = await findLesson(lesson.id);
      expect(updated.isPaid).toBe(true);
      expect(updated.paymentDate?.toISOString()).toBe(lesson.paymentDate!.toISOString());
      expect(updated.receivedAmount?.toNumber()).toBe(2500);
    });

    it("should default to the price from the same body when price and payment are saved together", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

      await putLesson(lesson.id, { price: 2500, isPaid: true }).expect(200);

      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(2500);
    });

    it("should use the current price when the payment is removed and marked again", async () => {
      const lesson = await paidLessonRow(1800);

      await putLesson(lesson.id, { isPaid: false }).expect(200);
      await putLesson(lesson.id, { isPaid: true }).expect(200);

      expect((await findLesson(lesson.id)).receivedAmount?.toNumber()).toBe(2000);
    });

    it("should keep the received amount of a prepaid lesson when the series price changes", async () => {
      const seriesStart = at(14);
      const base = await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: seriesStart,
          endTime: new Date(seriesStart.getTime() + HOUR_MS),
          isRecurring: true,
          price: 2000,
        },
      });
      const prepaidStart = new Date(seriesStart.getTime() + 7 * DAY_MS);
      const prepaid = await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: prepaidStart,
          endTime: new Date(prepaidStart.getTime() + HOUR_MS),
          isRecurring: true,
          price: 2000,
          isPaid: true,
          paymentDate: at(-1, 0),
          receivedAmount: 2000,
        },
      });

      await putLesson(base.id, { price: 2500 }).expect(200);

      const updated = await findLesson(prepaid.id);
      expect(updated.price?.toNumber()).toBe(2500);
      expect(updated.receivedAmount?.toNumber()).toBe(2000);
    });

    it("should return 400 with a Russian message for an invalid amount", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

      const res = await putLesson(lesson.id, { isPaid: true, receivedAmount: "1800" }).expect(400);

      expect(res.body.error).toBe(
        "Полученная сумма должна быть неотрицательным числом не больше 99 999 999,99 ₽ с точностью до копеек"
      );
      expect((await findLesson(lesson.id)).isPaid).toBe(false);
    });

    it("should return 400 when an amount is sent for an unpaid lesson", async () => {
      const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

      const res = await putLesson(lesson.id, { receivedAmount: 1800 }).expect(400);

      expect(res.body.error).toBe("Полученную сумму можно указать только у оплаченного урока");
      expect((await findLesson(lesson.id)).receivedAmount).toBeNull();
    });

    it("should return 404 for another tutor's lesson", async () => {
      const otherUser = await prisma.user.create({
        data: { email: `received-other-${randomUUID()}@test.local`, password: "x", name: "Другой" },
      });
      try {
        const foreign = await prisma.lesson.create({
          data: {
            tutorId: otherUser.id,
            subject: "MATHEMATICS",
            lessonType: "SCHOOL",
            prospectName: "Пробный",
            startTime: at(-2),
            endTime: new Date(at(-2).getTime() + HOUR_MS),
            status: "COMPLETED",
            price: 2000,
          },
        });

        await putLesson(foreign.id, { isPaid: true, receivedAmount: 1800 }).expect(404);

        const untouched = await findLesson(foreign.id);
        expect(untouched.isPaid).toBe(false);
        expect(untouched.receivedAmount).toBeNull();
      } finally {
        await prisma.lesson.deleteMany({ where: { tutorId: otherUser.id } });
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });

    it("should not send the received amount to the student over WebSocket", async () => {
      const studentUser = await prisma.studentUser.create({
        data: {
          email: `received-student-${randomUUID()}@test.local`,
          password: "x",
          name: "Ученик",
          isEmailVerified: true,
          studentId,
        },
      });
      const broadcastEvent = jest.fn();
      jest.spyOn(wsManager, "getWebSocketManager").mockReturnValue({
        broadcastStudentLessonEvent: broadcastEvent,
        broadcastLessonStatusUpdate: jest.fn(),
      } as unknown as ReturnType<typeof wsManager.getWebSocketManager>);

      try {
        const lesson = await createLessonRow({ startTime: at(-2), status: "COMPLETED" });

        await putLesson(lesson.id, {
          isPaid: true,
          paymentDate: at(-1, 0).toISOString(),
          receivedAmount: 1800,
        }).expect(200);

        const deadline = Date.now() + 2000;
        while (Date.now() < deadline && broadcastEvent.mock.calls.length < 1) {
          await new Promise((resolve) => setTimeout(resolve, 25));
        }

        expect(broadcastEvent).toHaveBeenCalledTimes(1);
        const event = broadcastEvent.mock.calls[0][1] as { lesson: Record<string, unknown> };
        expect(event.lesson.id).toBe(lesson.id);
        expect(event.lesson).not.toHaveProperty("receivedAmount");
        expect(Object.values(event.lesson)).not.toContain(1800);
      } finally {
        await prisma.studentUser.delete({ where: { id: studentUser.id } });
      }
    });
  });

  describe("GET /api/lessons/:id", () => {
    it("should return receivedAmount as a number", async () => {
      const lesson = await createLessonRow({
        startTime: at(-2),
        status: "COMPLETED",
        isPaid: true,
        paymentDate: at(-1, 0),
        receivedAmount: 1800.5,
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.lesson.receivedAmount).toBe(1800.5);
    });

    it("should return null receivedAmount for an unpaid lesson", async () => {
      const lesson = await createLessonRow({ startTime: at(3) });

      const res = await request(app)
        .get(`/api/lessons/${lesson.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.lesson.receivedAmount).toBeNull();
    });
  });
});
