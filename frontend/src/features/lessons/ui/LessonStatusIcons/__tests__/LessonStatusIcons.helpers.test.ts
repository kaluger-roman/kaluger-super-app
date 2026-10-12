import { describe, expect, it } from "vitest";

import type { Lesson } from "@shared";

import { buildPaymentChange } from "../LessonStatusIcons.helpers";

const lesson = (isPaid: boolean) => ({ id: "lesson-1", isPaid, price: 2000 }) as Lesson;

describe("buildPaymentChange", () => {
  it("should mark an unpaid lesson paid with the date and the parsed amount", () => {
    expect(buildPaymentChange(lesson(false), "2026-02-15", "1800,5")).toEqual({
      lessonId: "lesson-1",
      isPaid: true,
      paymentDate: "2026-02-15",
      receivedAmount: 1800.5,
    });
  });

  it("should remove the payment of a paid lesson without an amount", () => {
    expect(buildPaymentChange(lesson(true), "2026-02-15", "2000")).toEqual({
      lessonId: "lesson-1",
      isPaid: false,
    });
  });
});
