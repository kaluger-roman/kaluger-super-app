import request from "supertest";
import { faker } from "@faker-js/faker";
import type { LessonStatus } from "@prisma/client";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("lesson commission credit", () => {
  let authToken: string;
  let userId: string;

  const createStudent = (commissionAmount: number) =>
    prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        commissionAmount,
        tutorId: userId,
      },
    });

  const createLesson = ({
    studentId,
    day,
    price = 1000,
    status = "COMPLETED",
    isPaid = true,
  }: {
    studentId: string | null;
    day: number;
    price?: number | null;
    status?: LessonStatus;
    isPaid?: boolean;
  }) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        startTime: new Date(Date.UTC(2026, 2, day, 10, 0, 0)),
        endTime: new Date(Date.UTC(2026, 2, day, 11, 0, 0)),
        price,
        status,
        isPaid,
        ...(isPaid ? { paymentDate: new Date(Date.UTC(2026, 2, day, 12, 0, 0)) } : {}),
        ...(studentId ? {} : { prospectName: "Кандидат" }),
      },
    });

  const fetchLessons = async (query = "noPagination=true") => {
    const response = await request(app)
      .get(`/api/lessons?${query}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    return response.body.lessons as Array<{
      id: string;
      commissionCredit?: { amount: number; state: string } | null;
    }>;
  };

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should credit paid lessons until the commission is exhausted", async () => {
    const student = await createStudent(2500);
    const first = await createLesson({ studentId: student.id, day: 1 });
    const second = await createLesson({ studentId: student.id, day: 2 });
    const third = await createLesson({ studentId: student.id, day: 3 });
    const fourth = await createLesson({ studentId: student.id, day: 4 });

    const lessons = await fetchLessons();
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson.commissionCredit]));

    expect(byId.get(first.id)).toEqual({ amount: 1000, state: "FACT" });
    expect(byId.get(second.id)).toEqual({ amount: 1000, state: "FACT" });
    expect(byId.get(third.id)).toEqual({ amount: 500, state: "FACT" });
    expect(byId.get(fourth.id)).toBeUndefined();
  });

  it("should forecast lessons that can still repay the commission", async () => {
    const student = await createStudent(4000);
    const scheduled = await createLesson({
      studentId: student.id,
      day: 1,
      status: "SCHEDULED",
      isPaid: false,
    });
    const rescheduled = await createLesson({
      studentId: student.id,
      day: 2,
      status: "RESCHEDULED",
      isPaid: false,
    });
    const inProgress = await createLesson({
      studentId: student.id,
      day: 3,
      status: "IN_PROGRESS",
      isPaid: false,
    });
    const completedUnpaid = await createLesson({
      studentId: student.id,
      day: 4,
      status: "COMPLETED",
      isPaid: false,
    });

    const lessons = await fetchLessons();
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson.commissionCredit]));

    for (const id of [scheduled.id, rescheduled.id, inProgress.id, completedUnpaid.id]) {
      expect(byId.get(id)).toEqual({ amount: 1000, state: "FORECAST" });
    }
  });

  it("should leave cancelled and free lessons unmarked", async () => {
    const student = await createStudent(5000);
    const cancelled = await createLesson({
      studentId: student.id,
      day: 1,
      status: "CANCELLED",
      isPaid: false,
    });
    const free = await createLesson({ studentId: student.id, day: 2, price: 0 });
    const noPrice = await createLesson({ studentId: student.id, day: 3, price: null });

    const lessons = await fetchLessons();
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson.commissionCredit]));

    expect(byId.get(cancelled.id)).toBeUndefined();
    expect(byId.get(free.id)).toBeUndefined();
    expect(byId.get(noPrice.id)).toBeUndefined();
  });

  it("should never mark a trial lesson without a student", async () => {
    await createStudent(5000);
    const trial = await createLesson({ studentId: null, day: 1 });

    const lessons = await fetchLessons();
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson.commissionCredit]));

    expect(byId.get(trial.id)).toBeUndefined();
  });

  it("should not add the field at all for a tutor without commissions", async () => {
    const student = await createStudent(0);
    await createLesson({ studentId: student.id, day: 1 });
    await createLesson({ studentId: student.id, day: 2 });

    const lessons = await fetchLessons();

    for (const lesson of lessons) {
      expect(lesson).not.toHaveProperty("commissionCredit");
    }
  });

  it("should never return an empty credit object instead of omitting the field", async () => {
    const student = await createStudent(1000);
    await createLesson({ studentId: student.id, day: 1 });
    await createLesson({ studentId: student.id, day: 2 });

    const lessons = await fetchLessons();

    for (const lesson of lessons) {
      if (lesson.commissionCredit) {
        expect(lesson.commissionCredit.amount).toBeGreaterThan(0);
      } else {
        expect(lesson.commissionCredit).toBeUndefined();
      }
    }
  });

  it("should compute credits from all lessons, not just the requested page", async () => {
    const student = await createStudent(2500);
    for (let day = 1; day <= 4; day += 1) {
      await createLesson({ studentId: student.id, day });
    }

    const allLessons = await fetchLessons();
    const expected = new Map(allLessons.map((lesson) => [lesson.id, lesson.commissionCredit]));

    const secondPage = await fetchLessons("page=2&limit=2");

    expect(secondPage).toHaveLength(2);
    for (const lesson of secondPage) {
      expect(lesson.commissionCredit).toEqual(expected.get(lesson.id));
    }
  });

  it("should return the recalculated credit in the lesson update response", async () => {
    const student = await createStudent(1000);
    const lesson = await createLesson({
      studentId: student.id,
      day: 1,
      status: "COMPLETED",
      isPaid: false,
    });

    const response = await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ isPaid: true })
      .expect(200);

    expect(response.body.lesson.commissionCredit).toEqual({ amount: 1000, state: "FACT" });
  });
});
