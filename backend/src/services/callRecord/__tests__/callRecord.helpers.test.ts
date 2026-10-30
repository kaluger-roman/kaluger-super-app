import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT } from "../callRecord.constants";
import {
  clampLimit,
  toCallHistoryItem,
  toCallLessonSummary,
  toFinalizedTimes,
} from "../callRecord.helpers";
import type { CallRecordWithPeer } from "../callRecord.types";

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

describe("toFinalizedTimes", () => {
  const connectedAt = new Date("2026-06-04T10:00:05.000Z");
  const endedAt = new Date("2026-06-04T10:05:05.000Z");

  it("should keep the end and count the duration of a completed call", () => {
    expect(toFinalizedTimes("COMPLETED", connectedAt, endedAt)).toEqual({
      endedAt,
      durationSeconds: 300,
    });
  });

  it("should drop the end and duration of a call that never completed", () => {
    expect(toFinalizedTimes("FAILED", connectedAt, endedAt)).toEqual({
      endedAt: null,
      durationSeconds: null,
    });
  });
});

describe("toCallHistoryItem", () => {
  const record: CallRecordWithPeer = {
    id: "r1",
    callerKind: "TUTOR",
    status: "COMPLETED",
    startedAt: new Date("2026-06-04T10:00:00.000Z"),
    endedAt: new Date("2026-06-04T10:01:00.000Z"),
    durationSeconds: 60,
    tutorId: "t1",
    studentId: "s1",
    lessonId: null,
    createdAt: new Date("2026-06-04T10:01:00.000Z"),
    student: { name: "Иван" },
    tutor: { name: "Анна" },
    lesson: null,
  };

  it("should show the student as an outgoing call to the tutor who called", () => {
    expect(toCallHistoryItem(record, "tutor")).toMatchObject({
      peerName: "Иван",
      direction: "outgoing",
      status: "COMPLETED",
    });
  });

  it("should show the tutor as an incoming call to the student", () => {
    expect(toCallHistoryItem(record, "student")).toMatchObject({
      peerName: "Анна",
      direction: "incoming",
    });
  });

  it("should leave the lesson empty for a call without a lesson", () => {
    expect(toCallHistoryItem(record, "tutor").lesson).toBeNull();
  });

  it("should add the lesson summary with ISO dates", () => {
    const withLesson: CallRecordWithPeer = {
      ...record,
      lessonId: "l1",
      lesson: {
        id: "l1",
        subject: "PHYSICS",
        startTime: new Date("2026-06-04T09:30:00.000Z"),
        endTime: new Date("2026-06-04T10:30:00.000Z"),
      },
    };

    expect(toCallHistoryItem(withLesson, "student").lesson).toEqual({
      id: "l1",
      subject: "PHYSICS",
      startTime: "2026-06-04T09:30:00.000Z",
      endTime: "2026-06-04T10:30:00.000Z",
    });
  });
});

describe("toCallLessonSummary", () => {
  it("should serialize the lesson dates and keep null", () => {
    expect(
      toCallLessonSummary({
        id: "l-1",
        subject: "MATHEMATICS",
        startTime: new Date("2026-10-23T15:00:00.000Z"),
        endTime: new Date("2026-10-23T16:00:00.000Z"),
      })
    ).toEqual({
      id: "l-1",
      subject: "MATHEMATICS",
      startTime: "2026-10-23T15:00:00.000Z",
      endTime: "2026-10-23T16:00:00.000Z",
    });
    expect(toCallLessonSummary(null)).toBeNull();
  });
});
