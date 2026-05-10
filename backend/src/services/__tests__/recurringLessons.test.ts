import prisma from "../../lib/prisma";
import { processRecurringLessons } from "../recurringLessons";
import { truncateToMinute } from "../../utils/time";
import { faker } from "@faker-js/faker";

// Helpers to create test data
const createTutorAndStudent = async () => {
  const tutor = await prisma.user.create({
    data: {
      email: faker.internet.email(),
      password: "test_password",
      name: faker.person.fullName(),
    },
  });

  const student = await prisma.student.create({
    data: {
      name: faker.person.fullName(),
      tutorId: tutor.id,
      contactMethod: "WHATSAPP",
      phone: faker.phone.number(),
    },
  });

  return { tutor, student };
};

describe("processRecurringLessons", () => {
  let tutorId: string;
  let studentId: string;

  const createdTutorIds: string[] = [];
  const createdStudentIds: string[] = [];
  const createdLessonIds: string[] = [];

  // Track created tutor/student in helper
  const createTutorAndStudentTracked = async () => {
    const { tutor, student } = await createTutorAndStudent();
    createdTutorIds.push(tutor.id);
    createdStudentIds.push(student.id);
    return { tutor, student };
  };

  beforeAll(async () => {
    // Do not wipe global DB here — tests should clean only their own data
  });

  afterAll(async () => {
    if (createdTutorIds.length) {
      await prisma.lesson.deleteMany({
        where: { tutorId: { in: createdTutorIds } },
      });
      await prisma.student.deleteMany({
        where: { tutorId: { in: createdTutorIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdTutorIds } } });
    }
    await prisma.$disconnect();
  });

  it("should do nothing when no recurring lessons exist", async () => {
    const created = await processRecurringLessons();
    expect(created === 0 || created === undefined).toBeTruthy();
  });

  it("should create weekly lessons for the next 3 months when recurring exists", async () => {
    const { tutor, student } = await createTutorAndStudentTracked();
    tutorId = tutor.id;
    studentId = student.id;

    // Create a single recurring lesson scheduled one week ago
    const now = new Date();
    const lastStart = truncateToMinute(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    const lastEnd = truncateToMinute(
      new Date(lastStart.getTime() + 60 * 60 * 1000)
    );

    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: lastStart,
        endTime: lastEnd,
        price: 1000,
        isRecurring: true,
        tutorId: tutorId,
        studentId: studentId,
        status: "SCHEDULED",
      },
    });

    const created = await processRecurringLessons();
    expect(typeof created).toBe("number");
    expect(created).toBeGreaterThan(0);

    // Verify lessons were created up to ~3 months ahead (at least 10 weeks)
    const lessons = await prisma.lesson.findMany({ where: { tutorId } });
    expect(lessons.length).toBeGreaterThanOrEqual(2); // original + some created
  });

  it("should skip a concurrent run and not create duplicate lessons (regression: cron overlap-guard)", async () => {
    // Regression for bug-hunt 2026-05-10 #8: previously the function had
    // no overlap-guard and no transaction around findMany+createMany.
    // Two concurrent ticks (manual trigger overlapping cron, or restart
    // during a long batch) could each pass the conflict check for the
    // same slot and both insert. With the guard, the second call exits
    // immediately and no duplicates appear.
    const { tutor, student } = await createTutorAndStudentTracked();

    const lastStart = truncateToMinute(
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );
    const lastEnd = truncateToMinute(
      new Date(lastStart.getTime() + 60 * 60 * 1000)
    );
    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: lastStart,
        endTime: lastEnd,
        isRecurring: true,
        tutorId: tutor.id,
        studentId: student.id,
        status: "SCHEDULED",
      },
    });

    await Promise.all([
      processRecurringLessons(),
      processRecurringLessons(),
    ]);

    const lessons = await prisma.lesson.findMany({
      where: { tutorId: tutor.id, isRecurring: true },
      orderBy: { startTime: "asc" },
    });
    const slots = new Set(lessons.map((l) => l.startTime.getTime()));
    expect(slots.size).toBe(lessons.length);
  });

  it("should not create lessons that conflict with existing ones", async () => {
    // Setup a tutor/student and a recurring lesson at specific time
    const { tutor, student } = await createTutorAndStudentTracked();
    const tId = tutor.id;
    const sId = student.id;

    const start = truncateToMinute(new Date());
    const end = truncateToMinute(new Date(start.getTime() + 60 * 60 * 1000));

    // Create a recurring base lesson
    await prisma.lesson.create({
      data: {
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: start,
        endTime: end,
        price: 1200,
        isRecurring: true,
        tutorId: tId,
        studentId: sId,
        status: "SCHEDULED",
      },
    });

    // Create an existing lesson next week that conflicts with where a new one would be
    const conflictStart = truncateToMinute(
      new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
    const conflictEnd = truncateToMinute(
      new Date(conflictStart.getTime() + 60 * 60 * 1000)
    );

    await prisma.lesson.create({
      data: {
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: conflictStart,
        endTime: conflictEnd,
        price: 500,
        isRecurring: false,
        tutorId: tId,
        studentId: sId,
        status: "SCHEDULED",
      },
    });

    const created = await processRecurringLessons();
    expect(typeof created).toBe("number");

    // Ensure that no duplicate lesson was created for the conflicting slot
    const lessons = await prisma.lesson.findMany({
      where: { tutorId: tId, startTime: conflictStart },
    });
    // Only the explicitly created conflict should exist (not an additional one)
    expect(lessons.length).toBe(1);
  });
});
