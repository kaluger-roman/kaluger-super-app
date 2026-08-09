import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

const DAY_MS = 24 * 3600 * 1000;

const slot = (daysFromNow: number) => ({
  startTime: new Date(Date.now() + daysFromNow * DAY_MS).toISOString(),
  endTime: new Date(Date.now() + daysFromNow * DAY_MS + 3600000).toISOString(),
});

describe("createLesson prospect (trial without student) integration tests", () => {
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
        hourlyRate: 900,
        tutorId: userId,
      },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should create prospect lesson with null studentId and price 0 when only prospectName is given", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(40),
      prospectName: "  Иван (пробный)  ",
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(201)
      .then(async (res) => {
        expect(res.body.lesson.studentId).toBeNull();
        expect(res.body.lesson.student).toBeNull();
        expect(res.body.lesson.prospectName).toBe("Иван (пробный)");
        const created = await prisma.lesson.findUnique({
          where: { id: res.body.lesson.id },
        });
        expect(created?.studentId).toBeNull();
        expect(created?.prospectName).toBe("Иван (пробный)");
        expect(created?.price?.toNumber()).toBe(0);
      });
  });

  it("should save prospectPhone and prospectContactMethod MAX when provided", async () => {
    const body = {
      subject: "PHYSICS",
      lessonType: "OGE",
      ...slot(41),
      prospectName: "Мария",
      prospectPhone: "+79991234567",
      prospectContactMethod: "MAX",
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(201)
      .then(async (res) => {
        const created = await prisma.lesson.findUnique({
          where: { id: res.body.lesson.id },
        });
        expect(created?.prospectPhone).toBe("+79991234567");
        expect(created?.prospectContactMethod).toBe("MAX");
      });
  });

  it("should keep explicit price when prospect lesson is paid trial", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      ...slot(42),
      prospectName: "Платный пробный",
      price: 500,
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(201)
      .then(async (res) => {
        const created = await prisma.lesson.findUnique({
          where: { id: res.body.lesson.id },
        });
        expect(created?.price?.toNumber()).toBe(500);
      });
  });

  it("should return 400 when neither studentId nor prospectName is given", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(43),
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Укажите ученика или имя для пробного урока без ученика"
        );
      });
  });

  it("should return 400 when both studentId and prospectName are given", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(44),
      studentId,
      prospectName: "Иван",
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Данные пробного ученика нельзя указывать вместе с учеником"
        );
      });
  });

  it("should return 400 when prospectName is blank", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(45),
      prospectName: "   ",
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Имя ученика для пробного урока обязательно"
        );
      });
  });

  it("should return 400 when prospect lesson is marked as recurring", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(46),
      prospectName: "Иван",
      isRecurring: true,
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Пробный урок без ученика не может быть повторяющимся"
        );
      });
  });

  it("should return 400 when prospectContactMethod is invalid", async () => {
    const body = {
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      ...slot(47),
      prospectName: "Иван",
      prospectContactMethod: "VIBER",
    };

    await request(app)
      .post(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Недопустимый способ связи (WhatsApp, Telegram или MAX)"
        );
      });
  });
});
