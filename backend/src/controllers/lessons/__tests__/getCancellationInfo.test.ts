import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("GET /api/lessons/:id/cancellation-info", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed_password",
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });

    const student = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        tutorId: userId,
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
      },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  afterEach(async () => {
    // Clean up lessons created in each test
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
  });

  it("should return 404 when lesson not found", async () => {
    await request(app)
      .get("/api/lessons/non-existent-id/cancellation-info")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);
  });

  it("should return null when lesson is not paid", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1000,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: false,
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${lesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toBeNull();
  });

  it("should return null when no payment date", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1000,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate: null,
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${lesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toBeNull();
  });

  it("should return null when no next unpaid lesson found", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1000,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate: new Date(),
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${lesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toBeNull();
  });

  it("should return cancellation info when next unpaid lesson exists", async () => {
    const paymentDate = new Date();
    const paidLesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1500,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate,
      },
    });

    const unpaidLesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        price: 1500,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: false,
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toMatchObject({
      nextLessonId: unpaidLesson.id,
      transferAmount: 1500,
    });
    expect(response.body.cancellationInfo.nextLessonStartTime).toBeTruthy();
    expect(response.body.cancellationInfo.transferDate).toBeTruthy();
  });

  it("should not return next lesson with different price", async () => {
    const paymentDate = new Date();
    const paidLesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1000,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate,
      },
    });

    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        price: 2000, // Different price
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: false,
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toBeNull();
  });

  it("should not return cancelled lesson as next lesson", async () => {
    const paymentDate = new Date();
    const paidLesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1200,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate,
      },
    });

    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        price: 1200,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "CANCELLED" as const,
        isPaid: false,
      },
    });

    const response = await request(app)
      .get(`/api/lessons/${paidLesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.cancellationInfo).toBeNull();
  });

  it("handles database errors gracefully", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        price: 1000,
        isRecurring: false,
        tutorId: userId,
        studentId: studentId,
        status: "SCHEDULED" as const,
        isPaid: true,
        paymentDate: new Date(),
      },
    });

    const originalFindFirst = prisma.lesson.findFirst;
    prisma.lesson.findFirst = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .get(`/api/lessons/${lesson.id}/cancellation-info`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.lesson.findFirst = originalFindFirst;
  });
});
