import request from "supertest";
import { app } from "../index";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/auth";
import { faker } from "@faker-js/faker";

describe("getLessons paymentDate filter", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;

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
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("should filter lessons by paymentDateFrom and paymentDateTo", async () => {
    const paidMarch = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date("2026-03-10T10:00:00Z"),
        endTime: new Date("2026-03-10T11:00:00Z"),
        isRecurring: false,
        isPaid: true,
        price: 1000,
        paymentDate: new Date("2026-03-15T12:00:00Z"),
        status: "COMPLETED",
      },
    });

    const paidApril = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date("2026-03-20T10:00:00Z"),
        endTime: new Date("2026-03-20T11:00:00Z"),
        isRecurring: false,
        isPaid: true,
        price: 1000,
        paymentDate: new Date("2026-04-05T12:00:00Z"),
        status: "COMPLETED",
      },
    });

    const unpaid = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date("2026-03-25T10:00:00Z"),
        endTime: new Date("2026-03-25T11:00:00Z"),
        isRecurring: false,
        isPaid: false,
        price: 1000,
        status: "COMPLETED",
      },
    });

    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        paymentDateFrom: "2026-03-01",
        paymentDateTo: "2026-03-31",
      })
      .expect(200);

    const ids = res.body.lessons.map((l: { id: string }) => l.id);
    expect(ids).toContain(paidMarch.id);
    expect(ids).not.toContain(paidApril.id);
    expect(ids).not.toContain(unpaid.id);
  });

  it("should filter with paymentDateFrom only (open-ended)", async () => {
    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        paymentDateFrom: "2026-04-01",
      })
      .expect(200);

    const paymentDates = res.body.lessons.map(
      (l: { paymentDate: string }) => new Date(l.paymentDate)
    );
    paymentDates.forEach((d: Date) => {
      expect(d.getTime()).toBeGreaterThanOrEqual(new Date("2026-04-01").getTime());
    });
  });

  it("should filter with paymentDateTo only (open-ended)", async () => {
    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        paymentDateTo: "2026-03-31",
      })
      .expect(200);

    const paymentDates = res.body.lessons.map(
      (l: { paymentDate: string }) => new Date(l.paymentDate)
    );
    paymentDates.forEach((d: Date) => {
      expect(d.getTime()).toBeLessThanOrEqual(new Date("2026-03-31T23:59:59.999Z").getTime());
    });
  });

  it("should return 400 when paymentDateFrom is after paymentDateTo", async () => {
    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        paymentDateFrom: "2026-04-01",
        paymentDateTo: "2026-03-01",
      })
      .expect(400);

    expect(res.body.error).toBe("Дата начала оплаты не может быть позже даты окончания");
  });

  it("should ignore paymentDate filter when onlyUnpaid is true", async () => {
    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        onlyUnpaid: "true",
        paymentDateFrom: "2026-03-01",
        paymentDateTo: "2026-03-31",
      })
      .expect(200);

    // onlyUnpaid=true should take priority: return unpaid lessons (no paymentDate)
    res.body.lessons.forEach((l: { isPaid: boolean }) => {
      expect(l.isPaid).toBe(false);
    });
  });

  it("should exclude unpaid lessons (null paymentDate) when payment date filter is active", async () => {
    const res = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        paymentDateFrom: "2026-01-01",
        paymentDateTo: "2026-12-31",
      })
      .expect(200);

    res.body.lessons.forEach((l: { paymentDate: string | null }) => {
      expect(l.paymentDate).not.toBeNull();
    });
  });
});
