import prisma from "../../lib/prisma";
import {
  getRecurringLessonKey,
  groupRecurringLessonsByPattern,
  shiftFutureRecurringLessons,
  updatePriceForFutureRecurringLessons,
} from "../recurringHelpers";
import { truncateToMinute } from "../../utils/time";
import { faker } from "@faker-js/faker";

describe("recurringHelpers", () => {
  let userId: string;
  let studentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: faker.internet.email(), password: "x", name: "t" },
    });
    userId = user.id;

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
  });

  it("generates stable recurring key and groups lessons keeping latest", () => {
    const now = new Date();
    const a = {
      id: "a",
      tutorId: userId,
      studentId,
      startTime: new Date(now.getTime() + 1000).toISOString(),
    } as any;
    const b = {
      id: "b",
      tutorId: userId,
      studentId,
      startTime: new Date(now.getTime() + 2000).toISOString(),
    } as any;

    const keyA = getRecurringLessonKey(a);
    const keyB = getRecurringLessonKey(b);
    expect(keyA).toBeDefined();
    expect(keyA).toEqual(keyB);

    const groups = groupRecurringLessonsByPattern([a, b]);
    expect(groups.size).toBe(1);
    const latest = groups.get(keyA)!;
    expect(latest.id).toBe("b");
  });

  it("shifts future recurring lessons successfully when no conflicts", async () => {
    // create base recurring lesson and two future instances with same weekday/time
    const baseStart = truncateToMinute(
      new Date(Date.now() + 2 * 24 * 3600 * 1000)
    );
    const baseEnd = new Date(baseStart.getTime() + 3600000);

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

    const future1 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
        endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    const future2 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(baseStart.getTime() + 14 * 24 * 3600 * 1000),
        endTime: new Date(baseEnd.getTime() + 14 * 24 * 3600 * 1000),
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    // shift base by +1 hour
    const newStart = new Date(baseStart.getTime() + 3600000);
    const newEnd = new Date(baseEnd.getTime() + 3600000);

    // compute how many future lessons match the recurring key (this may vary)
    const futureLessonsBefore = await prisma.lesson.findMany({
      where: {
        tutorId: userId,
        studentId,
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    const key = getRecurringLessonKey(base as any);
    const expectedToShift = futureLessonsBefore.filter(
      (l) => getRecurringLessonKey(l as any) === key
    ).length;

    const res = await shiftFutureRecurringLessons(base, newStart, newEnd);
    expect(res.shifted).toBe(expectedToShift);

    // verify DB entries moved
    const f1 = await prisma.lesson.findUnique({ where: { id: future1.id } });
    const f2 = await prisma.lesson.findUnique({ where: { id: future2.id } });

    expect(truncateToMinute(new Date(f1!.startTime)).getHours()).toBe(
      truncateToMinute(newStart).getHours()
    );
    expect(truncateToMinute(new Date(f2!.startTime)).getHours()).toBe(
      truncateToMinute(newStart).getHours()
    );
  });

  it("detects conflicts and aborts shifts", async () => {
    // create base recurring lesson and a future instance
    const baseStart = truncateToMinute(
      new Date(Date.now() + 3 * 24 * 3600 * 1000)
    );
    const baseEnd = new Date(baseStart.getTime() + 3600000);

    const base = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: baseStart,
        endTime: baseEnd,
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    const future = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
        endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
        isRecurring: true,
        status: "SCHEDULED",
      },
    });

    // create a conflicting lesson at the time where future would be shifted to
    const conflictStart = new Date(future.startTime.getTime() + 3600000); // shift +1h later
    const conflictEnd = new Date(conflictStart.getTime() + 3600000);

    const otherStudent = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });

    const other = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: otherStudent.id,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: conflictStart,
        endTime: conflictEnd,
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    // attempt to shift base by +1 hour which would cause conflict with `other`
    const newStart = new Date(baseStart.getTime() + 3600000);
    const newEnd = new Date(baseEnd.getTime() + 3600000);

    const res = await shiftFutureRecurringLessons(base, newStart, newEnd);
    expect(res.shifted).toBe(0);
    expect(res.conflicts).toBeDefined();
    expect(res.conflicts!.length).toBeGreaterThan(0);

    // cleanup the 'other' record
    await prisma.lesson.deleteMany({ where: { id: other.id } });
  });

  it("updates price for future recurring lessons", async () => {
    const baseStart = truncateToMinute(
      new Date(Date.now() + 6 * 24 * 3600 * 1000)
    );
    const baseEnd = new Date(baseStart.getTime() + 3600000);

    const base = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: baseStart,
        endTime: baseEnd,
        isRecurring: true,
        status: "SCHEDULED",
        price: 100,
      },
    });

    const future = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(baseStart.getTime() + 7 * 24 * 3600 * 1000),
        endTime: new Date(baseEnd.getTime() + 7 * 24 * 3600 * 1000),
        isRecurring: true,
        status: "SCHEDULED",
        price: 100,
      },
    });

    const r = await updatePriceForFutureRecurringLessons(base, 250);
    expect(r.updated).toBeGreaterThanOrEqual(1);

    const u = await prisma.lesson.findUnique({ where: { id: future.id } });
    expect(u!.price?.toNumber()).toBe(250);
  });
});
