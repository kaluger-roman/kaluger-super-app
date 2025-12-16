import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("getLessons controller", () => {
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
    await prisma.$disconnect();
  });

  it("returns single lesson by id and 404 for others", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.lesson).toBeDefined();
        expect(res.body.lesson.id).toBe(lesson.id);
      });

    // other user cannot access
    const other = await prisma.user.create({
      data: { email: faker.internet.email(), password: "x", name: "o" },
    });
    const otherToken = generateToken({ userId: other.id, email: other.email });

    await request(app)
      .get(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);

    await prisma.user.delete({ where: { id: other.id } });
  });

  it("filters by studentId and onlyUnpaid and onlyWithoutHomework and returns pagination", async () => {
    // create paid and unpaid lessons
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 1 * 24 * 3600 * 1000),
          endTime: new Date(Date.now() + 1 * 24 * 3600 * 1000 + 3600000),
          isRecurring: false,
          isPaid: false,
          price: 1000,
          isHomeworkSentByTeacher: false,
          status: "SCHEDULED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000),
          endTime: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 3600000),
          isRecurring: false,
          isPaid: true,
          price: 1000,
          isHomeworkSentByTeacher: true,
          status: "SCHEDULED",
        },
      ],
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId,
        onlyUnpaid: "true",
        onlyWithoutHomework: "true",
        page: "1",
        limit: "10",
      })
      .expect(200)
      .then((res) => {
        expect(res.body.lessons).toBeInstanceOf(Array);
        expect(res.body.lessons.length).toBeGreaterThanOrEqual(1);
        expect(res.body.pagination).toBeDefined();
      });
  });

  it("supports weekly range and noPagination", async () => {
    const weekStart = new Date();
    // create lessons inside the week
    await prisma.lesson.createMany({
      data: Array.from({ length: 3 }).map((_, i) => ({
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(weekStart.getTime() + i * 24 * 3600 * 1000),
        endTime: new Date(weekStart.getTime() + i * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      })),
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        weekly: "true",
        weekStart: weekStart.toISOString(),
        noPagination: "true",
      })
      .expect(200)
      .then((res) => {
        expect(res.body.lessons).toBeInstanceOf(Array);
        expect(res.body.pagination).toBeUndefined();
      });
  });

  it("supports upcoming and status filters", async () => {
    const now = new Date();
    // create lessons: one IN_PROGRESS, one SCHEDULED in future, one COMPLETED
    const inProgress = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(now.getTime() - 10 * 60 * 1000),
        endTime: new Date(now.getTime() + 50 * 60 * 1000),
        isRecurring: false,
        status: "IN_PROGRESS",
      },
    });

    const scheduledFuture = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(now.getTime() + 24 * 3600 * 1000),
        endTime: new Date(now.getTime() + 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    const completed = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
        endTime: new Date(now.getTime() - 7 * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ upcoming: "true", currentTime: now.toISOString() })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(inProgress.id);
        expect(ids).toContain(scheduledFuture.id);
        expect(ids).not.toContain(completed.id);
      });

    // status filter
    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ status: "COMPLETED" })
      .expect(200)
      .then((res) => {
        const statuses = res.body.lessons.map((l: any) => l.status);
        expect(statuses.every((s: string) => s === "COMPLETED")).toBe(true);
      });
  });

  it("filters by startDate and endDate", async () => {
    const localStudent = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });
    const sid = localStudent.id;

    const d1 = new Date(Date.now() + 1 * 24 * 3600 * 1000);
    d1.setSeconds(0, 0);
    const d2 = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    d2.setSeconds(0, 0);
    const d3 = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    d3.setSeconds(0, 0);

    const L1 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: sid,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: d1,
        endTime: new Date(d1.getTime() + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const L2 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: sid,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: d2,
        endTime: new Date(d2.getTime() + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const L3 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: sid,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: d3,
        endTime: new Date(d3.getTime() + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        studentId: sid,
        startDate: d2.toISOString(),
        endDate: d3.toISOString(),
        page: "1",
        limit: "10",
      })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(L2.id);
        expect(ids).toContain(L3.id);
        expect(ids).not.toContain(L1.id);
      });

    await prisma.lesson.deleteMany({ where: { studentId: sid } });
    await prisma.student.delete({ where: { id: sid } });
  });

  it("supports multi-status filter (comma separated)", async () => {
    const a = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const b = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ status: "SCHEDULED,COMPLETED" })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(a.id);
        expect(ids).toContain(b.id);
      });
  });

  it("paginates results with page and limit", async () => {
    // create 7 lessons
    const created = [] as any[];
    for (let i = 0; i < 7; i++) {
      const l = await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + i * 1000),
          endTime: new Date(Date.now() + i * 1000 + 3600000),
          isRecurring: false,
          status: "SCHEDULED",
        },
      });
      created.push(l);
    }

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ page: "2", limit: "3" })
      .expect(200)
      .then((res) => {
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(2);
        expect(res.body.pagination.limit).toBe(3);
        expect(res.body.pagination.total).toBeGreaterThanOrEqual(7);
        expect(res.body.lessons.length).toBeLessThanOrEqual(3);
      });
  });

  it("onlyUnpaid excludes lessons with price 0", async () => {
    const paidZero = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 0,
        status: "SCHEDULED",
      },
    });
    const paidNonZero = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 500,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ onlyUnpaid: "true" })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(paidNonZero.id);
        expect(ids).not.toContain(paidZero.id);
      });
  });

  it("orders ascending when upcoming=true", async () => {
    const now = new Date();
    const t1 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(now.getTime() + 10000),
        endTime: new Date(now.getTime() + 10000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const t2 = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(now.getTime() + 20000),
        endTime: new Date(now.getTime() + 20000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ upcoming: "true", currentTime: now.toISOString() })
      .expect(200)
      .then((res) => {
        const starts = res.body.lessons.map((l: any) =>
          new Date(l.startTime).getTime()
        );
        // ensure ascending
        for (let i = 1; i < starts.length; i++)
          expect(starts[i]).toBeGreaterThanOrEqual(starts[i - 1]);
      });
  });

  it("weekly ignores status query param", async () => {
    const ws = new Date();
    const a = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: ws,
        endTime: new Date(ws.getTime() + 3600000),
        isRecurring: false,
        status: "COMPLETED",
      },
    });
    // request weekly=true with status=COMPLETED but weekly should not apply status filter
    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        weekly: "true",
        weekStart: ws.toISOString(),
        status: "SCHEDULED",
      })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(a.id);
      });
  });

  it("weekly orders ascending and includes student relation", async () => {
    const localStudent = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });
    const weekStart = new Date();
    weekStart.setSeconds(0, 0);

    // create lessons inside the week for the local student
    const Ls = [] as any[];
    for (let i = 0; i < 3; i++) {
      const st = new Date(weekStart.getTime() + i * 2 * 3600 * 1000);
      st.setSeconds(0, 0);
      const l = await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId: localStudent.id,
          subject: "PHYSICS",
          lessonType: "SCHOOL",
          startTime: st,
          endTime: new Date(st.getTime() + 3600000),
          isRecurring: false,
          status: "SCHEDULED",
        },
      });
      Ls.push(l);
    }

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ weekly: "true", weekStart: weekStart.toISOString() })
      .expect(200)
      .then((res) => {
        const lessons = res.body.lessons as any[];
        expect(lessons.length).toBeGreaterThanOrEqual(3);
        const starts = lessons.map((l) => new Date(l.startTime).getTime());
        for (let i = 1; i < starts.length; i++)
          expect(starts[i]).toBeGreaterThanOrEqual(starts[i - 1]);
        // ensure student relation is present and matches
        const found = lessons.find(
          (l) => l.student && l.student.id === localStudent.id
        );
        expect(found).toBeDefined();
      });
  });

  it("noPagination true without weekly disables pagination", async () => {
    // create a few lessons
    for (let i = 0; i < 4; i++) {
      await prisma.lesson.create({
        data: {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + i * 60000),
          endTime: new Date(Date.now() + i * 60000 + 3600000),
          isRecurring: false,
          status: "SCHEDULED",
        },
      });
    }

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ noPagination: "true" })
      .expect(200)
      .then((res) => {
        expect(res.body.lessons).toBeInstanceOf(Array);
        expect(res.body.pagination).toBeUndefined();
      });
  });

  it("weekly ignores upcoming query param", async () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const ws = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    ws.setSeconds(0, 0);

    // create a completed lesson earlier than currentTime
    const old = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
        endTime: new Date(now.getTime() - 5 * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        weekly: "true",
        weekStart: ws.toISOString(),
        upcoming: "true",
        currentTime: now.toISOString(),
      })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(old.id);
      });
  });

  it("non-weekly non-upcoming returns descending order by default", async () => {
    // create three lessons with different times
    const a = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() - 30000),
        endTime: new Date(Date.now() - 30000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const b = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() - 20000),
        endTime: new Date(Date.now() - 20000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });
    const c = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() - 10000),
        endTime: new Date(Date.now() - 10000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        const starts = res.body.lessons.map((l: any) =>
          new Date(l.startTime).getTime()
        );
        // verify descending order by default for non-upcoming
        for (let i = 1; i < starts.length; i++)
          expect(starts[i]).toBeLessThanOrEqual(starts[i - 1]);
      });
  });

  it("upcoming=true without currentTime is ignored and behaves as status filter absent", async () => {
    // ensure upcoming=true without currentTime does nothing special
    const now = new Date();
    const fut = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
        endTime: new Date(now.getTime() + 2 * 24 * 3600 * 1000 + 3600000),
        isRecurring: false,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ upcoming: "true" })
      .expect(200)
      .then((res) => {
        // should return array and not throw
        expect(res.body.lessons).toBeInstanceOf(Array);
      });
  });

  it("onlyUnpaid true excludes lessons where isPaid = true", async () => {
    const paid = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 100,
        status: "SCHEDULED",
      },
    });
    const unpaid = await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 100,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/lessons`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ onlyUnpaid: "true" })
      .expect(200)
      .then((res) => {
        const ids = res.body.lessons.map((l: any) => l.id);
        expect(ids).toContain(unpaid.id);
        expect(ids).not.toContain(paid.id);
      });
  });
});
