import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Lesson } from "@shared";

import { usePaymentDate } from "../PaymentStatus.hooks";

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: false,
  studentId: "student-1",
  price: 1500,
  description: "Test description",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("usePaymentDate", () => {
  it("should initialize with lesson payment date if exists", () => {
    const lesson = createMockLesson({
      isPaid: true,
      paymentDate: "2026-01-10T00:00:00.000Z",
    });

    const { result } = renderHook(() => usePaymentDate(lesson, false));

    expect(result.current.paymentDate).toBe("2026-01-10");
  });

  it("should initialize with lesson start date if no payment date", () => {
    const lesson = createMockLesson({ isPaid: false });

    const { result } = renderHook(() => usePaymentDate(lesson, false));

    expect(result.current.paymentDate).toBe("2026-01-15");
  });

  it("should reset to lesson start date when dialog opens without payment date", () => {
    const lesson = createMockLesson({ isPaid: false });

    const { result, rerender } = renderHook(
      ({ dialogOpen }) => usePaymentDate(lesson, dialogOpen),
      { initialProps: { dialogOpen: false } }
    );

    act(() => {
      result.current.setPaymentDate("2026-01-25");
    });

    rerender({ dialogOpen: true });

    expect(result.current.paymentDate).toBe("2026-01-15");
  });

  it("should reset to lesson payment date when dialog opens", () => {
    const lesson = createMockLesson({
      isPaid: true,
      paymentDate: "2026-01-10T00:00:00.000Z",
    });

    const { result, rerender } = renderHook(
      ({ dialogOpen }) => usePaymentDate(lesson, dialogOpen),
      { initialProps: { dialogOpen: false } }
    );

    // Change payment date manually
    result.current.setPaymentDate("2026-01-15");

    // Open dialog - should reset to lesson payment date
    rerender({ dialogOpen: true });

    expect(result.current.paymentDate).toBe("2026-01-10");
  });

  it("should allow setting payment date", () => {
    const lesson = createMockLesson({ isPaid: false });

    const { result } = renderHook(() => usePaymentDate(lesson, false));

    act(() => {
      result.current.setPaymentDate("2026-01-20");
    });

    expect(result.current.paymentDate).toBe("2026-01-20");
  });
});
