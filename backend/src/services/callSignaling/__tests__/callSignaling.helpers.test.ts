import { faker } from "@faker-js/faker";

import prisma from "../../../lib/prisma";
import { CallAuthorizationError } from "../../../utils";
import {
  resolvePairForStudent,
  resolvePairForTutor,
} from "../callSignaling.helpers";

describe("callSignaling pair resolution", () => {
  let tutorId: string;
  let otherTutorId: string;
  let studentId: string;
  let studentUserId: string;
  let unlinkedStudentUserId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Анна Петрова",
      },
    });
    tutorId = tutor.id;

    const otherTutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
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
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Иван Смирнов",
        studentId,
      },
    });
    studentUserId = studentUser.id;

    const unlinked = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
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
    await prisma.$disconnect();
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
    await expect(
      resolvePairForTutor(tutorId, "non-existent-id")
    ).rejects.toThrow(CallAuthorizationError);
  });

  it("should reject a student with no linked Student record", async () => {
    await expect(
      resolvePairForStudent(unlinkedStudentUserId)
    ).rejects.toThrow(CallAuthorizationError);
  });
});
