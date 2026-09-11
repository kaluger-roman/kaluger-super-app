import type { PrismaClient } from "@prisma/client";
import {
  buildRecurringSlots,
  checkSchedulingConflicts,
  computeLessonStatus,
} from "../lessonCreation";

describe("computeLessonStatus", () => {
  const now = new Date("2026-03-10T12:00:00Z");

  it("should return COMPLETED when the lesson already ended", () => {
    expect(
      computeLessonStatus(
        new Date("2026-03-10T10:00:00Z"),
        new Date("2026-03-10T11:00:00Z"),
        now,
      ),
    ).toBe("COMPLETED");
  });

  it("should return COMPLETED when the lesson ends exactly now", () => {
    expect(
      computeLessonStatus(new Date("2026-03-10T11:00:00Z"), now, now),
    ).toBe("COMPLETED");
  });

  it("should return IN_PROGRESS when now is inside the lesson", () => {
    expect(
      computeLessonStatus(
        new Date("2026-03-10T11:30:00Z"),
        new Date("2026-03-10T12:30:00Z"),
        now,
      ),
    ).toBe("IN_PROGRESS");
  });

  it("should return undefined for a future lesson", () => {
    expect(
      computeLessonStatus(
        new Date("2026-03-10T13:00:00Z"),
        new Date("2026-03-10T14:00:00Z"),
        now,
      ),
    ).toBeUndefined();
  });
});

describe("buildRecurringSlots", () => {
  const start = new Date("2026-01-05T10:00:00Z");
  const end = new Date("2026-01-05T11:00:00Z");

  it("should produce weekly slots covering three months from the start", () => {
    const slots = buildRecurringSlots(start, end);
    const horizon = new Date(start);
    horizon.setMonth(horizon.getMonth() + 3);

    expect(slots.length).toBeGreaterThanOrEqual(13);
    expect(slots[0].start.getTime()).toBe(start.getTime());
    expect(slots[slots.length - 1].start.getTime()).toBeLessThanOrEqual(
      horizon.getTime(),
    );
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start.getTime() - slots[i - 1].start.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
    }
  });

  it("should keep the lesson duration for every slot", () => {
    for (const slot of buildRecurringSlots(start, end)) {
      expect(slot.end.getTime() - slot.start.getTime()).toBe(60 * 60 * 1000);
    }
  });

  it("should mark only the first slot as isFirst", () => {
    const slots = buildRecurringSlots(start, end);
    expect(slots[0].isFirst).toBe(true);
    expect(slots.slice(1).every((slot) => !slot.isFirst)).toBe(true);
  });

  it("should truncate seconds and milliseconds in every slot", () => {
    const slots = buildRecurringSlots(
      new Date("2026-01-05T10:00:45.500Z"),
      new Date("2026-01-05T11:00:30.250Z"),
    );
    for (const slot of slots) {
      expect(slot.start.getUTCSeconds()).toBe(0);
      expect(slot.start.getUTCMilliseconds()).toBe(0);
      expect(slot.end.getUTCSeconds()).toBe(0);
    }
  });
});

describe("checkSchedulingConflicts", () => {
  let mockPrisma: { lesson: { findMany: jest.Mock } };

  beforeEach(() => {
    mockPrisma = { lesson: { findMany: jest.fn() } };
  });

  it("should query overlapping non-cancelled lessons of the tutor and return them", async () => {
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
      mockPrisma as unknown as PrismaClient,
    );

    expect(mockPrisma.lesson.findMany).toHaveBeenCalledTimes(1);
    const { where } = mockPrisma.lesson.findMany.mock.calls[0][0];
    expect(where.tutorId).toBe(userId);
    expect(where.status).toEqual({ not: "CANCELLED" });
    expect(where.OR[0].startTime).toEqual({ lt: endTime });
    expect(where.OR[0].endTime).toEqual({ gt: startTime });
    expect(res).toBe(expectedResults);
  });

  it("should return an empty array when there are no conflicts", async () => {
    mockPrisma.lesson.findMany.mockResolvedValue([]);

    const res = await checkSchedulingConflicts(
      "tutor-2",
      new Date("2025-01-05T10:00:00Z"),
      new Date("2025-01-05T11:00:00Z"),
      mockPrisma as unknown as PrismaClient,
    );

    expect(res).toEqual([]);
  });
});
