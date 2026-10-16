import type { Lesson } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  buildLessonUpdateData,
  computeUpdatedStatus,
  isTimeChanging,
  resolveReceivedAmount,
  resolveUpdatedTimes,
  shouldPropagateRecurringPrice,
  shouldShiftRecurringSeries,
} from "../lessonUpdate";

const now = new Date("2026-03-10T12:00:00Z");

const makeLesson = (overrides: Partial<Lesson> = {}): Lesson =>
  ({
    id: "lesson-1",
    tutorId: "tutor-1",
    studentId: "student-1",
    subject: "MATHEMATICS",
    lessonType: "SCHOOL",
    description: null,
    startTime: new Date("2026-03-11T10:00:00Z"),
    endTime: new Date("2026-03-11T11:00:00Z"),
    price: new Prisma.Decimal(1000),
    status: "SCHEDULED",
    isRecurring: false,
    isPaid: false,
    paymentDate: null,
    receivedAmount: null,
    isTaxExempt: false,
    homework: null,
    notes: null,
    isHomeworkSentByTeacher: false,
    grade: null,
    prospectName: null,
    prospectPhone: null,
    prospectContactMethod: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }) as Lesson;

describe("resolveUpdatedTimes", () => {
  it("should fall back to the existing lesson times when none are provided", () => {
    const existing = makeLesson();
    const { start, end } = resolveUpdatedTimes({}, existing);
    expect(start.getTime()).toBe(existing.startTime.getTime());
    expect(end.getTime()).toBe(existing.endTime.getTime());
  });

  it("should truncate provided times to the minute", () => {
    const { start, end } = resolveUpdatedTimes(
      {
        startTime: new Date("2026-03-12T10:00:30.500Z"),
        endTime: new Date("2026-03-12T11:00:59Z"),
      },
      makeLesson()
    );
    expect(start.toISOString()).toBe("2026-03-12T10:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-12T11:00:00.000Z");
  });
});

describe("computeUpdatedStatus", () => {
  const past = {
    start: new Date("2026-03-10T09:00:00Z"),
    end: new Date("2026-03-10T10:00:00Z"),
  };
  const running = {
    start: new Date("2026-03-10T11:30:00Z"),
    end: new Date("2026-03-10T12:30:00Z"),
  };
  const future = {
    start: new Date("2026-03-11T10:00:00Z"),
    end: new Date("2026-03-11T11:00:00Z"),
  };

  it("should return COMPLETED for a lesson that already ended", () => {
    expect(computeUpdatedStatus({}, makeLesson(), past.start, past.end, now)).toBe("COMPLETED");
  });

  it("should return IN_PROGRESS for a lesson running right now", () => {
    expect(computeUpdatedStatus({}, makeLesson(), running.start, running.end, now)).toBe(
      "IN_PROGRESS"
    );
  });

  it("should never override an explicit CANCELLED status", () => {
    expect(
      computeUpdatedStatus({ status: "CANCELLED" }, makeLesson(), past.start, past.end, now)
    ).toBeUndefined();
  });

  it("should keep a cancelled lesson cancelled when no status is sent", () => {
    expect(
      computeUpdatedStatus({}, makeLesson({ status: "CANCELLED" }), future.start, future.end, now)
    ).toBe("CANCELLED");
  });

  it("should keep a past cancelled lesson cancelled when no status is sent", () => {
    expect(
      computeUpdatedStatus({}, makeLesson({ status: "CANCELLED" }), past.start, past.end, now)
    ).toBe("CANCELLED");
  });

  it("should keep a running cancelled lesson cancelled when no status is sent", () => {
    expect(
      computeUpdatedStatus({}, makeLesson({ status: "CANCELLED" }), running.start, running.end, now)
    ).toBe("CANCELLED");
  });

  it("should complete a past cancelled lesson restored with an explicit SCHEDULED status", () => {
    expect(
      computeUpdatedStatus(
        { status: "SCHEDULED" },
        makeLesson({ status: "CANCELLED" }),
        past.start,
        past.end,
        now
      )
    ).toBe("COMPLETED");
  });

  it("should return undefined for a future lesson with an explicit status", () => {
    expect(
      computeUpdatedStatus({ status: "RESCHEDULED" }, makeLesson(), future.start, future.end, now)
    ).toBeUndefined();
  });
});

