import { describe, it, expect } from "vitest";

import { getScheduleDateRangeParams } from "../LessonsPage.helpers";

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
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should return noPagination as const string", () => {
    const result = getScheduleDateRangeParams();

    expect(result.noPagination).toBe("true");
  });
});
