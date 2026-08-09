import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

const DAY_MS = 24 * 3600 * 1000;

describe("updateLesson prospect (trial without student) integration tests", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;
  let otherUserId: string;
  let otherStudentId: string;

  const createProspectLesson = (daysFromNow: number, extra = {}) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: null,
        prospectName: "Иван (пробный)",
        prospectPhone: "+79991234567",
        prospectContactMethod: "MAX",
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + daysFromNow * DAY_MS),
        endTime: new Date(Date.now() + daysFromNow * DAY_MS + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
        price: 0,
        ...extra,
      },
    });

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

    const student = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });
    studentId = student.id;

    const otherUser = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });
    otherUserId = otherUser.id;

    const otherStudent = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: otherUserId,
      },
    });
    otherStudentId = otherStudent.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({
      where: { tutorId: { in: [userId, otherUserId] } },
    });
    await prisma.student.deleteMany({
      where: { tutorId: { in: [userId, otherUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await prisma.$disconnect();
  });

  it("should link prospect lesson to student and clear prospect fields", async () => {
    const lesson = await createProspectLesson(60);

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ studentId })
      .expect(200)
      .then(async (res) => {
        expect(res.body.lesson.studentId).toBe(studentId);
        const after = await prisma.lesson.findUnique({
          where: { id: lesson.id },
        });
        expect(after?.studentId).toBe(studentId);
        expect(after?.prospectName).toBeNull();
        expect(after?.prospectPhone).toBeNull();
        expect(after?.prospectContactMethod).toBeNull();
      });
  });

  it("should return 404 when linking a student of another tutor", async () => {
    const lesson = await createProspectLesson(61);

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ studentId: otherStudentId })
      .expect(404)
      .then((res) => {
        expect(res.body.error).toBe("Ученик не найден");
      });

    const after = await prisma.lesson.findUnique({ where: { id: lesson.id } });
    expect(after?.studentId).toBeNull();
    expect(after?.prospectName).toBe("Иван (пробный)");
  });

  it("should return 400 when unlinking student from a regular lesson", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 62 * DAY_MS),
        endTime: new Date(Date.now() + 62 * DAY_MS + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ studentId: null })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe("Нельзя отвязать ученика от урока");
      });
  });

  it("should return 400 when prospect fields are sent for a lesson with student", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 63 * DAY_MS),
        endTime: new Date(Date.now() + 63 * DAY_MS + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ prospectName: "Иван" })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Данные пробного ученика нельзя указывать вместе с учеником"
        );
      });
  });

  it("should update prospect fields of a prospect lesson", async () => {
    const lesson = await createProspectLesson(64);

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        prospectName: "  Пётр  ",
        prospectPhone: "+70000000000",
        prospectContactMethod: "TELEGRAM",
      })
      .expect(200)
      .then(async () => {
        const after = await prisma.lesson.findUnique({
          where: { id: lesson.id },
        });
        expect(after?.prospectName).toBe("Пётр");
        expect(after?.prospectPhone).toBe("+70000000000");
        expect(after?.prospectContactMethod).toBe("TELEGRAM");
        expect(after?.studentId).toBeNull();
      });
  });

  it("should return 400 when prospectName is blank in update", async () => {
    const lesson = await createProspectLesson(65);

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ prospectName: "   " })
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Имя ученика для пробного урока обязательно"
        );
      });
  });

  it("should cancel paid prospect lesson without transferring payment to another lesson", async () => {
    const paymentDate = new Date(Date.now() - 3600000);
    const paidProspect = await createProspectLesson(66, {
      price: 500,
      isPaid: true,
      paymentDate,
    });
    const unpaidProspect = await createProspectLesson(67, {
      price: 500,
      isPaid: false,
    });
    const unpaidRegular = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 68 * DAY_MS),
        endTime: new Date(Date.now() + 68 * DAY_MS + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
        price: 500,
        isPaid: false,
      },
    });

    await request(app)
      .put(`/api/lessons/${paidProspect.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "CANCELLED" })
      .expect(200);

    const cancelledAfter = await prisma.lesson.findUnique({
      where: { id: paidProspect.id },
    });
    const prospectAfter = await prisma.lesson.findUnique({
      where: { id: unpaidProspect.id },
    });
    const regularAfter = await prisma.lesson.findUnique({
      where: { id: unpaidRegular.id },
    });

    expect(cancelledAfter?.status).toBe("CANCELLED");
    expect(cancelledAfter?.isPaid).toBe(false);
    expect(cancelledAfter?.paymentDate).toBeNull();
    expect(prospectAfter?.isPaid).toBe(false);
    expect(regularAfter?.isPaid).toBe(false);
  });
});