describe("buildLessonUpdateData", () => {
  it("should pass isTaxExempt through without touching the status of a cancelled lesson", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { isTaxExempt: true },
      makeLesson({
        status: "CANCELLED",
        startTime: new Date("2026-03-01T10:00:00Z"),
        endTime: new Date("2026-03-01T11:00:00Z"),
      }),
      false,
      now
    );
    expect(dataToUpdate).toEqual({ isTaxExempt: true, status: "CANCELLED" });
  });

  it("should pass through fields and override times with truncated dates", () => {
    const { dataToUpdate, start, end } = buildLessonUpdateData(
      {
        startTime: new Date("2026-03-12T10:00:30Z"),
        endTime: new Date("2026-03-12T11:00:30Z"),
        notes: "text",
      },
      makeLesson(),
      false,
      now
    );
    expect(dataToUpdate.notes).toBe("text");
    expect(dataToUpdate.startTime).toEqual(start);
    expect(dataToUpdate.endTime).toEqual(end);
    expect(start.toISOString()).toBe("2026-03-12T10:00:00.000Z");
  });

  it("should set the computed status for a lesson that moved into the past", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      {
        startTime: new Date("2026-03-10T09:00:00Z"),
        endTime: new Date("2026-03-10T10:00:00Z"),
      },
      makeLesson(),
      false,
      now
    );
    expect(dataToUpdate.status).toBe("COMPLETED");
  });

  it("should trim the prospect name", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { prospectName: "  Иван  " },
      makeLesson({ studentId: null }),
      false,
      now
    );
    expect(dataToUpdate.prospectName).toBe("Иван");
  });

  it("should clear prospect fields when linking a student", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { studentId: "student-2" },
      makeLesson({ studentId: null, prospectName: "Иван" }),
      true,
      now
    );
    expect(dataToUpdate.studentId).toBe("student-2");
    expect(dataToUpdate.prospectName).toBeNull();
    expect(dataToUpdate.prospectPhone).toBeNull();
    expect(dataToUpdate.prospectContactMethod).toBeNull();
  });
});

describe("resolveReceivedAmount", () => {
  const paidLesson = () =>
    makeLesson({
      isPaid: true,
      paymentDate: new Date("2026-03-09T00:00:00Z"),
      receivedAmount: new Prisma.Decimal(1000),
    });

  it("should default to the current price when an unpaid lesson becomes paid", () => {
    expect(resolveReceivedAmount({ isPaid: true }, makeLesson())).toBe(1000);
  });

  it("should default to the price from the same request when it changes together with payment", () => {
    expect(resolveReceivedAmount({ isPaid: true, price: 2500 }, makeLesson())).toBe(2500);
  });

  it("should take the explicit amount when an unpaid lesson becomes paid", () => {
    expect(resolveReceivedAmount({ isPaid: true, receivedAmount: 1800 }, makeLesson())).toBe(1800);
  });

  it("should keep an explicit zero amount", () => {
    expect(resolveReceivedAmount({ isPaid: true, receivedAmount: 0 }, makeLesson())).toBe(0);
  });

  it("should default to zero for a lesson without a price", () => {
    expect(resolveReceivedAmount({ isPaid: true }, makeLesson({ price: null }))).toBe(0);
  });

  it("should clear the amount when the payment is removed", () => {
    expect(resolveReceivedAmount({ isPaid: false }, paidLesson())).toBeNull();
  });

  it("should leave the amount untouched when a paid lesson is saved again without it", () => {
    expect(
      resolveReceivedAmount(
        { isPaid: true, paymentDate: new Date("2026-03-09T00:00:00Z") },
        paidLesson()
      )
    ).toBeUndefined();
  });

  it("should leave the amount untouched when only the price of a paid lesson changes", () => {
    expect(resolveReceivedAmount({ price: 2500 }, paidLesson())).toBeUndefined();
  });

  it("should apply a new amount to an already paid lesson", () => {
    expect(resolveReceivedAmount({ receivedAmount: 2500 }, paidLesson())).toBe(2500);
  });

  it("should not touch the amount of an unpaid lesson that stays unpaid", () => {
    expect(resolveReceivedAmount({ price: 100 }, makeLesson())).toBeUndefined();
    expect(resolveReceivedAmount({ isPaid: false }, makeLesson())).toBeUndefined();
  });
});

