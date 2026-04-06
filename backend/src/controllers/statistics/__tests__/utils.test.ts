import {
  getDateRange,
  getLastMonthRange,
  buildStatisticsWhere,
} from "../utils";

describe("statistics utils", () => {
  beforeAll(() => {
    const fixed = new Date("2025-12-15T12:34:56.789Z");
    // @ts-ignore
    jest.useFakeTimers("modern");
    // @ts-ignore
    jest.setSystemTime(fixed);
  });

  afterAll(() => {
    // @ts-ignore
    jest.useRealTimers();
  });

  it("getDateRange returns current month in UTC when no dates and no timezone provided", () => {
    const { gte, lte } = getDateRange();

    expect(gte.getUTCFullYear()).toBe(2025);
    expect(gte.getUTCMonth()).toBe(11);
    expect(gte.getUTCDate()).toBe(1);
    expect(gte.getUTCHours()).toBe(0);

    expect(lte.getUTCFullYear()).toBe(2025);
    expect(lte.getUTCMonth()).toBe(11);
    expect(lte.getUTCDate()).toBe(31);
    expect(lte.getUTCHours()).toBe(23);
    expect(lte.getUTCMinutes()).toBe(59);
    expect(lte.getUTCSeconds()).toBe(59);
    expect(lte.getUTCMilliseconds()).toBe(999);
  });

  it("getDateRange returns timezone-adjusted month boundaries when timezone provided", () => {
    // Frozen: 2025-12-15T12:34:56.789Z
    // In Europe/Moscow (UTC+3): 2025-12-15 15:34 — still December
    const { gte, lte } = getDateRange(undefined, undefined, "Europe/Moscow");

    // Start: Dec 1 00:00 Moscow = Nov 30 21:00 UTC
    expect(gte.toISOString()).toBe("2025-11-30T21:00:00.000Z");
    // End: Dec 31 23:59:59.999 Moscow = Dec 31 20:59:59.999 UTC
    expect(lte.toISOString()).toBe("2025-12-31T20:59:59.999Z");
  });

  it("getDateRange parses ISO startDate and falls back to current month end", () => {
    const { gte, lte } = getDateRange("2025-11-04T21:00:00.000Z");

    expect(gte.getUTCFullYear()).toBe(2025);
    expect(gte.getUTCMonth()).toBe(10);
    expect(gte.getUTCDate()).toBe(4);
    expect(gte.getUTCHours()).toBe(21);

    expect(lte.getUTCMonth()).toBe(11);
    expect(lte.getUTCDate()).toBe(31);
  });

  it("getDateRange parses ISO endDate and falls back to current month start", () => {
    const { gte, lte } = getDateRange(undefined, "2025-10-03T20:59:59.999Z");

    expect(gte.getUTCMonth()).toBe(11);
    expect(gte.getUTCDate()).toBe(1);

    expect(lte.getUTCFullYear()).toBe(2025);
    expect(lte.getUTCMonth()).toBe(9);
    expect(lte.getUTCDate()).toBe(3);
    expect(lte.getUTCHours()).toBe(20);
    expect(lte.getUTCMinutes()).toBe(59);
    expect(lte.getUTCSeconds()).toBe(59);
    expect(lte.getUTCMilliseconds()).toBe(999);
  });

  it("getDateRange with both ISO startDate and endDate returns exact boundaries", () => {
    const { gte, lte } = getDateRange(
      "2025-01-01T21:00:00.000Z",
      "2025-01-05T20:59:59.999Z"
    );

    expect(gte.getUTCFullYear()).toBe(2025);
    expect(gte.getUTCMonth()).toBe(0);
    expect(gte.getUTCDate()).toBe(1);
    expect(gte.getUTCHours()).toBe(21);

    expect(lte.getUTCFullYear()).toBe(2025);
    expect(lte.getUTCMonth()).toBe(0);
    expect(lte.getUTCDate()).toBe(5);
    expect(lte.getUTCHours()).toBe(20);
    expect(lte.getUTCMinutes()).toBe(59);
  });

  it("getLastMonthRange returns UTC boundaries when no timezone", () => {
    const { gte, lte } = getLastMonthRange();

    expect(gte.getUTCFullYear()).toBe(2025);
    expect(gte.getUTCMonth()).toBe(10);
    expect(gte.getUTCDate()).toBe(1);
    expect(gte.getUTCHours()).toBe(0);
    expect(gte.getUTCMinutes()).toBe(0);
    expect(gte.getUTCSeconds()).toBe(0);

    expect(lte.getUTCFullYear()).toBe(2025);
    expect(lte.getUTCMonth()).toBe(10);
    expect(lte.getUTCDate()).toBe(30);
    expect(lte.getUTCHours()).toBe(23);
    expect(lte.getUTCMinutes()).toBe(59);
    expect(lte.getUTCSeconds()).toBe(59);
    expect(lte.getUTCMilliseconds()).toBe(999);
  });

  it("getLastMonthRange returns timezone-adjusted boundaries for Europe/Moscow", () => {
    // Frozen: 2025-12-15 UTC → December in Moscow too
    // Last month in Moscow = November
    const { gte, lte } = getLastMonthRange("Europe/Moscow");

    // Nov 1 00:00 Moscow = Oct 31 21:00 UTC
    expect(gte.toISOString()).toBe("2025-10-31T21:00:00.000Z");
    // Nov 30 23:59:59.999 Moscow = Nov 30 20:59:59.999 UTC
    expect(lte.toISOString()).toBe("2025-11-30T20:59:59.999Z");
  });

  it("buildStatisticsWhere builds where object with tutorId and startTime range", () => {
    const where = buildStatisticsWhere(
      "user-123",
      "2025-01-31T21:00:00.000Z",
      "2025-02-09T20:59:59.999Z"
    );

    expect(where).toHaveProperty("tutorId", "user-123");
    expect(where).toHaveProperty("startTime");
    expect(where.startTime).toHaveProperty("gte");
    expect(where.startTime).toHaveProperty("lte");

    expect(where.startTime.gte.getUTCFullYear()).toBe(2025);
    expect(where.startTime.gte.getUTCMonth()).toBe(0);
    expect(where.startTime.gte.getUTCDate()).toBe(31);
    expect(where.startTime.gte.getUTCHours()).toBe(21);

    expect(where.startTime.lte.getUTCFullYear()).toBe(2025);
    expect(where.startTime.lte.getUTCMonth()).toBe(1);
    expect(where.startTime.lte.getUTCDate()).toBe(9);
    expect(where.startTime.lte.getUTCHours()).toBe(20);
    expect(where.startTime.lte.getUTCMinutes()).toBe(59);
  });

  it("buildStatisticsWhere passes timezone to fallback", () => {
    const where = buildStatisticsWhere(
      "user-123",
      undefined,
      undefined,
      "Europe/Moscow"
    );

    // Fallback: Dec 2025 in Moscow
    // Start: Dec 1 00:00 Moscow = Nov 30 21:00 UTC
    expect(where.startTime.gte.toISOString()).toBe("2025-11-30T21:00:00.000Z");
    // End: Dec 31 23:59:59.999 Moscow = Dec 31 20:59:59.999 UTC
    expect(where.startTime.lte.toISOString()).toBe(
      "2025-12-31T20:59:59.999Z"
    );
  });
});
