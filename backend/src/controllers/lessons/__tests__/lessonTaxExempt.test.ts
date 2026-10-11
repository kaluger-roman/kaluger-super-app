import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import * as wsManager from "../../../lib/wsManager";
import { generateToken } from "../../../utils/auth";

const TAX_EXEMPT_ERROR = "Некорректное значение признака «Не облагается налогом»";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const at = (daysFromNow: number, hourUtc = 10) => {
  const date = new Date(Date.now() + daysFromNow * DAY_MS);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

describe("lesson isTaxExempt", () => {
  let userId: string;
  let authToken: string;
  let studentId: string;

  const createTutor = async () => {
    const user = await prisma.user.create({
      data: { email: `tax-exempt-${randomUUID()}@test.local`, password: "x", name: "Учитель" },
    });
    return { id: user.id, token: generateToken({ userId: user.id, email: user.email }) };
  };

  const createLessonRow = (data: {
    startTime: Date;
    status?: "SCHEDULED" | "CANCELLED" | "COMPLETED";
    isRecurring?: boolean;
    isTaxExempt?: boolean;
    isPaid?: boolean;
    paymentDate?: Date | null;
    price?: number;
    tutorId?: string;
    studentId?: string | null;
    prospectName?: string;
  }) =>
    prisma.lesson.create({
      data: {
        tutorId: data.tutorId ?? userId,
        studentId: data.studentId === undefined ? studentId : data.studentId,
        prospectName: data.prospectName,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: data.startTime,
        endTime: new Date(data.startTime.getTime() + HOUR_MS),
        status: data.status ?? "SCHEDULED",
        isRecurring: data.isRecurring ?? false,
        isTaxExempt: data.isTaxExempt ?? false,
        isPaid: data.isPaid ?? false,
        paymentDate: data.paymentDate ?? null,
        price: data.price ?? 1000,
      },
    });

  const findLesson = (id: string) => prisma.lesson.findUniqueOrThrow({ where: { id } });

  const createBody = (overrides: Record<string, unknown> = {}) => ({
    studentId,
    subject: "MATHEMATICS",
    lessonType: "SCHOOL",
    startTime: at(3).toISOString(),
    endTime: new Date(at(3).getTime() + HOUR_MS).toISOString(),
    price: 1000,
    ...overrides,
  });

  const postLesson = (body: Record<string, unknown>) =>
    request(app).post("/api/lessons").set("Authorization", `Bearer ${authToken}`).send(body);

  const putLesson = (id: string, body: Record<string, unknown>) =>
    request(app).put(`/api/lessons/${id}`).set("Authorization", `Bearer ${authToken}`).send(body);

  beforeEach(async () => {
    const tutor = await createTutor();
    userId = tutor.id;
    authToken = tutor.token;
    const student = await prisma.student.create({
      data: { name: "Ученик", contactMethod: "WHATSAPP", tutorId: userId },
    });
    studentId = student.id;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.studentUser.deleteMany({ where: { student: { tutorId: userId } } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/lessons", () => {
    it("should save isTaxExempt for a single lesson", async () => {
      const res = await postLesson(createBody({ isTaxExempt: true })).expect(201);

      expect(res.body.lesson.isTaxExempt).toBe(true);
      expect((await findLesson(res.body.lesson.id)).isTaxExempt).toBe(true);
    });

    it("should default isTaxExempt to false when the field is omitted", async () => {
      const res = await postLesson(createBody()).expect(201);

      expect(res.body.lesson.isTaxExempt).toBe(false);
      expect((await findLesson(res.body.lesson.id)).isTaxExempt).toBe(false);
    });

    it("should save isTaxExempt for a trial lesson without a student", async () => {
      const res = await postLesson(
        createBody({ studentId: undefined, prospectName: "Пётр", isTaxExempt: true })
      ).expect(201);

      expect(res.body.lesson.studentId).toBeNull();
      expect((await findLesson(res.body.lesson.id)).isTaxExempt).toBe(true);
    });

    it.each([true, false])(
      "should set isTaxExempt = %p on every lesson of a new recurring series",
      async (isTaxExempt) => {
        await postLesson(createBody({ isRecurring: true, isTaxExempt })).expect(201);

        const lessons = await prisma.lesson.findMany({ where: { tutorId: userId } });
        expect(lessons.length).toBeGreaterThan(1);
        expect(lessons.every((lesson) => lesson.isTaxExempt === isTaxExempt)).toBe(true);
      }
    );

    it("should return 400 and create nothing when isTaxExempt is not boolean", async () => {
      const res = await postLesson(createBody({ isRecurring: true, isTaxExempt: "true" })).expect(
        400
      );

      expect(res.body.error).toBe(TAX_EXEMPT_ERROR);
      expect(await prisma.lesson.count({ where: { tutorId: userId } })).toBe(0);
    });
  });

  describe("PUT /api/lessons/:id", () => {
    it("should toggle only isTaxExempt and keep price, status and payment", async () => {
      const paymentDate = new Date(Date.now() - DAY_MS);
      const lesson = await createLessonRow({
        startTime: at(2),
        isPaid: true,
        paymentDate,
        price: 1700,
      });

      const res = await putLesson(lesson.id, { isTaxExempt: true }).expect(200);
      expect(res.body.lesson.isTaxExempt).toBe(true);

      const after = await findLesson(lesson.id);
      expect(after).toMatchObject({ isTaxExempt: true, status: "SCHEDULED", isPaid: true });
      expect(after.price?.toNumber()).toBe(1700);
      expect(after.paymentDate?.getTime()).toBe(paymentDate.getTime());

      await putLesson(lesson.id, { isTaxExempt: false }).expect(200);
      expect((await findLesson(lesson.id)).isTaxExempt).toBe(false);
    });

    it("should return 404 for another tutor's lesson", async () => {
      const other = await createTutor();
      const otherLesson = await createLessonRow({
        startTime: at(2),
        tutorId: other.id,
        studentId: null,
        prospectName: "Чужой",
      });

      try {
        const res = await putLesson(otherLesson.id, { isTaxExempt: true }).expect(404);
        expect(res.body.error).toBe("Урок не найден");
        expect((await findLesson(otherLesson.id)).isTaxExempt).toBe(false);
      } finally {
        await prisma.lesson.deleteMany({ where: { tutorId: other.id } });
        await prisma.user.delete({ where: { id: other.id } });
      }
    });

    it.each([null, "true", 1, {}])(
      "should return 400 when isTaxExempt is %p",
      async (isTaxExempt) => {
        const lesson = await createLessonRow({ startTime: at(2) });

        const res = await putLesson(lesson.id, { isTaxExempt }).expect(400);

        expect(res.body.error).toBe(TAX_EXEMPT_ERROR);
        expect((await findLesson(lesson.id)).isTaxExempt).toBe(false);
      }
    );

    it("should keep a past cancelled lesson cancelled", async () => {
      const lesson = await createLessonRow({ startTime: at(-3), status: "CANCELLED" });

      const res = await putLesson(lesson.id, { isTaxExempt: true }).expect(200);

      expect(res.body.lesson.status).toBe("CANCELLED");
      expect(await findLesson(lesson.id)).toMatchObject({
        isTaxExempt: true,
        status: "CANCELLED",
      });
    });

    it("should change only the edited lesson of a recurring series", async () => {
      await postLesson(createBody({ isRecurring: true, isTaxExempt: true })).expect(201);
      const series = await prisma.lesson.findMany({
        where: { tutorId: userId },
        orderBy: { startTime: "asc" },
      });

      await putLesson(series[1].id, { isTaxExempt: false }).expect(200);

      const after = await prisma.lesson.findMany({ where: { tutorId: userId } });
      for (const lesson of after) {
        expect(lesson.isTaxExempt).toBe(lesson.id !== series[1].id);
      }
    });

    it("should propagate the price but not isTaxExempt across a recurring series", async () => {
      await postLesson(createBody({ isRecurring: true, price: 1000 })).expect(201);
      const series = await prisma.lesson.findMany({
        where: { tutorId: userId },
        orderBy: { startTime: "asc" },
      });

      await putLesson(series[0].id, { price: 1500, isTaxExempt: true }).expect(200);

      const after = await prisma.lesson.findMany({ where: { tutorId: userId } });
      expect(after.every((lesson) => lesson.price?.toNumber() === 1500)).toBe(true);
      for (const lesson of after) {
        expect(lesson.isTaxExempt).toBe(lesson.id === series[0].id);
      }
    });

    it("should keep isTaxExempt when a student is linked to a trial lesson", async () => {
      const lesson = await createLessonRow({
        startTime: at(2),
        studentId: null,
        prospectName: "Пробный",
        isTaxExempt: true,
      });

      await putLesson(lesson.id, { studentId }).expect(200);

      expect(await findLesson(lesson.id)).toMatchObject({ studentId, isTaxExempt: true });
    });

    it("should transfer the payment of a cancelled lesson without moving the flags", async () => {
      const paymentDate = new Date(Date.now() - DAY_MS);
      const paid = await createLessonRow({
        startTime: at(5),
        isPaid: true,
        paymentDate,
        isTaxExempt: true,
      });
      const next = await createLessonRow({ startTime: at(6) });

      await putLesson(paid.id, { status: "CANCELLED" }).expect(200);

      expect(await findLesson(paid.id)).toMatchObject({
        status: "CANCELLED",
        isPaid: false,
        isTaxExempt: true,
      });
      const nextAfter = await findLesson(next.id);
      expect(nextAfter).toMatchObject({ isPaid: true, isTaxExempt: false });
      expect(nextAfter.paymentDate?.getTime()).toBe(paymentDate.getTime());
    });

    it("should not send isTaxExempt to the student over WebSocket", async () => {
      await prisma.studentUser.create({
        data: {
          email: `tax-exempt-student-${randomUUID()}@test.local`,
          password: "x",
          name: "Ученик",
          isEmailVerified: true,
          studentId,
        },
      });
      const lesson = await createLessonRow({ startTime: at(2) });
      const broadcastEvent = jest.fn();
      jest.spyOn(wsManager, "getWebSocketManager").mockReturnValue({
        broadcastStudentLessonEvent: broadcastEvent,
        broadcastLessonStatusUpdate: jest.fn(),
      } as unknown as ReturnType<typeof wsManager.getWebSocketManager>);

      await putLesson(lesson.id, { isTaxExempt: true }).expect(200);

      const deadline = Date.now() + 2000;
      while (Date.now() < deadline && broadcastEvent.mock.calls.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      expect(broadcastEvent).toHaveBeenCalledTimes(1);
      const event = broadcastEvent.mock.calls[0][1];
      expect(event.type).toBe("lesson_updated");
      expect(event.lesson.id).toBe(lesson.id);
      expect(event.lesson).not.toHaveProperty("isTaxExempt");
    });
  });
});
