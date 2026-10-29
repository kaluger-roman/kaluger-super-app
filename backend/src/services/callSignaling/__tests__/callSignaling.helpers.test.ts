import { uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import { CallAuthorizationError } from "../../../utils";
import {
  resolveCallLesson,
  resolvePairForStudent,
  resolvePairForTutor,
} from "../callSignaling.helpers";
import type { ResolvedPair } from "../callSignaling.types";

const HOUR_MS = 60 * 60 * 1000;

describe("callSignaling pair resolution", () => {
  let tutorId: string;
  let otherTutorId: string;
  let studentId: string;
  let studentUserId: string;
  let unlinkedStudentUserId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Анна Петрова",
      },
    });
    tutorId = tutor.id;

    const otherTutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Другой Репетитор",
      },
    });
    otherTutorId = otherTutor.id;

    const student = await prisma.student.create({
      data: { name: "Иван Смирнов", tutorId },
    });
    studentId = student.id;

    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Иван Смирнов",
        studentId,
      },
    });
    studentUserId = studentUser.id;

    const unlinked = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Не привязан",
      },
    });
    unlinkedStudentUserId = unlinked.id;
  });

  afterAll(async () => {
    await prisma.studentUser.deleteMany({
      where: { id: { in: [studentUserId, unlinkedStudentUserId] } },
    });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({
      where: { id: { in: [tutorId, otherTutorId] } },
    });
  });

  it("should resolve the pair for a tutor calling their linked student", async () => {
    const pair = await resolvePairForTutor(tutorId, studentId);
    expect(pair).toMatchObject({
      tutorUserId: tutorId,
      studentUserId,
      studentId,
      studentName: "Иван Смирнов",
      tutorName: "Анна Петрова",
    });
  });

  it("should resolve the pair for a student calling their tutor", async () => {
    const pair = await resolvePairForStudent(studentUserId);
    expect(pair).toMatchObject({
      tutorUserId: tutorId,
      studentUserId,
      studentId,
    });
  });

  it("should reject a cross-pair tutor call (student belongs to another tutor)", async () => {
    await expect(resolvePairForTutor(otherTutorId, studentId)).rejects.toThrow(
      CallAuthorizationError
    );
  });

  it("should reject a tutor calling a non-existent student", async () => {
    await expect(resolvePairForTutor(tutorId, "non-existent-id")).rejects.toThrow(
      CallAuthorizationError
    );
  });

  it("should resolve the pair for an archived student on both sides", async () => {
    await prisma.student.update({ where: { id: studentId }, data: { archived: true } });
    try {
      await expect(resolvePairForTutor(tutorId, studentId)).resolves.toMatchObject({
        studentUserId,
        studentId,
      });
      await expect(resolvePairForStudent(studentUserId)).resolves.toMatchObject({
        tutorUserId: tutorId,
        studentId,
      });
    } finally {
      await prisma.student.update({ where: { id: studentId }, data: { archived: false } });
    }
  });

  it("should reject a student with no linked Student record", async () => {
    await expect(resolvePairForStudent(unlinkedStudentUserId)).rejects.toThrow(
      CallAuthorizationError
    );
  });
});

describe("resolveCallLesson", () => {
  let tutorId: string;
  let otherTutorId: string;
  let studentId: string;
  let otherStudentId: string;
  let pair: ResolvedPair;

  const createLesson = (data: { tutorId: string; studentId: string; offsetMs?: number }) => {
    const start = new Date(Date.now() + (data.offsetMs ?? HOUR_MS));
    return prisma.lesson.create({
      data: {
        tutorId: data.tutorId,
        studentId: data.studentId,
        subject: "PHYSICS",
        startTime: start,
        endTime: new Date(start.getTime() + HOUR_MS),
      },
    });
  };

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "Анна" },
    });
    tutorId = tutor.id;
    const otherTutor = await prisma.user.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "Борис" },
    });
    otherTutorId = otherTutor.id;
    const student = await prisma.student.create({ data: { name: "Иван", tutorId } });
    studentId = student.id;
    const otherStudent = await prisma.student.create({ data: { name: "Олег", tutorId } });
    otherStudentId = otherStudent.id;
    pair = {
      tutorUserId: tutorId,
      studentUserId: "student-user",
      studentId,
      studentName: "Иван",
      tutorName: "Анна",
    };
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: { in: [tutorId, otherTutorId] } } });
    await prisma.student.deleteMany({ where: { tutorId: { in: [tutorId, otherTutorId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [tutorId, otherTutorId] } } });
  });

  it("should return the lesson of the pair", async () => {
    const lesson = await createLesson({ tutorId, studentId });

    await expect(resolveCallLesson(pair, lesson.id)).resolves.toEqual({
      id: lesson.id,
      subject: "PHYSICS",
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    });
  });

  it("should accept a canceled and a past lesson of the pair", async () => {
    const canceled = await createLesson({ tutorId, studentId });
    await prisma.lesson.update({ where: { id: canceled.id }, data: { status: "CANCELLED" } });
    const past = await createLesson({ tutorId, studentId, offsetMs: -30 * 24 * HOUR_MS });

    await expect(resolveCallLesson(pair, canceled.id)).resolves.toMatchObject({
      id: canceled.id,
    });
    await expect(resolveCallLesson(pair, past.id)).resolves.toMatchObject({ id: past.id });
  });

  it("should reject a lesson of another student of the same tutor", async () => {
    const lesson = await createLesson({ tutorId, studentId: otherStudentId });

    await expect(resolveCallLesson(pair, lesson.id)).rejects.toThrow("Урок не найден");
  });

  it("should reject a lesson of another tutor", async () => {
    const foreignStudent = await prisma.student.create({
      data: { name: "Чужой", tutorId: otherTutorId },
    });
    const lesson = await createLesson({ tutorId: otherTutorId, studentId: foreignStudent.id });

    await expect(
      resolveCallLesson({ ...pair, studentId: foreignStudent.id }, lesson.id)
    ).rejects.toThrow("Урок не найден");
  });

  it("should reject an unknown lesson id", async () => {
    await expect(resolveCallLesson(pair, "missing-lesson")).rejects.toThrow(CallAuthorizationError);
  });
});
