import { describe, expect, it } from "vitest";

import { isRecord, isSubject } from "../typeGuards.helpers";

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

describe("shared/lib/typeGuards.helpers isSubject", () => {
  it("should accept every known subject", () => {
    expect(isSubject("MATHEMATICS")).toBe(true);
    expect(isSubject("PHYSICS")).toBe(true);
  });

  it("should reject unknown strings, inherited keys and non-strings", () => {
    expect(isSubject("CHEMISTRY")).toBe(false);
    expect(isSubject("toString")).toBe(false);
    expect(isSubject(null)).toBe(false);
    expect(isSubject(1)).toBe(false);
  });
});
