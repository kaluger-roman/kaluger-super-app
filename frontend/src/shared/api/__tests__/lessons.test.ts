import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson, UpdateLessonDto, CreateLessonDto } from "../../types";
import { api } from "../base";
import { lessonsApi } from "../lessons";

vi.mock("../base", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("lessonsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all lessons without filters", async () => {
      const mockLessons: Lesson[] = [
        {
          id: "1",
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: "2025-01-15T10:00:00",
          endTime: "2025-01-15T11:00:00",
          status: "SCHEDULED",
          studentId: "student1",
          price: 1000,
          isPaid: false,
          isHomeworkSentByTeacher: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ] as unknown as Lesson[];
      const mockResponse = {
        data: {
          lessons: mockLessons,
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await lessonsApi.getAll();

      expect(api.get).toHaveBeenCalledWith("/lessons?");
      expect(result).toEqual(mockResponse.data);
    });

    it("should fetch lessons with filters", async () => {
      const filters = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        studentId: "student1",
        status: "COMPLETED",
        page: 1,
        limit: 20,
      };
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await lessonsApi.getAll(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("startDate=2025-01-01");
      expect(callUrl).toContain("endDate=2025-01-31");
      expect(callUrl).toContain("studentId=student1");
      expect(callUrl).toContain("status=COMPLETED");
    });
  });

  describe("getById", () => {
    it("should fetch lesson by id", async () => {
      const mockLesson: Lesson = {
        id: "1",
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: "2025-01-15T10:00:00",
        endTime: "2025-01-15T11:00:00",
        status: "SCHEDULED",
        studentId: "student1",
        price: 1000,
        isPaid: false,
        isHomeworkSentByTeacher: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Lesson;
      const mockResponse = { data: { lesson: mockLesson } };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      // eslint-disable-next-line testing-library/no-await-sync-query
      const result = await lessonsApi.getById("1");

      expect(api.get).toHaveBeenCalledWith("/lessons/1");
      expect(result).toEqual(mockLesson);
    });
  });

  describe("getUpcoming", () => {
    it("should fetch upcoming lessons", async () => {
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await lessonsApi.getUpcoming();

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("upcoming=true");
      expect(callUrl).toContain("currentTime=");
    });

    it("should fetch upcoming lessons with filters", async () => {
      const filters = {
        page: 2,
        limit: 20,
        onlyUnpaid: true,
        onlyWithoutHomework: true,
      } as const;
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 2, limit: 20, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await lessonsApi.getUpcoming(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("onlyUnpaid=true");
      expect(callUrl).toContain("onlyWithoutHomework=true");
      expect(callUrl).toContain("page=2");
      expect(callUrl).toContain("limit=20");
    });
  });

  describe("getByWeek", () => {
    it("should fetch lessons by week", async () => {
      const filters = {
        weekStart: "2025-01-13",
        onlyUnpaid: true,
      };
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      // eslint-disable-next-line testing-library/no-await-sync-query
      await lessonsApi.getByWeek(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("weekStart=2025-01-13");
      expect(callUrl).toContain("weekly=true");
      expect(callUrl).toContain("onlyUnpaid=true");
    });

    it("should fetch lessons by week with onlyWithoutHomework filter", async () => {
      const filters = {
        weekStart: "2025-01-13",
        onlyWithoutHomework: true,
      };
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      lessonsApi.getByWeek(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("onlyWithoutHomework=true");
    });
  });

  describe("getByDateRange", () => {
    it("should fetch lessons by date range", async () => {
      const filters = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        noPagination: "true",
      };
      const mockResponse = {
        data: {
          lessons: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      // eslint-disable-next-line testing-library/no-await-sync-query
      await lessonsApi.getByDateRange(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("startDate=2025-01-01");
      expect(callUrl).toContain("endDate=2025-01-31");
      expect(callUrl).toContain("noPagination=true");
    });
  });

  describe("getStatistics", () => {
    it("should fetch lesson statistics", async () => {
      const mockStats = {
        totalLessons: 100,
        completedLessons: 80,
        totalEarnings: 50000,
      };
      const mockResponse = { data: mockStats };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await lessonsApi.getStatistics();

      expect(api.get).toHaveBeenCalledWith("/lessons/statistics?");
      expect(result).toEqual(mockStats);
    });

    it("should fetch statistics with date filters", async () => {
      const filters = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      };

      vi.mocked(api.get).mockResolvedValue({ data: {} });

      await lessonsApi.getStatistics(filters);

      expect(api.get).toHaveBeenCalled();
      const callUrl = vi.mocked(api.get).mock.calls[0][0] as string;
      expect(callUrl).toContain("startDate=2025-01-01");
      expect(callUrl).toContain("endDate=2025-01-31");
    });
  });

  describe("create", () => {
    it("should create new lesson", async () => {
      const lessonData: CreateLessonDto = {
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: "2025-01-15T14:00:00",
        endTime: "2025-01-15T15:00:00",
        studentId: "student1",
        price: 1200,
      };
      const mockLesson: Lesson = {
        id: "2",
        ...lessonData,
        status: "SCHEDULED",
        isPaid: false,
        isHomeworkSentByTeacher: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Lesson;
      const mockResponse = { data: { lesson: mockLesson } };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await lessonsApi.create(lessonData);

      expect(api.post).toHaveBeenCalledWith("/lessons", lessonData);
      expect(result).toEqual(mockLesson);
    });
  });

  describe("update", () => {
    it("should update lesson", async () => {
      const lessonData: UpdateLessonDto = {
        status: "COMPLETED",
        isPaid: true,
      };
      const mockLesson: Lesson = {
        id: "1",
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: "2025-01-15T10:00:00",
        endTime: "2025-01-15T11:00:00",
        status: "COMPLETED",
        studentId: "student1",
        price: 1000,
        isPaid: true,
        isHomeworkSentByTeacher: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Lesson;
      const mockResponse = { data: { lesson: mockLesson } };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await lessonsApi.update("1", lessonData);

      expect(api.put).toHaveBeenCalledWith("/lessons/1", lessonData);
      expect(result).toEqual(mockLesson);
    });
  });

  describe("delete", () => {
    it("should delete single lesson", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await lessonsApi.delete("1");

      expect(api.delete).toHaveBeenCalledWith("/lessons/1", {
        data: { deleteAllFuture: undefined },
      });
    });

    it("should delete lesson with all future occurrences", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await lessonsApi.delete("1", true);

      expect(api.delete).toHaveBeenCalledWith("/lessons/1", {
        data: { deleteAllFuture: true },
      });
    });
  });

  describe("getCancellationInfo", () => {
    it("should fetch cancellation info", async () => {
      const mockCancellationInfo = {
        reason: "Student sick",
        comment: "Rescheduled to next week",
      };
      const mockResponse = {
        data: { cancellationInfo: mockCancellationInfo },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await lessonsApi.getCancellationInfo("1");

      expect(api.get).toHaveBeenCalledWith("/lessons/1/cancellation-info");
      expect(result).toEqual(mockCancellationInfo);
    });

    it("should return null when cancellation info is not available", async () => {
      const mockResponse = {
        data: {},
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await lessonsApi.getCancellationInfo("1");

      expect(api.get).toHaveBeenCalledWith("/lessons/1/cancellation-info");
      expect(result).toBeNull();
    });
  });
});
