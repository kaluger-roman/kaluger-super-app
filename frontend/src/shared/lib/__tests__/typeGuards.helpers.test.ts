import { describe, expect, it } from "vitest";

import { isRecord } from "../typeGuards.helpers";

describe("shared/lib/typeGuards.helpers isRecord", () => {
  it("should accept a plain object", () => {
    expect(isRecord({ type: "x" })).toBe(true);
  });

  it("should reject null, arrays and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});
