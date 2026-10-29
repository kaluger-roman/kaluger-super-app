import { uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import { createCallRecord } from "../createCallRecord";

describe("createCallRecord", () => {
  let tutorId: string;
  let studentId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Tutor",
      },
    });
    tutorId = tutor.id;
    const student = await prisma.student.create({
      data: { name: "Student", tutorId },
    });
    studentId = student.id;
  });

  afterEach(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.lesson.deleteMany({ where: { tutorId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
  });

  const createLesson = () =>
    prisma.lesson.create({
      data: {
        tutorId,
        studentId,
        startTime: new Date("2026-06-04T10:00:00.000Z"),
        endTime: new Date("2026-06-04T11:00:00.000Z"),
      },
    });

  it("should set endedAt and durationSeconds for a COMPLETED call", async () => {
    const startedAt = new Date("2026-06-04T10:00:00.000Z");
    const connectedAt = new Date("2026-06-04T10:00:05.000Z");
    const endedAt = new Date("2026-06-04T10:05:05.000Z");
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    jest.setSystemTime(endedAt);
    try {
      await createCallRecord({
        tutorId,
        studentId,
        callerKind: "tutor",
        status: "COMPLETED",
        startedAt,
        connectedAt,
        lessonId: null,
      });
    } finally {
      jest.useRealTimers();
    }

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.status).toBe("COMPLETED");
    expect(record.callerKind).toBe("TUTOR");
    expect(record.durationSeconds).toBe(300);
    expect(record.endedAt?.toISOString()).toBe(endedAt.toISOString());
  });

  it("should count the duration up to the given endedAt, not up to now", async () => {
    const connectedAt = new Date(Date.now() - 10 * 60 * 1000);
    const endedAt = new Date(connectedAt.getTime() + 4 * 60 * 1000);

    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "COMPLETED",
      startedAt: connectedAt,
      connectedAt,
      endedAt,
      lessonId: null,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.durationSeconds).toBe(240);
    expect(record.endedAt?.toISOString()).toBe(endedAt.toISOString());
  });

  it("should leave endedAt and durationSeconds null for a MISSED call", async () => {
    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "MISSED",
      startedAt: new Date(),
      lessonId: null,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.status).toBe("MISSED");
    expect(record.endedAt).toBeNull();
    expect(record.durationSeconds).toBeNull();
  });

  it("should store callerKind STUDENT for student-initiated calls", async () => {
    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "student",
      status: "REJECTED",
      startedAt: new Date(),
      lessonId: null,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.callerKind).toBe("STUDENT");
    expect(record.durationSeconds).toBeNull();
  });

  it("should reject when the record cannot be written", async () => {
    await expect(
      createCallRecord({
        tutorId: "missing-tutor",
        studentId,
        callerKind: "tutor",
        status: "MISSED",
        startedAt: new Date(),
        lessonId: null,
      })
    ).rejects.toThrow();
  });

  it("should link the record to the lesson", async () => {
    const lesson = await createLesson();

    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "CANCELED",
      startedAt: new Date(),
      lessonId: lesson.id,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.lessonId).toBe(lesson.id);
  });

  it("should store a record without a lesson as null", async () => {
    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "MISSED",
      startedAt: new Date(),
      lessonId: null,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.lessonId).toBeNull();
  });

  it("should save the record without the lesson when the lesson was deleted before the write", async () => {
    const lesson = await createLesson();
    await prisma.lesson.delete({ where: { id: lesson.id } });

    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "student",
      status: "COMPLETED",
      startedAt: new Date(),
      connectedAt: new Date(),
      lessonId: lesson.id,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record).toMatchObject({ status: "COMPLETED", lessonId: null });
  });

  it("should keep the record without the lesson when the lesson is deleted later", async () => {
    const lesson = await createLesson();
    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "REJECTED",
      startedAt: new Date(),
      lessonId: lesson.id,
    });

    await prisma.lesson.delete({ where: { id: lesson.id } });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record).toMatchObject({ status: "REJECTED", lessonId: null });
  });

  it("should save the record without the lesson when the lesson got another student during the call", async () => {
    const lesson = await createLesson();
    const otherStudent = await prisma.student.create({ data: { name: "Other", tutorId } });
    await prisma.lesson.update({ where: { id: lesson.id }, data: { studentId: otherStudent.id } });

    await createCallRecord({
      tutorId,
      studentId,
      callerKind: "student",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 60_000),
      connectedAt: new Date(Date.now() - 50_000),
      lessonId: lesson.id,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId, studentId } });
    expect(record.lessonId).toBeNull();
    await prisma.lesson.delete({ where: { id: lesson.id } });
    await prisma.student.delete({ where: { id: otherStudent.id } });
  });

  // Resolves once a query matching the pattern waits for a row locked by the open transaction.
  const waitForLockWait = async (queryPattern: string): Promise<void> => {
    const deadline = Date.now() + 5000;
    for (;;) {
      const [{ waiting }] = await prisma.$queryRaw<{ waiting: number }[]>`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND query LIKE ${queryPattern}`;
      if (waiting > 0) return;
      if (Date.now() > deadline) throw new Error(`No query ${queryPattern} waits for a lock`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  const waitForLessonLockWait = () => waitForLockWait("%FROM lessons%FOR SHARE%");

  it("should not link the lesson when it is given to another student while the record is written", async () => {
    const lesson = await createLesson();
    const otherStudent = await prisma.student.create({ data: { name: "Other", tutorId } });
    let recording: Promise<void> = Promise.resolve();

    await prisma.$transaction(async (tx) => {
      await tx.lesson.update({ where: { id: lesson.id }, data: { studentId: otherStudent.id } });
      recording = createCallRecord({
        tutorId,
        studentId,
        callerKind: "tutor",
        status: "MISSED",
        startedAt: new Date(),
        lessonId: lesson.id,
      });
      await waitForLessonLockWait();
    });
    await recording;

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId, studentId } });
    expect(record.lessonId).toBeNull();
    await prisma.lesson.delete({ where: { id: lesson.id } });
    await prisma.student.delete({ where: { id: otherStudent.id } });
  });

  it("should save the record without the lesson when the lesson is deleted while the record is written", async () => {
    const lesson = await createLesson();
    let recording: Promise<void> = Promise.resolve();

    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lesson.id } });
      recording = createCallRecord({
        tutorId,
        studentId,
        callerKind: "student",
        status: "COMPLETED",
        startedAt: new Date(),
        connectedAt: new Date(),
        lessonId: lesson.id,
      });
      await waitForLessonLockWait();
    });
    await recording;

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId, studentId } });
    expect(record).toMatchObject({ status: "COMPLETED", lessonId: null });
  });

  it("should lock the student before the lesson, in the order of a student deletion", async () => {
    const student = await prisma.student.create({ data: { name: "Leaving", tutorId } });
    const lesson = await prisma.lesson.create({
      data: {
        tutorId,
        studentId: student.id,
        startTime: new Date("2026-06-05T10:00:00.000Z"),
        endTime: new Date("2026-06-05T11:00:00.000Z"),
      },
    });
    let recording: Promise<unknown> = Promise.resolve();

    // A deletion locks the student row first and then cascades to the lessons; holding the lesson
    // while waiting for the student would deadlock with it.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM students WHERE id = ${student.id} FOR UPDATE`;
      recording = createCallRecord({
        tutorId,
        studentId: student.id,
        callerKind: "tutor",
        status: "MISSED",
        startedAt: new Date(),
        lessonId: lesson.id,
      }).catch((error: unknown) => error);
      await waitForLockWait("%FROM students%FOR KEY SHARE%");
      await tx.student.delete({ where: { id: student.id } });
    });

    expect(await recording).toMatchObject({ code: "P2003" });
    expect(await prisma.lesson.count({ where: { id: lesson.id } })).toBe(0);
  });
});
