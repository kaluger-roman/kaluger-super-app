import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT } from "../callRecord.constants";
import { clampLimit } from "../callRecord.helpers";

describe("clampLimit", () => {
  it("should use the default when no limit is given", () => {
    expect(clampLimit()).toBe(DEFAULT_HISTORY_LIMIT);
  });

  it("should use the default when the limit is zero or negative", () => {
    expect(clampLimit(0)).toBe(DEFAULT_HISTORY_LIMIT);
    expect(clampLimit(-5)).toBe(DEFAULT_HISTORY_LIMIT);
  });

  it("should cap the limit at the maximum", () => {
    expect(clampLimit(MAX_HISTORY_LIMIT + 1)).toBe(MAX_HISTORY_LIMIT);
  });

  it("should keep a limit inside the allowed range", () => {
    expect(clampLimit(10)).toBe(10);
  });
});
