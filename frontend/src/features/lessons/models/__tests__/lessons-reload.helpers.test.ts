import { describe, it, expect } from "vitest";

import { getScheduleDateRange } from "../lessons-reload.helpers";

describe("getScheduleDateRange", () => {
  it("should return date range 15 days before and after current date", () => {
    const result = getScheduleDateRange();

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
    const result = getScheduleDateRange();

    expect(() => new Date(result.startDate)).not.toThrow();
    expect(() => new Date(result.endDate)).not.toThrow();
  });

  it("should return noPagination as const string", () => {
    const result = getScheduleDateRange();

    expect(result.noPagination).toBe("true");
  });
});
