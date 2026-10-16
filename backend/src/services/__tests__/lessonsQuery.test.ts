import { buildLessonsWhere, parseLessonsPagination, parseLessonsQuery } from "../lessonsQuery";

const userId = "tutor-1";

describe("parseLessonsQuery", () => {
  it("should keep only string values of known keys", () => {
    expect(
      parseLessonsQuery({
        status: "SCHEDULED",
        page: "2",
        studentId: ["a", "b"],
        unknown: "x",
        limit: 5,
      })
    ).toEqual({ status: "SCHEDULED", page: "2" });
  });
});

describe("parseLessonsPagination", () => {
  it("should default to page 1 and limit 10", () => {
    expect(parseLessonsPagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("should clamp limit to 100 and page to at least 1", () => {
    expect(parseLessonsPagination({ page: "0", limit: "500" })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
  });

  it("should compute skip from page and limit", () => {
    expect(parseLessonsPagination({ page: "3", limit: "20" })).toEqual({
      page: 3,
      limit: 20,
      skip: 40,
    });
  });

  it("should fall back to defaults on non-numeric input", () => {
    expect(parseLessonsPagination({ page: "abc", limit: "-" })).toEqual({
      page: 1,
      limit: 10,
      skip: 0,
    });
  });
});

describe("buildLessonsWhere", () => {
  it("should scope to the tutor when no filters are given", () => {
    expect(buildLessonsWhere(userId, {})).toEqual({ tutorId: userId });
  });

  it("should build a 7-day window for weekly requests and ignore status", () => {
    const where = buildLessonsWhere(userId, {
      weekly: "true",
      weekStart: "2026-03-09T00:00:00Z",
      status: "COMPLETED",
    });
    expect(where.startTime).toEqual({
      gte: new Date("2026-03-09T00:00:00Z"),
      lte: new Date("2026-03-15T23:59:59.999Z"),
    });
    expect(where.status).toBeUndefined();
  });

  it("should apply startDate/endDate truncated to the minute", () => {
    const where = buildLessonsWhere(userId, {
      startDate: "2026-03-01T10:00:30Z",
      endDate: "2026-03-31T10:00:30Z",
    });
    expect(where.startTime).toEqual({
      gte: new Date("2026-03-01T10:00:00Z"),
      lte: new Date("2026-03-31T10:00:00Z"),
    });
  });

  it("should filter by studentId and missing homework", () => {
    expect(
      buildLessonsWhere(userId, {
        studentId: "student-1",
        onlyWithoutHomework: "true",
      })
    ).toMatchObject({ studentId: "student-1", isHomeworkSentByTeacher: false });
  });

  it("should prefer onlyUnpaid over the payment-date range", () => {
    const where = buildLessonsWhere(userId, {
      onlyUnpaid: "true",
      paymentDateFrom: "2026-03-01T00:00:00Z",
    });
    expect(where).toMatchObject({ isPaid: false, price: { gt: 0 } });
    expect(where.paymentDate).toBeUndefined();
  });

  it("should build a non-null payment-date range", () => {
    expect(
      buildLessonsWhere(userId, {
        paymentDateFrom: "2026-03-01T00:00:00Z",
        paymentDateTo: "2026-03-31T00:00:00Z",
      }).paymentDate
    ).toEqual({
      not: null,
      gte: new Date("2026-03-01T00:00:00Z"),
      lte: new Date("2026-03-31T00:00:00Z"),
    });
  });

  it("should build the upcoming OR-clause when currentTime is provided", () => {
    const where = buildLessonsWhere(userId, {
      upcoming: "true",
      currentTime: "2026-03-10T12:00:30Z",
      status: "COMPLETED",
    });
    expect(where.OR).toEqual([
      { status: "IN_PROGRESS" },
      {
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        startTime: { gte: new Date("2026-03-10T12:00:00Z") },
      },
    ]);
    expect(where.status).toBeUndefined();
  });

  it("should ignore upcoming without currentTime and use status instead", () => {
    const where = buildLessonsWhere(userId, {
      upcoming: "true",
      status: "COMPLETED",
    });
    expect(where.OR).toBeUndefined();
    expect(where.status).toBe("COMPLETED");
  });

  it("should turn a comma-separated status into an IN filter", () => {
    expect(buildLessonsWhere(userId, { status: "SCHEDULED, COMPLETED" }).status).toEqual({
      in: ["SCHEDULED", "COMPLETED"],
    });
  });
});
