import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

// Mock wsManager and recurring helpers to control side effects
import * as wsManager from "../../../lib/wsManager";
import * as recurringHelpers from "../../../services/recurringHelpers";

describe("updateLesson controller", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: faker.internet.email(), password: "x", name: "u" },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });

    const student = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns 404 when lesson not found or not owned", async () => {
    await request(app)
      .put(`/api/lessons/not-found-id`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ description: "x" })
      .expect(404)
      .then((res) => expect(res.body.error).toBeDefined());
  });

  it("validates start < end and returns 400", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // send end before start
    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: new Date(Date.now() + 7200000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(400)
      .then((res) => expect(res.body.error).toMatch(/Время окончания/));
  });

  it("returns 409 on scheduling conflict", async () => {
    // create an existing lesson to conflict with
    const base = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 10000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    const toUpdate = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 86400000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // attempt to move to conflicting slot
    await request(app)
      .put(`/api/lessons/${toUpdate.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: base.startTime.toISOString(),
        endTime: base.endTime.toISOString(),
      })
      .expect(409)
      .then((res) => expect(res.body.error).toMatch(/конфликт/));
  });

  it("does not persist changes to the lesson when scheduling conflict is detected (regression: TOCTOU now checked inside transaction)", async () => {
    // Regression for bug-hunt 2026-05-10 #6: previously the conflict
    // check happened before $transaction, so a concurrent insert could
    // slip through. Now the check runs inside the transaction; on
    // conflict the whole transaction aborts and no field changes
    // (description / status / price) reach the row.
    const conflictStart = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const conflictEnd = new Date(conflictStart.getTime() + 3600000);
    const conflicting = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: conflictStart,
        endTime: conflictEnd,
        isRecurring: false,
        status: "SCHEDULED",
        price: 500,
      },
    });

    const toUpdateStart = new Date(Date.now() + 4 * 24 * 3600 * 1000);
    const toUpdateEnd = new Date(toUpdateStart.getTime() + 3600000);
    const toUpdate = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: toUpdateStart,
        endTime: toUpdateEnd,
        isRecurring: false,
        status: "SCHEDULED",
        description: "original",
        price: 1000,
      },
    });

    await request(app)
      .put(`/api/lessons/${toUpdate.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: conflictStart.toISOString(),
        endTime: conflictEnd.toISOString(),
        description: "should-not-stick",
        price: 9999,
      })
      .expect(409);

    const after = await prisma.lesson.findUnique({
      where: { id: toUpdate.id },
    });
    expect(after!.description).toBe("original");
    expect(after!.price?.toNumber()).toBe(1000);
    expect(after!.startTime.getTime()).toBe(toUpdateStart.getTime());
    expect(after!.endTime.getTime()).toBe(toUpdateEnd.getTime());

    await prisma.lesson.delete({ where: { id: conflicting.id } });
    await prisma.lesson.delete({ where: { id: toUpdate.id } });
  });

  it("computes status COMPLETED or IN_PROGRESS based on times", async () => {
    const now = new Date();
    const pastStart = new Date(now.getTime() - 2 * 3600000);
    const pastEnd = new Date(now.getTime() - 3600000);
    const inProgressStart = new Date(now.getTime() - 30 * 60 * 1000);
    const inProgressEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const l1 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: pastStart,
        endTime: pastEnd,
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // update without status -> should become COMPLETED
    await request(app)
      .put(`/api/lessons/${l1.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ description: "done" })
      .expect(200)
      .then((res) => {
        expect(res.body.lesson.status).toBe("COMPLETED");
      });

    const l2 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: inProgressStart,
        endTime: inProgressEnd,
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .put(`/api/lessons/${l2.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ notes: "now" })
      .expect(200)
      .then((res) => {
        expect(res.body.lesson.status).toBe("IN_PROGRESS");
      });
  });

  it("returns 409 BEFORE updating the base lesson when recurring shift would conflict (regression: partial-state on shift conflict)", async () => {
    // Regression for bug-hunt 2026-05-09-3 #3: previously the base lesson
    // committed first and shift conflicts threw → 500 with the base already
    // updated. The fix pre-checks conflicts and returns 409 without DB writes.
    const previewSpy = jest.spyOn(
      recurringHelpers,
      "previewShiftFutureRecurringLessons"
    );
    (previewSpy as jest.Mock).mockImplementation(async () => ({
      planned: [],
      conflicts: [{ lessonId: "x", conflictingLessonId: "y" }],
    }));

    const baseStart = new Date(Date.now() + 24 * 3600 * 1000);
    const baseEnd = new Date(Date.now() + 24 * 3600 * 1000 + 3600000);
    const base = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: baseStart,
        endTime: baseEnd,
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    const newStart = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const newEnd = new Date(Date.now() + 2 * 24 * 3600 * 1000 + 3600000);

    await request(app)
      .put(`/api/lessons/${base.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() })
      .expect(409)
      .then((res) => expect(res.body.error).toMatch(/конфликт/));

    // Critical: base lesson must not have been updated despite the conflict
    const after = await prisma.lesson.findUnique({ where: { id: base.id } });
    expect(after!.startTime.getTime()).toBe(baseStart.getTime());
    expect(after!.endTime.getTime()).toBe(baseEnd.getTime());

    previewSpy.mockRestore();
  });

  it("updates price for future recurring lessons and broadcasts websocket on status change", async () => {
    const updatePriceSpy = jest.spyOn(
      recurringHelpers,
      "updatePriceForFutureRecurringLessons"
    );
    (updatePriceSpy as jest.Mock).mockResolvedValue({ updated: 1 });

    // mock ws manager
    const broadcast = jest.fn();
    const wsSpy = jest
      .spyOn(wsManager, "getWebSocketManager")
      .mockReturnValue({ broadcastLessonStatusUpdate: broadcast } as any);

    const base = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 24 * 3600 * 1000 + 3600000),
        isRecurring: true,
        status: "SCHEDULED",
        price: 1000,
      },
    });

    // change price (no RESCHEDULED) so price-updater runs
    await request(app)
      .put(`/api/lessons/${base.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ price: 2000 })
      .expect(200)
      .then((res) => {
        expect(res.body.lesson.price).toBe(2000);
      });

    expect(updatePriceSpy).toHaveBeenCalled();

    // change status to CANCELLED -> broadcast should be called
    await request(app)
      .put(`/api/lessons/${base.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "CANCELLED" })
      .expect(200);

    expect(broadcast).toHaveBeenCalled();

    updatePriceSpy.mockRestore();
    wsSpy.mockRestore();
  });

  it("rejects changing times for a CANCELLED lesson", async () => {
    const cancelled = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "CANCELLED",
      },
    });

    await request(app)
      .put(`/api/lessons/${cancelled.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      })
      .expect(400)
      .then((res) =>
        expect(res.body.error).toMatch(/Невозможно перенести отменённый урок/)
      );
  });

  it("keeps status CANCELLED when updating non-time fields without status", async () => {
    const cancelled = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "CANCELLED",
      },
    });

    await request(app)
      .put(`/api/lessons/${cancelled.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ notes: "update notes" })
      .expect(200)
      .then((res) => {
        expect(res.body.lesson.status).toBe("CANCELLED");
      });
  });

  it("does not call shift or price updater when status is RESCHEDULED", async () => {
    const shiftSpy = jest
      .spyOn(recurringHelpers, "previewShiftFutureRecurringLessons")
      .mockResolvedValue({ planned: [], conflicts: [] });
    const priceSpy = jest
      .spyOn(recurringHelpers, "updatePriceForFutureRecurringLessons")
      .mockResolvedValue({ updated: 0 });

    const r = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 8 * 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 8 * 24 * 3600 * 1000 + 3600000),
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .put(`/api/lessons/${r.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString(),
        endTime: new Date(
          Date.now() + 9 * 24 * 3600 * 1000 + 3600000
        ).toISOString(),
        status: "RESCHEDULED",
        price: 500,
      })
      .expect(200);

    expect(shiftSpy).not.toHaveBeenCalled();
    expect(priceSpy).not.toHaveBeenCalled();

    shiftSpy.mockRestore();
    priceSpy.mockRestore();
  });

  it("does not call price updater when existing lesson is not SCHEDULED", async () => {
    const priceSpy = jest
      .spyOn(recurringHelpers, "updatePriceForFutureRecurringLessons")
      .mockResolvedValue({ updated: 0 });

    const r = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 11 * 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 11 * 24 * 3600 * 1000 + 3600000),
        isRecurring: true,
        status: "COMPLETED",
        price: 1000,
      },
    });

    await request(app)
      .put(`/api/lessons/${r.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ price: 1500 })
      .expect(200);

    expect(priceSpy).not.toHaveBeenCalled();
    priceSpy.mockRestore();
  });

  it("calls previewShiftFutureRecurringLessons on successful shift and proceeds", async () => {
    const previewSpy = jest.spyOn(
      recurringHelpers,
      "previewShiftFutureRecurringLessons"
    );
    (previewSpy as jest.Mock).mockResolvedValue({ planned: [], conflicts: [] });

    const r = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 3600000),
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .put(`/api/lessons/${r.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        startTime: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
        endTime: new Date(
          Date.now() + 6 * 24 * 3600 * 1000 + 3600000
        ).toISOString(),
      })
      .expect(200)
      .then((res) => {
        expect(res.body.message).toMatch(/Урок успешно обновлен/);
      });

    expect(previewSpy).toHaveBeenCalled();
    previewSpy.mockRestore();
  });

  it("returns 400 when only startTime is provided and becomes >= existing endTime", async () => {
    const l = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 2 * 3600000),
        endTime: new Date(Date.now() + 3 * 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // set startTime after existing endTime
    await request(app)
      .put(`/api/lessons/${l.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ startTime: new Date(Date.now() + 4 * 3600000).toISOString() })
      .expect(400)
      .then((res) => expect(res.body.error).toMatch(/Время окончания/));
  });

  it("returns 400 when only endTime is provided and becomes <= existing startTime", async () => {
    const l = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(Date.now() + 5 * 3600000),
        endTime: new Date(Date.now() + 6 * 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // set endTime before existing startTime
    await request(app)
      .put(`/api/lessons/${l.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ endTime: new Date(Date.now() + 4 * 3600000).toISOString() })
      .expect(400)
      .then((res) => expect(res.body.error).toMatch(/Время окончания/));
  });

  it("transfers payment to next unpaid lesson via $transaction when cancelling paid lesson (regression: atomic payment transfer)", async () => {
    const paymentDate = new Date(Date.now() - 5 * 3600 * 1000);
    const paid = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 30 * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
        price: 1500,
        isPaid: true,
        paymentDate,
      },
    });
    const next = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 31 * 24 * 3600 * 1000),
        endTime: new Date(Date.now() + 31 * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
        price: 1500,
        isPaid: false,
      },
    });

    const txSpy = jest.spyOn(prisma, "$transaction");

    await request(app)
      .put(`/api/lessons/${paid.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "CANCELLED" })
      .expect(200);

    // Both updates must run inside the same $transaction call — atomicity guarantee
    expect(txSpy).toHaveBeenCalled();

    const paidAfter = await prisma.lesson.findUnique({ where: { id: paid.id } });
    const nextAfter = await prisma.lesson.findUnique({ where: { id: next.id } });

    expect(paidAfter?.status).toBe("CANCELLED");
    expect(paidAfter?.isPaid).toBe(false);
    // Regression for bug-hunt 2026-05-09-3 #2: paymentDate must be cleared
    // (Prisma treats `undefined` as no-op, so a plain `delete` left it stale).
    expect(paidAfter?.paymentDate).toBeNull();
    expect(nextAfter?.isPaid).toBe(true);
    expect(nextAfter?.paymentDate?.getTime()).toBe(paymentDate.getTime());

    txSpy.mockRestore();
  });
});
