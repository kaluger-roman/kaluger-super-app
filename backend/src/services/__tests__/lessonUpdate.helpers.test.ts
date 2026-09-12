import type { Lesson } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  buildLessonUpdateData,
  computeUpdatedStatus,
  isTimeChanging,
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

  it("should return undefined for a future lesson with an explicit status", () => {
    expect(
      computeUpdatedStatus({ status: "RESCHEDULED" }, makeLesson(), future.start, future.end, now)
    ).toBeUndefined();
  });
});

describe("buildLessonUpdateData", () => {
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
