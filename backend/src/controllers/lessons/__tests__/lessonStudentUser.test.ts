import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { uniqueEmail } from "../../../__tests__/helpers";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe("lesson responses: student cabinet of the lesson", () => {
  let authToken: string;
  let userId: string;
  let linkedStudentId: string;
  let studentUserId: string;
  let plainStudentId: string;
  let slot = 0;

  const nextSlot = () => {
    slot += 1;
    const start = new Date(Date.now() + 30 * DAY_MS + slot * 2 * HOUR_MS);
    return { startTime: start, endTime: new Date(start.getTime() + HOUR_MS) };
  };

  const createLesson = (studentId: string | null) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        prospectName: studentId ? null : "Пробный",
        ...nextSlot(),
      },
    });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hashed", name: "Анна" },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });

    const linked = await prisma.student.create({ data: { name: "С кабинетом", tutorId: userId } });
    linkedStudentId = linked.id;
    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "С кабинетом",
        studentId: linkedStudentId,
      },
    });
    studentUserId = studentUser.id;
    const plain = await prisma.student.create({ data: { name: "Без кабинета", tutorId: userId } });
    plainStudentId = plain.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("should expose studentUser in GET /api/lessons", async () => {
    const linkedLesson = await createLesson(linkedStudentId);
    const plainLesson = await createLesson(plainStudentId);
    const trialLesson = await createLesson(null);

    const res = await request(app)
      .get("/api/lessons?limit=100")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const byId = new Map(
      res.body.lessons.map((lesson: { id: string; student: unknown }) => [
        lesson.id,
        lesson.student,
      ])
    );
    expect(byId.get(linkedLesson.id)).toMatchObject({ studentUser: { id: studentUserId } });
    expect(byId.get(plainLesson.id)).toMatchObject({ studentUser: null });
    expect(byId.get(trialLesson.id)).toBeNull();
  });

  it("should expose studentUser in GET /api/lessons/:id", async () => {
    const linkedLesson = await createLesson(linkedStudentId);
    const plainLesson = await createLesson(plainStudentId);
    const trialLesson = await createLesson(null);

    const get = (id: string) =>
      request(app).get(`/api/lessons/${id}`).set("Authorization", `Bearer ${authToken}`);

    expect((await get(linkedLesson.id).expect(200)).body.lesson.student).toMatchObject({
      studentUser: { id: studentUserId },
    });
    expect((await get(plainLesson.id).expect(200)).body.lesson.student).toMatchObject({
      studentUser: null,
    });
    expect((await get(trialLesson.id).expect(200)).body.lesson.student).toBeNull();
  });

  it("should expose studentUser in POST /api/lessons for single and recurring lessons", async () => {
    const post = (studentId: string, isRecurring: boolean) => {
      const { startTime, endTime } = nextSlot();
      return request(app)
        .post("/api/lessons")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          isRecurring,
        })
        .expect(201);
    };

    expect((await post(linkedStudentId, false)).body.lesson.student).toMatchObject({
      studentUser: { id: studentUserId },
    });
    expect((await post(plainStudentId, false)).body.lesson.student).toMatchObject({
      studentUser: null,
    });
    slot += 60;
    expect((await post(linkedStudentId, true)).body.lesson.student).toMatchObject({
      studentUser: { id: studentUserId },
    });
  });

  it("should expose studentUser in PUT /api/lessons/:id", async () => {
    const linkedLesson = await createLesson(linkedStudentId);
    const plainLesson = await createLesson(plainStudentId);

    const put = (id: string) =>
      request(app)
        .put(`/api/lessons/${id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "Обновлено" })
        .expect(200);

    expect((await put(linkedLesson.id)).body.lesson.student).toEqual({
      id: linkedStudentId,
      name: "С кабинетом",
      studentUser: { id: studentUserId },
    });
    expect((await put(plainLesson.id)).body.lesson.student).toEqual({
      id: plainStudentId,
      name: "Без кабинета",
      studentUser: null,
    });
  });

  describe("calls of a reassigned lesson", () => {
    const createCall = (lessonId: string) =>
      prisma.callRecord.create({
        data: {
          tutorId: userId,
          studentId: linkedStudentId,
          lessonId,
          callerKind: "TUTOR",
          status: "COMPLETED",
        },
      });

    const put = (id: string, body: Record<string, unknown>) =>
      request(app)
        .put(`/api/lessons/${id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(body)
        .expect(200);

    it("should unlink the calls of the previous student when the lesson gets another student", async () => {
      const lesson = await createLesson(linkedStudentId);
      const call = await createCall(lesson.id);

      await put(lesson.id, { studentId: plainStudentId });

      const record = await prisma.callRecord.findUniqueOrThrow({ where: { id: call.id } });
      expect(record).toMatchObject({ studentId: linkedStudentId, lessonId: null });
    });

    it("should unlink a call of another student on any lesson update", async () => {
      const lesson = await createLesson(plainStudentId);
      const call = await createCall(lesson.id);

      await put(lesson.id, { description: "Обновлено" });

      const record = await prisma.callRecord.findUniqueOrThrow({ where: { id: call.id } });
      expect(record).toMatchObject({ studentId: linkedStudentId, lessonId: null });
    });

    it("should keep the calls linked when the student stays the same", async () => {
      const lesson = await createLesson(linkedStudentId);
      const call = await createCall(lesson.id);

      await put(lesson.id, { description: "Обновлено" });

      const record = await prisma.callRecord.findUniqueOrThrow({ where: { id: call.id } });
      expect(record.lessonId).toBe(lesson.id);
    });
  });
});
