import {
  validateLessonData,
  checkSchedulingConflicts,
} from "../../lessons/validators";
import { truncateToMinute } from "../../../utils/time";
import type { PrismaClient } from "@prisma/client";

type CreateLessonDto = {
  subject?: string;
  lessonType?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  studentId?: string;
  price?: number;
};

describe("validateLessonData", () => {
  it("returns error when required fields are missing", () => {
    const data: CreateLessonDto = {};
    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(
      "Предмет, тип урока, время начала, время окончания и ID студента обязательны"
    );
  });

  it("returns error when endTime is not after startTime", () => {
    const start = new Date("2025-01-01T10:00:30Z");
    const end = new Date("2025-01-01T10:00:40Z");
    // truncateToMinute will make them equal (both to 10:00)
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      studentId: "s1",
    };

    // Ensure truncateToMinute behavior assumed
    expect(truncateToMinute(start).getTime()).toBe(
      truncateToMinute(end).getTime()
    );

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Время окончания должно быть позже времени начала");
  });

  it("returns error when price is negative", () => {
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
      price: -100,
    };

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Цена должна быть положительной");
  });

  it("returns valid for correct data", () => {
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
      price: 100,
    };

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(true);
    expect(res).not.toHaveProperty("error");
  });

  it("allows price 0 and omitted price (treated as valid)", () => {
    const base = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
    };

    const withZeroPrice = validateLessonData({ ...base, price: 0 } as any);
    expect(withZeroPrice.isValid).toBe(true);

    const withoutPrice = validateLessonData(base as any);
    expect(withoutPrice.isValid).toBe(true);
  });
});

describe("checkSchedulingConflicts", () => {
  let mockPrisma: Partial<PrismaClient> & {
    lesson: { findMany: jest.Mock };
  };

  beforeEach(() => {
    mockPrisma = {
      lesson: {
        findMany: jest.fn(),
      },
    } as any;
  });

  it("calls prisma.findMany with correct where clause and returns results", async () => {
    const userId = "tutor-1";
    const startTime = new Date("2025-01-01T10:00:00Z");
    const endTime = new Date("2025-01-01T11:00:00Z");

    const expectedResults = [
      { id: "l1", tutorId: userId, startTime, endTime, status: "SCHEDULED" },
    ];

    mockPrisma.lesson.findMany.mockResolvedValue(expectedResults);

    const res = await checkSchedulingConflicts(
      userId,
      startTime,
      endTime,
      mockPrisma as unknown as PrismaClient
    );

    expect(mockPrisma.lesson.findMany).toHaveBeenCalledTimes(1);

    const calledWith = mockPrisma.lesson.findMany.mock.calls[0][0];
    expect(calledWith).toHaveProperty("where");
    const where = calledWith.where;
    expect(where.tutorId).toBe(userId);
    expect(where.status).toEqual({ not: "CANCELLED" });
    expect(where.OR).toBeInstanceOf(Array);

    // Validate the OR clause shape
    expect(where.OR[0]).toHaveProperty("startTime");
    expect(where.OR[0]).toHaveProperty("endTime");
    expect(where.OR[0].startTime).toEqual({ lt: endTime });
    expect(where.OR[0].endTime).toEqual({ gt: startTime });

    expect(res).toBe(expectedResults);
  });

  it("returns empty array when there are no conflicts", async () => {
    const userId = "tutor-2";
    const startTime = new Date("2025-01-05T10:00:00Z");
    const endTime = new Date("2025-01-05T11:00:00Z");

    mockPrisma.lesson.findMany.mockResolvedValue([]);

    const res = await checkSchedulingConflicts(
      userId,
      startTime,
      endTime,
      mockPrisma as unknown as PrismaClient
    );
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledTimes(1);
    expect(res).toEqual([]);
  });
});
