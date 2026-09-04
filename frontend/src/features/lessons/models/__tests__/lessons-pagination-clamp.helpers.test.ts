import { describe, it, expect } from "vitest";

import { createLastPageParams, isPageBeyondLastPage } from "../lessons-pagination-clamp.helpers";

describe("lessons-pagination-clamp.helpers — isPageBeyondLastPage", () => {
  it("should return true when the page is beyond the last page", () => {
    expect(isPageBeyondLastPage({ total: 10, page: 2, limit: 10, totalPages: 1 })).toBe(true);
  });

  it("should return false when the page is within range", () => {
    expect(isPageBeyondLastPage({ total: 10, page: 1, limit: 10, totalPages: 1 })).toBe(false);
  });

  it("should return false on the exact last page", () => {
    expect(isPageBeyondLastPage({ total: 25, page: 3, limit: 10, totalPages: 3 })).toBe(false);
  });

  it("should return false when the result set is empty even on a later page", () => {
    expect(isPageBeyondLastPage({ total: 0, page: 2, limit: 10, totalPages: 0 })).toBe(false);
  });
});

describe("lessons-pagination-clamp.helpers — createLastPageParams", () => {
  const filters = {
    onlyUnpaid: false,
    onlyWithoutHomework: true,
    paymentDateFrom: null,
    paymentDateTo: null,
  };

  it("should target the last page and pass through filters and limit", () => {
    expect(
      createLastPageParams(filters, { total: 10, page: 2, limit: 10, totalPages: 1 })
    ).toEqual({
      page: 1,
      limit: 10,
      onlyUnpaid: false,
      onlyWithoutHomework: true,
    });
  });

  it("should omit payment date bounds when they are null", () => {
    const params = createLastPageParams(filters, { total: 10, page: 2, limit: 10, totalPages: 1 });

    expect(params).not.toHaveProperty("paymentDateFrom");
    expect(params).not.toHaveProperty("paymentDateTo");
  });

  it("should include payment date bounds when they are set", () => {
    const params = createLastPageParams(
      { ...filters, paymentDateFrom: new Date("2026-01-01"), paymentDateTo: new Date("2026-02-01") },
      { total: 30, page: 5, limit: 10, totalPages: 3 }
    );

    expect(params.page).toBe(3);
    expect(typeof params.paymentDateFrom).toBe("string");
    expect(typeof params.paymentDateTo).toBe("string");
  });
});
