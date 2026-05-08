import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import type { Lesson } from "@shared";

import {
  $allLessons,
  $allPagination,
  $paymentsSummary,
  loadAllLessonsFx,
} from "../api.model";
import "../stores.model";

const mockLesson: Lesson = {
  id: "1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-03-15T10:00:00.000Z",
  endTime: "2026-03-15T11:00:00.000Z",
  status: "COMPLETED",
  studentId: "student1",
  price: 2000,
  isPaid: true,
  isRecurring: false,
  isHomeworkSentByTeacher: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  student: {
    id: "student1",
    name: "Иванов Иван",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
} as unknown as Lesson;

describe("stores.model — allLessons stores", () => {
  it("should populate $allLessons from loadAllLessonsFx.doneData", async () => {
    const scope = fork({
      handlers: [
        [loadAllLessonsFx, () => ({
          lessons: [mockLesson],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        })],
      ],
    });

    await allSettled(loadAllLessonsFx, { scope, params: {} });

    expect(scope.getState($allLessons)).toEqual([mockLesson]);
  });

  it("should populate $allPagination from loadAllLessonsFx.doneData", async () => {
    const pagination = { total: 25, page: 2, limit: 10, totalPages: 3 };
    const scope = fork({
      handlers: [
        [loadAllLessonsFx, () => ({
          lessons: [],
          pagination,
        })],
      ],
    });

    await allSettled(loadAllLessonsFx, { scope, params: {} });

    expect(scope.getState($allPagination)).toEqual(pagination);
  });

  it("should populate $paymentsSummary from loadAllLessonsFx.doneData", async () => {
    const summary = { sum: 42000, count: 7 };
    const scope = fork({
      handlers: [
        [loadAllLessonsFx, () => ({
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
          paymentsSummary: summary,
        })],
      ],
    });

    await allSettled(loadAllLessonsFx, { scope, params: {} });

    expect(scope.getState($paymentsSummary)).toEqual(summary);
  });

  it("should set $paymentsSummary to null when paymentsSummary is absent", async () => {
    const scope = fork({
      values: [[$paymentsSummary, { sum: 1000, count: 1 }]],
      handlers: [
        [loadAllLessonsFx, () => ({
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        })],
      ],
    });

    await allSettled(loadAllLessonsFx, { scope, params: {} });

    expect(scope.getState($paymentsSummary)).toBeNull();
  });
});
