import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonsApi } from "@shared";
import type { Lesson } from "@shared";

import {
  loadCompletedLessons,
  loadCancelledLessons,
  loadLesson,
  loadUpcomingLessons,
  loadWeeklyLessons,
  loadScheduleLessons,
  addLesson,
  updateLesson,
  removeLesson,
} from "../api.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    lessonsApi: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getUpcoming: vi.fn(),
      getByWeek: vi.fn(),
      getByDateRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("entities/lesson/models/api.model", () => {
  const mockLesson: Lesson = {
    id: "1",
    subject: "Math",
    startTime: new Date("2025-01-15T10:00:00"),
    endTime: new Date("2025-01-15T11:00:00"),
    status: "SCHEDULED",
    studentId: "student1",
    tutorId: "tutor1",
    price: 1000,
    isPaid: false,
    homeworkSent: false,
    type: "INDIVIDUAL",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Lesson;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadCompletedLessonsFx", () => {
    it("should load completed lessons", async () => {
      const scope = fork();
      const mockResponse = {
        lessons: [mockLesson],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(lessonsApi.getAll).mockResolvedValue(mockResponse);

      await allSettled(loadCompletedLessons, {
        scope,
        params: { page: 1, limit: 10 },
      });

      expect(lessonsApi.getAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: "COMPLETED",
      });
    });
  });

  describe("loadCancelledLessonsFx", () => {
    it("should load cancelled lessons", async () => {
      const scope = fork();
      const mockResponse = {
        lessons: [{ ...mockLesson, status: "CANCELLED" as const }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(lessonsApi.getAll).mockResolvedValue(mockResponse);

      await allSettled(loadCancelledLessons, {
        scope,
        params: { page: 1 },
      });

      expect(lessonsApi.getAll).toHaveBeenCalledWith({
        page: 1,
        status: "CANCELLED",
      });
    });
  });

  describe("loadLessonFx", () => {
    it("should load single lesson by id", async () => {
      const scope = fork();

      vi.mocked(lessonsApi.getById).mockResolvedValue(mockLesson);

      await allSettled(loadLesson, {
        scope,
        params: "1",
      });

      expect(lessonsApi.getById).toHaveBeenCalledWith("1");
    });
  });

  describe("loadUpcomingLessonsFx", () => {
    it("should load upcoming lessons", async () => {
      const scope = fork();
      const mockResponse = {
        lessons: [mockLesson],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue(mockResponse);

      await allSettled(loadUpcomingLessons, {
        scope,
        params: { onlyUnpaid: true },
      });

      expect(lessonsApi.getUpcoming).toHaveBeenCalledWith({ onlyUnpaid: true });
    });
  });

  describe("loadWeeklyLessonsFx", () => {
    it("should load weekly lessons", async () => {
      const scope = fork();
      const mockResponse = {
        lessons: [mockLesson],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(lessonsApi.getByWeek).mockResolvedValue(mockResponse);

      await allSettled(loadWeeklyLessons, {
        scope,
        params: { weekStart: "2025-01-13" },
      });

      expect(lessonsApi.getByWeek).toHaveBeenCalledWith({ weekStart: "2025-01-13" });
    });
  });

  describe("loadScheduleLessonsFx", () => {
    it("should load schedule lessons", async () => {
      const scope = fork();
      const mockResponse = {
        lessons: [mockLesson],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(lessonsApi.getByDateRange).mockResolvedValue(mockResponse);

      await allSettled(loadScheduleLessons, {
        scope,
        params: { startDate: "2025-01-01", endDate: "2025-01-31" },
      });

      expect(lessonsApi.getByDateRange).toHaveBeenCalledWith({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });
    });
  });

  describe("addLessonFx", () => {
    it("should create new lesson", async () => {
      const scope = fork();
      const lessonData: import("@shared").CreateLessonDto = {
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: "2025-01-15T14:00:00",
        endTime: "2025-01-15T15:00:00",
        studentId: "student1",
        price: 1200,
      };

      vi.mocked(lessonsApi.create).mockResolvedValue(mockLesson);

      await allSettled(addLesson, {
        scope,
        params: lessonData,
      });

      expect(lessonsApi.create).toHaveBeenCalledWith(lessonData);
    });
  });

  describe("updateLessonFx", () => {
    it("should update lesson", async () => {
      const scope = fork();
      const updateData = {
        status: "COMPLETED" as const,
        isPaid: true,
      };

      vi.mocked(lessonsApi.update).mockResolvedValue({
        ...mockLesson,
        ...updateData,
      });

      await allSettled(updateLesson, {
        scope,
        params: { id: "1", data: updateData },
      });

      expect(lessonsApi.update).toHaveBeenCalledWith("1", updateData);
    });
  });

  describe("removeLessonFx", () => {
    it("should delete lesson", async () => {
      const scope = fork();

      vi.mocked(lessonsApi.delete).mockResolvedValue(undefined);

      await allSettled(removeLesson, {
        scope,
        params: { id: "1" },
      });

      expect(lessonsApi.delete).toHaveBeenCalledWith("1", undefined);
    });

    it("should delete lesson with all future occurrences", async () => {
      const scope = fork();

      vi.mocked(lessonsApi.delete).mockResolvedValue(undefined);

      await allSettled(removeLesson, {
        scope,
        params: { id: "1", deleteAllFuture: true },
      });

      expect(lessonsApi.delete).toHaveBeenCalledWith("1", true);
    });
  });
});
