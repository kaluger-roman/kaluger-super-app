import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("student commission API", () => {
  let authToken: string;
  let userId: string;

  const createStudent = (commissionAmount?: number | null) =>
    prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
        ...(commissionAmount === undefined ? {} : { commissionAmount: commissionAmount ?? 0 }),
      },
    });

  const createPaidLesson = (studentId: string, price: number, dayOfMonth: number) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        startTime: new Date(Date.UTC(2026, 2, dayOfMonth, 10, 0, 0)),
        endTime: new Date(Date.UTC(2026, 2, dayOfMonth, 11, 0, 0)),
        price,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: new Date(Date.UTC(2026, 2, dayOfMonth, 12, 0, 0)),
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
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("POST /api/students", () => {
    it("should store and return the commission amount", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "С комиссией", contactMethod: "WHATSAPP", commissionAmount: 3000 })
        .expect(201);

      expect(response.body.student.commissionAmount).toBe(3000);

      const stored = await prisma.student.findUnique({
        where: { id: response.body.student.id },
      });
      expect(stored?.commissionAmount.toNumber()).toBe(3000);
    });

    it("should default the commission to zero when the field is missing", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Без комиссии", contactMethod: "WHATSAPP" })
        .expect(201);

      expect(response.body.student.commissionAmount).toBe(0);
    });

    it("should treat an explicit null commission as zero", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Null комиссия", contactMethod: "WHATSAPP", commissionAmount: null })
        .expect(201);

      expect(response.body.student.commissionAmount).toBe(0);
    });

    it("should store an explicit zero commission instead of skipping the field", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Ноль", contactMethod: "WHATSAPP", commissionAmount: 0 })
        .expect(201);

      const stored = await prisma.student.findUnique({
        where: { id: response.body.student.id },
      });
      expect(stored?.commissionAmount.toNumber()).toBe(0);
    });

    it("should reject a negative commission with a Russian message", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Минус", contactMethod: "WHATSAPP", commissionAmount: -1 })
        .expect(400);

      expect(response.body.error).toBe("Комиссия не может быть отрицательной");
    });

    it("should reject a non-numeric commission", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Буквы", contactMethod: "WHATSAPP", commissionAmount: "abc" })
        .expect(400);

      expect(response.body.error).toBe("Комиссия должна быть числом");
    });

    it("should reject a commission above the DECIMAL(10,2) ceiling", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: faker.person.fullName(),
          contactMethod: "WHATSAPP",
          commissionAmount: 100000000,
        })
        .expect(400);

      expect(response.body.error).toContain("Комиссия");
    });

    it("should reject a commission with more than two decimal places", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: faker.person.fullName(),
          contactMethod: "WHATSAPP",
          commissionAmount: 1500.555,
        })
        .expect(400);

      expect(response.body.error).toContain("Комиссия");
    });

    it("should accept a commission with exactly two decimal places", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: faker.person.fullName(),
          contactMethod: "WHATSAPP",
          commissionAmount: 1500.07,
        })
        .expect(201);

      expect(response.body.student.commissionAmount).toBe(1500.07);
    });

    it("should return the progress fields on creation", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Прогресс", contactMethod: "WHATSAPP", commissionAmount: 2500 })
        .expect(201);

      expect(response.body.student.commissionRepaid).toBe(0);
      expect(response.body.student.commissionRemaining).toBe(2500);
    });
  });

  describe("PUT /api/students/:id", () => {
    it("should update the commission amount", async () => {
      const student = await createStudent(0);

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ commissionAmount: 1500 })
        .expect(200);

      expect(response.body.student.commissionAmount).toBe(1500);
    });

    it("should normalize a null commission to zero", async () => {
      const student = await createStudent(1500);

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ commissionAmount: null })
        .expect(200);

      expect(response.body.student.commissionAmount).toBe(0);
    });

    it("should reject a negative commission", async () => {
      const student = await createStudent(0);

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ commissionAmount: -5 })
        .expect(400);

      expect(response.body.error).toBe("Комиссия не может быть отрицательной");
    });

    it("should return the progress fields on update", async () => {
      const student = await createStudent(3000);
      await createPaidLesson(student.id, 1200, 1);

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ commissionAmount: 3000 })
        .expect(200);

      expect(response.body.student.commissionRepaid).toBe(1200);
      expect(response.body.student.commissionRemaining).toBe(1800);
    });
  });

  describe("GET /api/students", () => {
    it("should return zero and never null for a student created before the feature", async () => {
      await createStudent();

      const response = await request(app)
        .get("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.students).toHaveLength(1);
      expect(response.body.students[0].commissionAmount).toBe(0);
      expect(response.body.students[0].commissionAmount).not.toBeNull();
    });

    it("should count only paid completed lessons towards the repaid amount", async () => {
      const student = await createStudent(3000);
      await createPaidLesson(student.id, 1200, 1);
      await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId: student.id,
          startTime: new Date(Date.UTC(2026, 2, 2, 10, 0, 0)),
          endTime: new Date(Date.UTC(2026, 2, 2, 11, 0, 0)),
          price: 1000,
          status: "SCHEDULED",
        },
      });

      const response = await request(app)
        .get("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const [body] = response.body.students;
      expect(body.commissionRepaid).toBe(1200);
      expect(body.commissionRemaining).toBe(1800);
      expect(body.commissionRepaid + body.commissionRemaining).toBe(body.commissionAmount);
    });

    it("should report zero progress for a student without a commission", async () => {
      const withCommission = await createStudent(1000);
      await createPaidLesson(withCommission.id, 1000, 1);
      await createStudent(0);

      const response = await request(app)
        .get("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const free = response.body.students.find((student: any) => student.id !== withCommission.id);
      expect(free.commissionRepaid).toBe(0);
      expect(free.commissionRemaining).toBe(0);
    });

    it("should keep the remaining amount non-negative after lowering the commission", async () => {
      const student = await createStudent(3000);
      await createPaidLesson(student.id, 2000, 1);

      await request(app)
        .put(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ commissionAmount: 500 })
        .expect(200);

      const response = await request(app)
        .get("/api/students")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const [body] = response.body.students;
      expect(body.commissionRepaid).toBe(500);
      expect(body.commissionRemaining).toBe(0);
    });
  });

  describe("GET /api/students/:id", () => {
    it("should enrich the single student response with progress fields", async () => {
      const student = await createStudent(2000);
      await createPaidLesson(student.id, 800, 1);

      const response = await request(app)
        .get(`/api/students/${student.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.student.commissionAmount).toBe(2000);
      expect(response.body.student.commissionRepaid).toBe(800);
      expect(response.body.student.commissionRemaining).toBe(1200);
    });
  });

  describe("PUT /api/students/:id/archive", () => {
    it("should return the progress fields on archive", async () => {
      const student = await createStudent(3000);
      await createPaidLesson(student.id, 1200, 1);

      const response = await request(app)
        .put(`/api/students/${student.id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ archiveReason: "COMPLETED_STUDIES" })
        .expect(200);

      expect(response.body.student.commissionAmount).toBe(3000);
      expect(response.body.student.commissionRepaid).toBe(1200);
      expect(response.body.student.commissionRemaining).toBe(1800);
    });

    it("should return the progress fields on unarchive", async () => {
      const student = await createStudent(3000);
      await createPaidLesson(student.id, 1200, 1);
      await prisma.student.update({
        where: { id: student.id },
        data: { archived: true, archivedAt: new Date() },
      });

      const response = await request(app)
        .put(`/api/students/${student.id}/unarchive`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.student.commissionAmount).toBe(3000);
      expect(response.body.student.commissionRepaid).toBe(1200);
      expect(response.body.student.commissionRemaining).toBe(1800);
    });
  });
});
