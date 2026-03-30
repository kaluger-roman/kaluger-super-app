import prisma from "../lib/prisma";

export const getOverviewData = async () => {
  const [usersCount, studentsCount, lessonsCount] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.lesson.count(),
  ]);

  return {
    usersCount,
    studentsCount,
    lessonsCount,
    serverUptime: Math.floor(process.uptime()),
  };
};
