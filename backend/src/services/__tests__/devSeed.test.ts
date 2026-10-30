import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../utils";
import { uniqueEmail } from "../../__tests__/helpers";
import { SEED_STUDENT_USER, SEED_TUTOR, seedDevData } from "../devSeed";

const removeSeedRows = async () => {
  await prisma.studentUser.deleteMany({ where: { email: SEED_STUDENT_USER.email } });
  await prisma.user.deleteMany({ where: { email: SEED_TUTOR.email } });
};

const findSeedTutor = () =>
  prisma.user.findUniqueOrThrow({
    where: { email: SEED_TUTOR.email },
    include: { students: true, lessons: { orderBy: { startTime: "asc" } } },
  });

describe("seedDevData", () => {
  beforeEach(removeSeedRows);
  afterAll(removeSeedRows);

  it("should create a verified tutor who can log in with the returned password", async () => {
    const result = await seedDevData();

    const tutor = await findSeedTutor();
    expect(result.tutor).toEqual({ email: SEED_TUTOR.email, password: SEED_TUTOR.password });
    expect(tutor.isEmailVerified).toBe(true);
    expect(tutor.timezone).toBe("Europe/Moscow");
    expect(await comparePassword(result.tutor.password, tutor.password)).toBe(true);
  });

  it("should link a verified student cabinet to an active student of the tutor", async () => {
    const result = await seedDevData();

    const studentUser = await prisma.studentUser.findUniqueOrThrow({
      where: { email: SEED_STUDENT_USER.email },
      include: { student: true },
    });
    const tutor = await findSeedTutor();
    expect(studentUser.isEmailVerified).toBe(true);
    expect(await comparePassword(result.studentUser.password, studentUser.password)).toBe(true);
    expect(studentUser.student).toMatchObject({ tutorId: tutor.id, archived: false });
  });

  it("should create active and archived students and lessons around the current time", async () => {
    const startedAt = Date.now();
    const result = await seedDevData();

    const tutor = await findSeedTutor();
    expect(tutor.students).toHaveLength(result.students);
    expect(tutor.students.filter((s) => s.archived)).toHaveLength(1);
    expect(tutor.lessons).toHaveLength(result.lessons);

    const past = tutor.lessons.filter((l) => l.endTime.getTime() < startedAt);
    const upcoming = tutor.lessons.filter((l) => l.startTime.getTime() > startedAt);
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((l) => l.status === "COMPLETED")).toBe(true);
    expect(past.some((l) => l.isPaid)).toBe(true);
    expect(past.some((l) => !l.isPaid)).toBe(true);
    expect(upcoming.every((l) => l.status === "SCHEDULED")).toBe(true);
    expect(upcoming.some((l) => l.studentId === null && l.prospectName)).toBe(true);

    const cabinet = await prisma.studentUser.findUniqueOrThrow({
      where: { email: SEED_STUDENT_USER.email },
    });
    expect(upcoming.some((l) => l.studentId === cabinet.studentId)).toBe(true);
  });

  it("should replace the previous seed set when run again", async () => {
    await seedDevData();
    const first = await findSeedTutor();

    const result = await seedDevData();

    const second = await findSeedTutor();
    expect(second.id).not.toBe(first.id);
    expect(await prisma.student.count({ where: { tutorId: first.id } })).toBe(0);
    expect(second.students).toHaveLength(result.students);
    expect(second.lessons).toHaveLength(result.lessons);
    expect(await prisma.studentUser.count({ where: { email: SEED_STUDENT_USER.email } })).toBe(1);
  });

  it("should not touch data of other tutors", async () => {
    const other = await prisma.user.create({
      data: {
        email: uniqueEmail(),
        password: "x",
        name: "Другой преподаватель",
        students: { create: { name: "Чужой ученик" } },
      },
    });

    try {
      await seedDevData();

      expect(await prisma.student.count({ where: { tutorId: other.id } })).toBe(1);
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }
  });
});
