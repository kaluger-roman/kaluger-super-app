import { prisma } from "../../lib/prisma";
import { hashPassword, truncateToMinute } from "../../utils";
import { DAY_MS, HOUR_MS, MINUTE_MS, SEED_STUDENT_USER, SEED_TUTOR } from "./devSeed.constants";
import type { DevSeedResult } from "./devSeed.types";

// Recreates a fixed demo set (tutor, students, a student cabinet, lessons around "now")
// for an empty dev/QA database. Only rows owned by the seed emails are replaced.
export const seedDevData = async (): Promise<DevSeedResult> => {
  const [tutorHash, studentUserHash] = await Promise.all([
    hashPassword(SEED_TUTOR.password),
    hashPassword(SEED_STUDENT_USER.password),
  ]);
  const now = truncateToMinute(new Date());
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

  return prisma.$transaction(async (tx) => {
    await tx.studentUser.deleteMany({ where: { email: SEED_STUDENT_USER.email } });
    await tx.user.deleteMany({ where: { email: SEED_TUTOR.email } });

    const tutor = await tx.user.create({
      data: {
        email: SEED_TUTOR.email,
        password: tutorHash,
        name: SEED_TUTOR.name,
        timezone: SEED_TUTOR.timezone,
        isEmailVerified: true,
      },
    });

    const anna = await tx.student.create({
      data: {
        tutorId: tutor.id,
        name: SEED_STUDENT_USER.name,
        contactMethod: "TELEGRAM",
        telegramNick: "anna_seed",
        phone: "+79990000001",
        grade: 11,
        hourlyRate: 2000,
      },
    });
    const ivan = await tx.student.create({
      data: {
        tutorId: tutor.id,
        name: "Иван Петров",
        contactMethod: "WHATSAPP",
        phone: "+79990000002",
        parentName: "Ольга Петрова",
        parentPhone: "+79990000012",
        parentContactMethod: "WHATSAPP",
        grade: 9,
        hourlyRate: 1500,
      },
    });
    await tx.student.create({
      data: {
        tutorId: tutor.id,
        name: "Мария Козлова",
        phone: "+79990000003",
        grade: 11,
        hourlyRate: 1800,
        archived: true,
        archivedAt: at(-7 * DAY_MS),
        archiveReason: "COMPLETED_STUDIES",
      },
    });

    await tx.studentUser.create({
      data: {
        email: SEED_STUDENT_USER.email,
        password: studentUserHash,
        name: SEED_STUDENT_USER.name,
        isEmailVerified: true,
        studentId: anna.id,
      },
    });

    const lessons = await tx.lesson.createMany({
      data: [
        {
          tutorId: tutor.id,
          studentId: anna.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: at(-DAY_MS),
          endTime: at(-DAY_MS + HOUR_MS),
          price: 2000,
          status: "COMPLETED",
          isPaid: true,
          paymentDate: at(-DAY_MS + HOUR_MS),
          receivedAmount: 2000,
          homework: "Вариант 12, задания 1–10",
          grade: 5,
        },
        {
          tutorId: tutor.id,
          studentId: ivan.id,
          subject: "PHYSICS",
          lessonType: "OGE",
          startTime: at(-2 * HOUR_MS),
          endTime: at(-HOUR_MS),
          price: 1500,
          status: "COMPLETED",
        },
        {
          tutorId: tutor.id,
          studentId: anna.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: at(15 * MINUTE_MS),
          endTime: at(75 * MINUTE_MS),
          price: 2000,
        },
        {
          tutorId: tutor.id,
          studentId: ivan.id,
          subject: "PHYSICS",
          lessonType: "OGE",
          startTime: at(3 * HOUR_MS),
          endTime: at(4 * HOUR_MS),
          price: 1500,
        },
        {
          tutorId: tutor.id,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: at(DAY_MS),
          endTime: at(DAY_MS + HOUR_MS),
          prospectName: "Олег",
          prospectPhone: "+79990000004",
          prospectContactMethod: "TELEGRAM",
        },
      ],
    });

    return {
      tutor: { email: SEED_TUTOR.email, password: SEED_TUTOR.password },
      studentUser: { email: SEED_STUDENT_USER.email, password: SEED_STUDENT_USER.password },
      students: 3,
      lessons: lessons.count,
    };
  });
};
