import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("get students integration tests", () => {
  let authToken: string;
  let userId: string;

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

  beforeEach(async () => {
    // ensure fresh state for each test
    await prisma.student.deleteMany({ where: { tutorId: userId } });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns students for authenticated user", async () => {
    // create students for this tutor
    const st1 = await prisma.student.create({
      data: {
        name: "S1",
        contactMethod: "WHATSAPP",
        phone: "+70000000001",
        tutorId: userId,
      },
    });
    const st2 = await prisma.student.create({
      data: {
        name: "S2",
        contactMethod: "WHATSAPP",
        phone: "+70000000002",
        tutorId: userId,
      },
    });

    await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body.students)).toBe(true);
        const ids = res.body.students.map((s: any) => s.id);
        expect(ids).toEqual(expect.arrayContaining([st1.id, st2.id]));
      });
  });

  it("returns 404 for missing student", async () => {
    await request(app)
      .get(`/api/students/non-existent-id`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404)
      .then((res) => {
        expect(res.body.error).toBe("Ученик не найден");
      });
  });

  it("returns student when exists", async () => {
    const student = await prisma.student.create({
      data: {
        name: "Exist",
        contactMethod: "WHATSAPP",
        phone: "+70000000003",
        tutorId: userId,
      },
    });

    await request(app)
      .get(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.student).toBeDefined();
        expect(res.body.student.id).toBe(student.id);
      });
  });

  it("includes last 5 lessons ordered by startTime desc", async () => {
    const student = await prisma.student.create({
      data: {
        name: "WithLessons",
        contactMethod: "WHATSAPP",
        phone: "+70000000004",
        tutorId: userId,
      },
    });

    // create 6 lessons with increasing startTime (older -> newer)
    const now = Date.now();
    const lessonIds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const start = new Date(now + i * 60 * 60 * 1000); // each hour later
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const l = await prisma.lesson.create({
        data: {
          studentId: student.id,
          tutorId: userId,
          startTime: start,
          endTime: end,
        },
      });
      lessonIds.push(l.id);
    }

    // controller returns all lessons for single student (ordered desc)
    const expected = lessonIds.slice().reverse();
    await request(app)
      .get(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body.student.lessons)).toBe(true);
        expect(res.body.student.lessons).toHaveLength(6);
        const returnedIds = res.body.student.lessons.map((l: any) => l.id);
        expect(returnedIds).toEqual(expected);
      });
  });
});
