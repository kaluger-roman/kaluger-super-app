import { describe, it, expect } from "vitest";

import type { Lesson } from "@shared";

import {
  groupLessonsByDay,
  addLessonToSchedule,
  updateLessonInSchedule,
  removeLessonFromSchedule,
} from "../stores.helpers";

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: false,
  studentId: "student-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("groupLessonsByDay", () => {
  it("should group lessons by date key", () => {
    const lessons: Lesson[] = [
      createMockLesson({ id: "1", startTime: "2026-01-15T10:00:00.000Z" }),
      createMockLesson({ id: "2", startTime: "2026-01-15T14:00:00.000Z" }),
      createMockLesson({ id: "3", startTime: "2026-01-16T10:00:00.000Z" }),
    ];

    const result = groupLessonsByDay({}, lessons);

    expect(result["2026-01-15"]).toHaveLength(2);
    expect(result["2026-01-16"]).toHaveLength(1);
    expect(result["2026-01-15"][0].id).toBe("1");
    expect(result["2026-01-15"][1].id).toBe("2");
    expect(result["2026-01-16"][0].id).toBe("3");
  });

  it("should merge with existing state", () => {
    const existingState = {
      "2026-01-15": [createMockLesson({ id: "existing" })],
    };
    const lessons: Lesson[] = [
      createMockLesson({ id: "new", startTime: "2026-01-16T10:00:00.000Z" }),
    ];

    const result = groupLessonsByDay(existingState, lessons);

    expect(result["2026-01-15"]).toBeDefined();
    expect(result["2026-01-16"]).toBeDefined();
    expect(result["2026-01-16"][0].id).toBe("new");
  });

  it("should handle empty lessons array", () => {
    const existingState = {
      "2026-01-15": [createMockLesson()],
    };

    const result = groupLessonsByDay(existingState, []);

    expect(result).toEqual(existingState);
  });
});

describe("addLessonToSchedule", () => {
  it("should add lesson to existing day", () => {
    const state = {
      "2026-01-15": [createMockLesson({ id: "1" })],
    };
    const newLesson = createMockLesson({ id: "2", startTime: "2026-01-15T14:00:00.000Z" });

    const result = addLessonToSchedule(state, newLesson);

    expect(result["2026-01-15"]).toHaveLength(2);
    expect(result["2026-01-15"][1].id).toBe("2");
  });

  it("should add lesson to new day", () => {
    const state = {
      "2026-01-15": [createMockLesson({ id: "1" })],
    };
    const newLesson = createMockLesson({ id: "2", startTime: "2026-01-16T10:00:00.000Z" });

    const result = addLessonToSchedule(state, newLesson);

    expect(result["2026-01-15"]).toHaveLength(1);
    expect(result["2026-01-16"]).toHaveLength(1);
    expect(result["2026-01-16"][0].id).toBe("2");
  });

  it("should add lesson when state is empty", () => {
    const newLesson = createMockLesson({ startTime: "2026-01-15T10:00:00.000Z" });

    const result = addLessonToSchedule({}, newLesson);

    expect(result["2026-01-15"]).toHaveLength(1);
    expect(result["2026-01-15"][0]).toEqual(newLesson);
  });
});

describe("updateLessonInSchedule", () => {
  it("should update lesson in schedule", () => {
    const state = {
      "2026-01-15": [
        createMockLesson({ id: "1", price: 1000 }),
        createMockLesson({ id: "2", price: 2000 }),
      ],
    };
    const updatedLesson = createMockLesson({
      id: "1",
      startTime: "2026-01-15T10:00:00.000Z",
      price: 1500,
    });

    const result = updateLessonInSchedule(state, updatedLesson);

    expect(result["2026-01-15"]).toHaveLength(2);
    expect(result["2026-01-15"][0].price).toBe(1500);
    expect(result["2026-01-15"][1].price).toBe(2000);
  });

  it("should handle lesson not found in day", () => {
    const state = {
      "2026-01-15": [createMockLesson({ id: "2" })],
    };
    const updatedLesson = createMockLesson({
      id: "1",
      startTime: "2026-01-15T10:00:00.000Z",
      price: 1500,
    });

    const result = updateLessonInSchedule(state, updatedLesson);

    expect(result["2026-01-15"]).toHaveLength(1);
    expect(result["2026-01-15"][0].id).toBe("2");
  });

  it("should handle empty day", () => {
    const state = {
      "2026-01-16": [createMockLesson({ id: "2" })],
    };
    const updatedLesson = createMockLesson({
      id: "1",
      startTime: "2026-01-15T10:00:00.000Z",
    });

    const result = updateLessonInSchedule(state, updatedLesson);

    expect(result["2026-01-15"]).toHaveLength(0);
    expect(result["2026-01-16"]).toHaveLength(1);
  });
});

describe("removeLessonFromSchedule", () => {
  it("should remove lesson from schedule", () => {
    const state = {
      "2026-01-15": [
        createMockLesson({ id: "1" }),
        createMockLesson({ id: "2", startTime: "2026-01-15T14:00:00.000Z" }),
      ],
      "2026-01-16": [createMockLesson({ id: "3", startTime: "2026-01-16T10:00:00.000Z" })],
    };

    const result = removeLessonFromSchedule(state, "1");

    expect(result["2026-01-15"]).toHaveLength(1);
    expect(result["2026-01-15"][0].id).toBe("2");
    expect(result["2026-01-16"]).toHaveLength(1);
  });

  it("should remove day key when no lessons left", () => {
    const state = {
      "2026-01-15": [createMockLesson({ id: "1" })],
      "2026-01-16": [createMockLesson({ id: "2", startTime: "2026-01-16T10:00:00.000Z" })],
    };

    const result = removeLessonFromSchedule(state, "1");

    expect(result["2026-01-15"]).toBeUndefined();
    expect(result["2026-01-16"]).toHaveLength(1);
  });

  it("should handle lesson not found", () => {
    const state = {
      "2026-01-15": [createMockLesson({ id: "1" })],
    };

    const result = removeLessonFromSchedule(state, "non-existent");

    expect(result["2026-01-15"]).toHaveLength(1);
    expect(result["2026-01-15"][0].id).toBe("1");
  });

  it("should handle empty state", () => {
    const result = removeLessonFromSchedule({}, "1");

    expect(result).toEqual({});
  });
});
