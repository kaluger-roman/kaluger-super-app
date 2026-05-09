import {
  truncateToMinute,
  startOfMonthInTimezone,
  endOfMonthInTimezone,
  getCurrentMonthRange,
  getLastMonthBounds,
  isValidTimezone,
} from "../time";

describe("truncateToMinute", () => {
  it("should zero seconds and milliseconds", () => {
    const date = new Date("2025-12-17T12:34:56.789Z");
    const res = truncateToMinute(date);
    expect(res.getUTCSeconds()).toBe(0);
    expect(res.getUTCMilliseconds()).toBe(0);
    // Minutes, hours, day should stay the same
    expect(res.getUTCMinutes()).toBe(34);
    expect(res.getUTCHours()).toBe(12);
  });

  it("should not mutate the original date object", () => {
    const original = new Date("2025-12-17T01:02:03.004Z");
    const copy = new Date(original);
    const res = truncateToMinute(original);
    expect(original.getUTCSeconds()).toBe(copy.getUTCSeconds());
    expect(original.getUTCMilliseconds()).toBe(copy.getUTCMilliseconds());
    // result should have seconds zeroed
    expect(res.getUTCSeconds()).toBe(0);
  });
});

describe("startOfMonthInTimezone", () => {
  it("should return midnight on 1st of month in Moscow timezone as UTC", () => {
    // March 2026, Moscow (UTC+3): midnight March 1 = Feb 28 21:00 UTC
    const result = startOfMonthInTimezone(2026, 2, "Europe/Moscow");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // February in UTC
    expect(result.getUTCDate()).toBe(28);
    expect(result.getUTCHours()).toBe(21);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("should return midnight on 1st for UTC timezone", () => {
    const result = startOfMonthInTimezone(2026, 0, "UTC");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(0);
  });
});

describe("endOfMonthInTimezone", () => {
  it("should return 23:59:59.999 on last day of month in Moscow timezone as UTC", () => {
    // March 2026, Moscow (UTC+3): 23:59:59 March 31 = March 31 20:59:59 UTC
    const result = endOfMonthInTimezone(2026, 2, "Europe/Moscow");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(2); // March in UTC
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCHours()).toBe(20);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
  });

  it("should handle February correctly", () => {
    // Feb 2026 has 28 days. UTC: end = Feb 28 23:59:59 UTC
    const result = endOfMonthInTimezone(2026, 1, "UTC");
    expect(result.getUTCDate()).toBe(28);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
  });
});

describe("getCurrentMonthRange", () => {
  it("should return UTC boundaries when no timezone provided", () => {
    const { gte, lte } = getCurrentMonthRange();
    const now = new Date();

    expect(gte.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(gte.getUTCMonth()).toBe(now.getUTCMonth());
    expect(gte.getUTCDate()).toBe(1);
    expect(gte.getUTCHours()).toBe(0);

    expect(lte.getUTCMonth()).toBe(now.getUTCMonth());
    expect(lte.getUTCHours()).toBe(23);
    expect(lte.getUTCMinutes()).toBe(59);
  });

  it("should return timezone-adjusted boundaries when timezone provided", () => {
    const { gte, lte } = getCurrentMonthRange("Europe/Moscow");

    // Start should be before UTC midnight (offset by 3 hours)
    expect(gte instanceof Date).toBe(true);
    expect(lte instanceof Date).toBe(true);
    expect(lte.getTime()).toBeGreaterThan(gte.getTime());
  });
});

describe("isValidTimezone", () => {
  it("should accept valid IANA timezones", () => {
    expect(isValidTimezone("Europe/Moscow")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Asia/Tokyo")).toBe(true);
  });

  it("should reject invalid timezones without throwing", () => {
    expect(isValidTimezone("INVALID/TZ")).toBe(false);
    expect(isValidTimezone("Not/A/Timezone")).toBe(false);
    expect(isValidTimezone("nonsense")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});

describe("getLastMonthBounds", () => {
  it("should return UTC boundaries for previous month when no timezone", () => {
    const { gte, lte } = getLastMonthBounds();
    const now = new Date();
    const expectedMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;

    expect(gte.getUTCMonth()).toBe(expectedMonth);
    expect(gte.getUTCDate()).toBe(1);
  });

  it("should return timezone-adjusted boundaries for previous month", () => {
    const { gte, lte } = getLastMonthBounds("Europe/Moscow");

    expect(gte instanceof Date).toBe(true);
    expect(lte instanceof Date).toBe(true);
    expect(lte.getTime()).toBeGreaterThan(gte.getTime());
  });
});
