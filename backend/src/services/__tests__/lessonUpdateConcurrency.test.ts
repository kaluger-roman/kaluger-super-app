import { prisma } from "../../lib/prisma";
import { SchedulingConflictError } from "../../utils";
import { uniqueEmail } from "../../__tests__/helpers";
import { applyLessonUpdate } from "../lessonUpdate";

const HOUR_MS = 60 * 60 * 1000;
const TUTORS = 12;
const ROUNDS = 3;

const startAt = (daysFromNow: number, hourUtc: number) => {
  const date = new Date(Date.now() + daysFromNow * 24 * HOUR_MS);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

describe("applyLessonUpdate under concurrency", () => {
  const tutorIds: string[] = [];

  const createTutorWithLesson = async (startTime: Date) => {
    const tutor = await prisma.user.create({
      data: { email: uniqueEmail(), password: "x", name: "Учитель" },
    });
    tutorIds.push(tutor.id);
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: tutor.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime,
        endTime: new Date(startTime.getTime() + HOUR_MS),
        status: "SCHEDULED",
        price: 2000,
      },
    });
    return { tutorId: tutor.id, lesson };
  };

  const moveLesson = (
    tutorId: string,
    lesson: Awaited<ReturnType<typeof prisma.lesson.create>>,
    start: Date
  ) => {
    const end = new Date(start.getTime() + HOUR_MS);
    return applyLessonUpdate({
      id: lesson.id,
      userId: tutorId,
      existingLesson: lesson,
      updateData: { startTime: start, endTime: end },
      dataToUpdate: { startTime: start, endTime: end },
      start,
      end,
      nextLessonForTransfer: null,
    });
  };

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: { in: tutorIds } } });
    await prisma.user.deleteMany({ where: { id: { in: tutorIds } } });
    await prisma.$disconnect();
  });

  it("should not fail one tutor's update because other tutors update lessons at the same time", async () => {
    const tutors = await Promise.all(
      Array.from({ length: TUTORS }, () => createTutorWithLesson(startAt(3, 10)))
    );

    for (let round = 1; round <= ROUNDS; round += 1) {
      const results = await Promise.allSettled(
        tutors.map(({ tutorId, lesson }) => moveLesson(tutorId, lesson, startAt(3, 10 + round)))
      );

      expect(results.filter((r) => r.status === "rejected")).toEqual([]);
    }
  });

  it("should reject the second of two overlapping concurrent moves for one tutor", async () => {
    const { tutorId, lesson } = await createTutorWithLesson(startAt(5, 8));
    const other = await prisma.lesson.create({
      data: {
        tutorId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: startAt(5, 14),
        endTime: new Date(startAt(5, 14).getTime() + HOUR_MS),
        status: "SCHEDULED",
        price: 2000,
      },
    });
    const sameSlot = startAt(5, 11);

    const results = await Promise.allSettled([
      moveLesson(tutorId, lesson, sameSlot),
      moveLesson(tutorId, other, sameSlot),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(SchedulingConflictError);
  });
});
