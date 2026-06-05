import prisma from "../../lib/prisma";
import { CallAuthorizationError } from "../../utils";
import type { ResolvedPair } from "./callSignaling.types";

export const resolvePairForTutor = async (
  tutorUserId: string,
  targetStudentId: string
): Promise<ResolvedPair> => {
  const student = await prisma.student.findUnique({
    where: { id: targetStudentId },
    select: {
      id: true,
      name: true,
      tutorId: true,
      tutor: { select: { name: true } },
      studentUser: { select: { id: true } },
    },
  });

  if (!student || student.tutorId !== tutorUserId) {
    throw new CallAuthorizationError();
  }
  if (!student.studentUser) {
    throw new CallAuthorizationError("У ученика нет кабинета для звонков");
  }

  return {
    tutorUserId,
    studentUserId: student.studentUser.id,
    studentId: student.id,
    studentName: student.name,
    tutorName: student.tutor.name,
  };
};

export const resolvePairForStudent = async (
  studentUserId: string
): Promise<ResolvedPair> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          tutorId: true,
          tutor: { select: { name: true } },
        },
      },
    },
  });

  if (!studentUser?.student) {
    throw new CallAuthorizationError();
  }

  return {
    tutorUserId: studentUser.student.tutorId,
    studentUserId: studentUser.id,
    studentId: studentUser.student.id,
    studentName: studentUser.student.name,
    tutorName: studentUser.student.tutor.name,
  };
};