describe("buildLessonUpdateData receivedAmount", () => {
  it("should write the resolved default instead of the missing body field", () => {
    const { dataToUpdate } = buildLessonUpdateData({ isPaid: true }, makeLesson(), false, now);
    expect(dataToUpdate.isPaid).toBe(true);
    expect(dataToUpdate.receivedAmount).toBe(1000);
  });

  it("should not pass a raw receivedAmount through for a lesson that stays unpaid", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { receivedAmount: 1800, notes: "x" },
      makeLesson(),
      false,
      now
    );
    expect(dataToUpdate).not.toHaveProperty("receivedAmount");
    expect(dataToUpdate.notes).toBe("x");
  });

  it("should omit the key when a paid lesson keeps its amount", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { price: 2500 },
      makeLesson({ isPaid: true, receivedAmount: new Prisma.Decimal(1000) }),
      false,
      now
    );
    expect(dataToUpdate).not.toHaveProperty("receivedAmount");
    expect(dataToUpdate.price).toBe(2500);
  });

  it("should write null when the payment is removed", () => {
    const { dataToUpdate } = buildLessonUpdateData(
      { isPaid: false },
      makeLesson({ isPaid: true, receivedAmount: new Prisma.Decimal(1000) }),
      false,
      now
    );
    expect(dataToUpdate.receivedAmount).toBeNull();
  });
});

describe("recurring-series predicates", () => {
  const recurring = makeLesson({ isRecurring: true, status: "SCHEDULED" });

  it("isTimeChanging should detect either boundary", () => {
    expect(isTimeChanging({})).toBe(false);
    expect(isTimeChanging({ startTime: now })).toBe(true);
    expect(isTimeChanging({ endTime: now })).toBe(true);
  });

  it("shouldShiftRecurringSeries should require a scheduled recurring lesson with a time change", () => {
    expect(shouldShiftRecurringSeries({ startTime: now }, recurring)).toBe(true);
    expect(shouldShiftRecurringSeries({ notes: "x" }, recurring)).toBe(false);
    expect(shouldShiftRecurringSeries({ startTime: now }, makeLesson({ isRecurring: false }))).toBe(
      false
    );
    expect(
      shouldShiftRecurringSeries(
        { startTime: now },
        makeLesson({ isRecurring: true, status: "COMPLETED" })
      )
    ).toBe(false);
    expect(shouldShiftRecurringSeries({ startTime: now, status: "RESCHEDULED" }, recurring)).toBe(
      false
    );
  });

  it("shouldPropagateRecurringPrice should react to an explicit price key only", () => {
    expect(shouldPropagateRecurringPrice({ price: 1500 }, recurring)).toBe(true);
    expect(shouldPropagateRecurringPrice({ price: undefined }, recurring)).toBe(true);
    expect(shouldPropagateRecurringPrice({ notes: "x" }, recurring)).toBe(false);
    expect(shouldPropagateRecurringPrice({ price: 1500 }, makeLesson({ isRecurring: false }))).toBe(
      false
    );
  });
});
