import { describe, it, expect, vi, beforeEach } from "vitest";

import { api } from "../base";
import { statisticsApi } from "../statistics";

vi.mock("../base", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("statisticsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStatistics", () => {
    it("should fetch statistics without filters", async () => {
      const mockStats = {
        totalLessons: 100,
        completedLessons: 80,
        totalEarnings: 50000,
      };
      const mockResponse = { data: mockStats };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getStatistics();

      expect(api.get).toHaveBeenCalledWith("/statistics", { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it("should fetch statistics with date filters", async () => {
      const params = { startDate: "2025-01-01", endDate: "2025-12-31" };
      const mockStats = {
        totalLessons: 50,
        completedLessons: 40,
        totalEarnings: 25000,
      };
      const mockResponse = { data: mockStats };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getStatistics(params);

      expect(api.get).toHaveBeenCalledWith("/statistics", { params });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getLessonsBySubject", () => {
    it("should fetch lessons grouped by subject", async () => {
      const mockData = {
        lessonsBySubject: {
          Math: 30,
          Physics: 20,
          Chemistry: 10,
        },
      };
      const mockResponse = { data: mockData };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getLessonsBySubject();

      expect(api.get).toHaveBeenCalledWith("/statistics/by-subject", { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it("should fetch lessons by subject with date filters", async () => {
      const params = { startDate: "2025-01-01", endDate: "2025-12-31" };
      const mockData = {
        lessonsBySubject: {
          Math: 15,
          Physics: 10,
        },
      };
      const mockResponse = { data: mockData };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getLessonsBySubject(params);

      expect(api.get).toHaveBeenCalledWith("/statistics/by-subject", { params });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getLessonsByType", () => {
    it("should fetch lessons grouped by type", async () => {
      const mockData = {
        lessonsByType: {
          individual: 40,
          group: 20,
        },
      };
      const mockResponse = { data: mockData };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getLessonsByType();

      expect(api.get).toHaveBeenCalledWith("/statistics/by-type", { params: undefined });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getStudentStatistics", () => {
    it("should fetch statistics grouped by student", async () => {
      const mockData = {
        studentStatistics: {
          student1: { lessons: 10, earnings: 5000 },
          student2: { lessons: 15, earnings: 7500 },
        },
      };
      const mockResponse = { data: mockData };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await statisticsApi.getStudentStatistics();

      expect(api.get).toHaveBeenCalledWith("/statistics/by-student", { params: undefined });
      expect(result).toEqual(mockResponse);
    });
  });
});
