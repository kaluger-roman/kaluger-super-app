import { describe, it, expect } from "vitest";

import {
  getScheduleDateRangeParams,
  createPagedLessonParams,
  createWeeklyLessonParams,
} from "../lessons-page-loader.helpers";

describe("getScheduleDateRangeParams", () => {
  it("should return date range 15 days before and after current date", () => {
    const result = getScheduleDateRangeParams();

    expect(result.noPagination).toBe("true");
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();

    const startDate = new Date(result.startDate);
    const endDate = new Date(result.endDate);
    const now = new Date();

    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBe(30);

    expect(startDate.getTime()).toBeLessThan(now.getTime());
    expect(endDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should return ISO string dates", () => {
    const result = getScheduleDateRangeParams();

    expect(() => new Date(result.startDate)).not.toThrow();
    expect(() => new Date(result.endDate)).not.toThrow();
  });
});

describe("createPagedLessonParams", () => {
  it("should create params with default pagination", () => {
    const result = createPagedLessonParams({
      onlyUnpaid: false,
      onlyWithoutHomework: false,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.onlyUnpaid).toBe(false);
    expect(result.onlyWithoutHomework).toBe(false);
  });

  it("should create params with onlyUnpaid filter", () => {
    const result = createPagedLessonParams({
      onlyUnpaid: true,
      onlyWithoutHomework: false,
    });

    expect(result.onlyUnpaid).toBe(true);
    expect(result.onlyWithoutHomework).toBe(false);
  });

  it("should create params with onlyWithoutHomework filter", () => {
    const result = createPagedLessonParams({
      onlyUnpaid: false,
      onlyWithoutHomework: true,
    });

    expect(result.onlyUnpaid).toBe(false);
    expect(result.onlyWithoutHomework).toBe(true);
  });

  it("should create params with both filters", () => {
    const result = createPagedLessonParams({
      onlyUnpaid: true,
      onlyWithoutHomework: true,
    });

    expect(result.onlyUnpaid).toBe(true);
    expect(result.onlyWithoutHomework).toBe(true);
  });
});

describe("createWeeklyLessonParams", () => {
  it("should create weekly params with current week", () => {
    const currentWeek = new Date("2026-01-15T00:00:00.000Z");

    const result = createWeeklyLessonParams({
      currentWeek,
      onlyUnpaid: false,
      onlyWithoutHomework: false,
    });

    expect(result.weekStart).toBe(currentWeek.toISOString());
    expect(result.onlyUnpaid).toBe(false);
    expect(result.onlyWithoutHomework).toBe(false);
  });

  it("should create params with filters", () => {
    const currentWeek = new Date("2026-01-15T00:00:00.000Z");

    const result = createWeeklyLessonParams({
      currentWeek,
      onlyUnpaid: true,
      onlyWithoutHomework: true,
    });

    expect(result.weekStart).toBe(currentWeek.toISOString());
    expect(result.onlyUnpaid).toBe(true);
    expect(result.onlyWithoutHomework).toBe(true);
  });

  it("should convert week start to ISO string", () => {
    const currentWeek = new Date("2026-01-20T10:30:45.123Z");

    const result = createWeeklyLessonParams({
      currentWeek,
      onlyUnpaid: false,
      onlyWithoutHomework: false,
    });

    expect(result.weekStart).toBe(currentWeek.toISOString());
    expect(() => new Date(result.weekStart)).not.toThrow();
  });
});
