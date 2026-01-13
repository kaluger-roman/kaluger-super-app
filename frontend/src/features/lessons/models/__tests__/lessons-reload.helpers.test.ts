import { describe, it, expect } from "vitest";

import { getScheduleDateRange, extractErrorMessage } from "../lessons-reload.helpers";

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

describe("extractErrorMessage", () => {
  it("should extract error message from response", () => {
    const error = {
      response: {
        data: {
          error: "Custom error message",
        },
      },
    };

    const result = extractErrorMessage(error, "Default message");

    expect(result).toBe("Custom error message");
  });

  it("should return default message when no error in response", () => {
    const error = {
      response: {
        data: {},
      },
    };

    const result = extractErrorMessage(error, "Default message");

    expect(result).toBe("Default message");
  });

  it("should return default message when response is undefined", () => {
    const error = {};

    const result = extractErrorMessage(error, "Default message");

    expect(result).toBe("Default message");
  });

  it("should return default message when error is string", () => {
    const error = "Simple error";

    const result = extractErrorMessage(error, "Default message");

    expect(result).toBe("Default message");
  });

  it("should return default message when error is null", () => {
    const result = extractErrorMessage(null, "Default message");

    expect(result).toBe("Default message");
  });

  it("should return default message when response.data is null", () => {
    const error = {
      response: {
        data: null,
      },
    };

    const result = extractErrorMessage(error, "Default message");

    expect(result).toBe("Default message");
  });
});
