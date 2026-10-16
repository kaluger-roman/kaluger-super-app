import { describe, it, expect } from "vitest";

import { hasVisibleNotes } from "../LessonNotes.helpers";

describe("hasVisibleNotes", () => {
  it("should return false for undefined", () => {
    expect(hasVisibleNotes(undefined)).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(hasVisibleNotes("")).toBe(false);
  });

  it("should return false for a whitespace-only string", () => {
    expect(hasVisibleNotes("   ")).toBe(false);
  });

  it("should return false for a string with only line breaks and spaces", () => {
    expect(hasVisibleNotes("\n\n  \t\n")).toBe(false);
  });

  it("should return true for a non-empty text", () => {
    expect(hasVisibleNotes("План занятия")).toBe(true);
  });

  it("should return true when text has surrounding whitespace but real content", () => {
    expect(hasVisibleNotes("  разбор ошибок  ")).toBe(true);
  });
});
