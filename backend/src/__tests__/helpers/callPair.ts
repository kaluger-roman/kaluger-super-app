import { prisma } from "../../lib/prisma";
import { uniqueEmail } from "./uniqueEmail";

export type CallPair = {
  tutorId: string;
  studentId: string;
  studentUserId: string;
};

// A tutor and a student with a cabinet: the two sides of a call. Removing the pair also removes
// its call history.
export const createCallPair = async (): Promise<CallPair> => {
  const tutor = await prisma.user.create({
    data: { email: uniqueEmail(), password: "hash", name: "Анна Петрова" },
  });
  const student = await prisma.student.create({ data: { name: "Иван", tutorId: tutor.id } });
  const studentUser = await prisma.studentUser.create({
    data: { email: uniqueEmail(), password: "hash", name: "Иван", studentId: student.id },
  });
  return { tutorId: tutor.id, studentId: student.id, studentUserId: studentUser.id };
};

export const deleteCallPair = async ({
  tutorId,
  studentId,
  studentUserId,
}: CallPair): Promise<void> => {
  await prisma.callRecord.deleteMany({ where: { tutorId } });
  await prisma.studentUser.delete({ where: { id: studentUserId } });
  await prisma.student.delete({ where: { id: studentId } });
  await prisma.user.delete({ where: { id: tutorId } });
};
