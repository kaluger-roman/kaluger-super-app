import prisma from "../../lib/prisma";
import { getWebSocketManager } from "../../lib/wsManager";
import { updateLessonStatuses } from "../lessonStatusUpdater";
import { truncateToMinute } from "../../utils/time";

jest.mock("../../lib/wsManager");

describe("updateLessonStatuses", () => {
  const mockedGetWs = getWebSocketManager as jest.MockedFunction<
    typeof getWebSocketManager
  >;

  let createdUserIds: string[] = [];

  beforeAll(async () => {
    // Ensure DB connection is ready
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up lessons, students and users created during tests
    if (createdUserIds.length > 0) {
      await prisma.lesson.deleteMany({
        where: { tutorId: { in: createdUserIds } },
      });
      await prisma.student.deleteMany({
        where: { tutorId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds = [];
    }
    jest.clearAllMocks();
  });

  it("should move SCHEDULED lesson to IN_PROGRESS and broadcast", async () => {
    const now = truncateToMinute(new Date());

    // Create test user and student
    const user = await prisma.user.create({
      data: {
        email: `test+inprogress+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student One",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000000${Math.floor(Math.random() * 10000)}`,
      },
    });

    // Create lesson that should be IN_PROGRESS
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        status: "SCHEDULED",
        startTime: new Date(now.getTime() - 1 * 60 * 1000),
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    const result = await updateLessonStatuses();

    expect(result.startedLessons).toBeGreaterThanOrEqual(1);

    const updated = await prisma.lesson.findUnique({
      where: { id: lesson.id },
    });
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe("IN_PROGRESS");

    expect(broadcastMock).toHaveBeenCalledWith(
      lesson.id,
      "IN_PROGRESS",
      lesson.tutorId
    );
  });

  it("should move IN_PROGRESS and SCHEDULED lessons with endTime <= now to COMPLETED and broadcast", async () => {
    const now = truncateToMinute(new Date());

    // Create test user and student
    const user = await prisma.user.create({
      data: {
        email: `test+completed+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student1 = await prisma.student.create({
      data: {
        name: "Student Two",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000001${Math.floor(Math.random() * 10000)}`,
      },
    });

    const student2 = await prisma.student.create({
      data: {
        name: "Student Three",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000002${Math.floor(Math.random() * 10000)}`,
      },
    });

    // Lesson that was IN_PROGRESS and ended
    const lesson1 = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student1.id,
        subject: "PHYSICS",
        lessonType: "EGE",
        status: "IN_PROGRESS",
        startTime: new Date(now.getTime() - 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 60 * 1000),
      },
    });

    // Lesson that was SCHEDULED but ended
    const lesson2 = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student2.id,
        subject: "PHYSICS",
        lessonType: "EGE",
        status: "SCHEDULED",
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 30 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    const result = await updateLessonStatuses();

    expect(result.completedLessons).toBeGreaterThanOrEqual(2);

    const updated1 = await prisma.lesson.findUnique({
      where: { id: lesson1.id },
    });
    const updated2 = await prisma.lesson.findUnique({
      where: { id: lesson2.id },
    });

    expect(updated1!.status).toBe("COMPLETED");
    expect(updated2!.status).toBe("COMPLETED");

    expect(broadcastMock).toHaveBeenCalled();
    // Ensure both lesson ids were broadcasted as COMPLETED
    expect(broadcastMock).toHaveBeenCalledWith(
      lesson1.id,
      "COMPLETED",
      lesson1.tutorId
    );
    expect(broadcastMock).toHaveBeenCalledWith(
      lesson2.id,
      "COMPLETED",
      lesson2.tutorId
    );
  });

  it("should move RESCHEDULED lesson to IN_PROGRESS and broadcast", async () => {
    const now = truncateToMinute(new Date());

    const user = await prisma.user.create({
      data: {
        email: `test+reschedule+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student Res",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000003${Math.floor(Math.random() * 10000)}`,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        status: "RESCHEDULED",
        startTime: new Date(now.getTime() - 1 * 60 * 1000),
        endTime: new Date(now.getTime() + 20 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    const result = await updateLessonStatuses();

    expect(result.startedLessons).toBeGreaterThanOrEqual(1);

    const updated = await prisma.lesson.findUnique({
      where: { id: lesson.id },
    });
    expect(updated!.status).toBe("IN_PROGRESS");
    expect(broadcastMock).toHaveBeenCalledWith(
      lesson.id,
      "IN_PROGRESS",
      lesson.tutorId
    );
  });

  it("should move RESCHEDULED lesson with endTime <= now to COMPLETED and broadcast", async () => {
    const now = truncateToMinute(new Date());

    const user = await prisma.user.create({
      data: {
        email: `test+reschedule2+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student Res2",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000004${Math.floor(Math.random() * 10000)}`,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        status: "RESCHEDULED",
        startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    const result = await updateLessonStatuses();

    expect(result.completedLessons).toBeGreaterThanOrEqual(1);

    const updated = await prisma.lesson.findUnique({
      where: { id: lesson.id },
    });
    expect(updated!.status).toBe("COMPLETED");
    expect(broadcastMock).toHaveBeenCalledWith(
      lesson.id,
      "COMPLETED",
      lesson.tutorId
    );
  });

  it("should not change CANCELLED or COMPLETED lessons", async () => {
    const now = truncateToMinute(new Date());

    const user = await prisma.user.create({
      data: {
        email: `test+nochange+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student NoChange",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000005${Math.floor(Math.random() * 10000)}`,
      },
    });

    const cancelled = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        status: "CANCELLED",
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 60 * 1000),
      },
    });

    const completed = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        status: "COMPLETED",
        startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    const result = await updateLessonStatuses();

    // completedLessons and startedLessons should not count these
    const updatedCancelled = await prisma.lesson.findUnique({
      where: { id: cancelled.id },
    });
    const updatedCompleted = await prisma.lesson.findUnique({
      where: { id: completed.id },
    });

    expect(updatedCancelled!.status).toBe("CANCELLED");
    expect(updatedCompleted!.status).toBe("COMPLETED");
    // No broadcasts for these
    expect(broadcastMock).not.toHaveBeenCalledWith(
      cancelled.id,
      expect.anything(),
      expect.anything()
    );
    expect(broadcastMock).not.toHaveBeenCalledWith(
      completed.id,
      expect.anything(),
      expect.anything()
    );
  });

  it("should not overwrite CANCELLED status set between findMany and update (regression: TOCTOU race)", async () => {
    const now = truncateToMinute(new Date());

    const user = await prisma.user.create({
      data: {
        email: `test+toctou+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student TOCTOU",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000099${Math.floor(Math.random() * 10000)}`,
      },
    });

    // Lesson initially SCHEDULED with start in past, end in future
    const lesson = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        status: "SCHEDULED",
        startTime: new Date(now.getTime() - 1 * 60 * 1000),
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
      },
    });

    const broadcastMock = jest.fn();
    mockedGetWs.mockReturnValue({
      broadcastLessonStatusUpdate: broadcastMock,
    } as any);

    // Simulate user manually cancelling the lesson AFTER findMany but BEFORE updateMany.
    // We hook into updateMany to flip status to CANCELLED right before the update fires.
    const originalUpdateMany = prisma.lesson.updateMany.bind(prisma.lesson);
    const updateManySpy = jest
      .spyOn(prisma.lesson, "updateMany")
      .mockImplementation(((args: any) => {
        const exec = async () => {
          if (args?.where?.id === lesson.id) {
            await prisma.lesson.update({
              where: { id: lesson.id },
              data: { status: "CANCELLED" },
            });
          }
          return originalUpdateMany(args);
        };
        return exec();
      }) as never);

    await updateLessonStatuses();

    updateManySpy.mockRestore();

    const after = await prisma.lesson.findUnique({ where: { id: lesson.id } });
    expect(after!.status).toBe("CANCELLED");

    // No broadcast should be sent when conditional update was skipped
    expect(broadcastMock).not.toHaveBeenCalledWith(
      lesson.id,
      "IN_PROGRESS",
      lesson.tutorId
    );
  });

  it("should work when WebSocket manager is not present (no broadcast)", async () => {
    const now = truncateToMinute(new Date());

    const user = await prisma.user.create({
      data: {
        email: `test+noweb+${Date.now()}@example.com`,
        password: "test",
        name: "Test User",
      },
    });
    createdUserIds.push(user.id);

    const student = await prisma.student.create({
      data: {
        name: "Student NoWS",
        tutorId: user.id,
        contactMethod: "WHATSAPP",
        phone: `+7000006${Math.floor(Math.random() * 10000)}`,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        tutorId: user.id,
        studentId: student.id,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        status: "SCHEDULED",
        startTime: new Date(now.getTime() - 1 * 60 * 1000),
        endTime: new Date(now.getTime() + 20 * 60 * 1000),
      },
    });

    // Simulate no WS manager
    mockedGetWs.mockReturnValue(undefined as any);

    const result = await updateLessonStatuses();

    const updated = await prisma.lesson.findUnique({
      where: { id: lesson.id },
    });
    expect(updated!.status).toBe("IN_PROGRESS");
  });
});
