import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { Lesson } from "../../../types";
import { theme } from "../../themeConfig";
import { PastDateNotice } from "../PastDateNotice";
import { shouldShowNotice, calculateLessonStatus } from "../PastDateNotice.helpers";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockLesson: Lesson = {
  id: "1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "1",
};

describe("PastDateNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering when notice should be shown", () => {
    it("should show warning alert when lesson has ended and status doesn't match", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={mockLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should show warning alert when lesson is in progress and status doesn't match", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={mockLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should show warning alert for completed lesson without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should show warning alert for in-progress lesson without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should display alert with warning severity", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-standardWarning");
    });
  });

  describe("Not rendering when notice shouldn't be shown", () => {
    it("should not render when lesson status matches calculated status (COMPLETED)", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const completedLesson: Lesson = {
        ...mockLesson,
        status: "COMPLETED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={completedLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should not render when lesson status matches calculated status (IN_PROGRESS)", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const inProgressLesson: Lesson = {
        ...mockLesson,
        status: "IN_PROGRESS",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={inProgressLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should not render when lesson is scheduled in the future", () => {
      vi.setSystemTime(new Date("2026-02-15T09:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={mockLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should not render when lesson is scheduled in the future without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T09:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should not render when lesson status matches even with SCHEDULED status for future lesson", () => {
      vi.setSystemTime(new Date("2026-02-15T09:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const scheduledLesson: Lesson = {
        ...mockLesson,
        status: "SCHEDULED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={scheduledLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Different time scenarios", () => {
    it("should show in-progress notice when current time is exactly at end time", () => {
      vi.setSystemTime(new Date("2026-02-15T11:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should show in-progress notice when current time is exactly at start time", () => {
      vi.setSystemTime(new Date("2026-02-15T10:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should show completed notice one millisecond after end time", () => {
      vi.setSystemTime(new Date("2026-02-15T11:30:00.001Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should show notice for past lesson from yesterday", () => {
      vi.setSystemTime(new Date("2026-02-16T10:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should not show notice for lesson starting tomorrow", () => {
      vi.setSystemTime(new Date("2026-02-14T10:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("With and without lesson prop", () => {
    it("should handle completed lesson without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should handle in-progress lesson without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should handle scheduled lesson without lesson prop", () => {
      vi.setSystemTime(new Date("2026-02-15T09:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should show notice with lesson prop when status doesn't match", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const scheduledLesson: Lesson = {
        ...mockLesson,
        status: "SCHEDULED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={scheduledLesson} />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should not show notice with lesson prop when status matches", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const completedLesson: Lesson = {
        ...mockLesson,
        status: "COMPLETED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={completedLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle lesson with CANCELLED status correctly", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const cancelledLesson: Lesson = {
        ...mockLesson,
        status: "CANCELLED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={cancelledLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should handle lesson with RESCHEDULED status correctly", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const rescheduledLesson: Lesson = {
        ...mockLesson,
        status: "RESCHEDULED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={rescheduledLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should handle very short lesson duration (1 minute)", () => {
      vi.setSystemTime(new Date("2026-02-15T10:00:30.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T10:01:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should handle very long lesson duration (5 hours)", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T15:00:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should handle lessons spanning midnight", () => {
      vi.setSystemTime(new Date("2026-02-16T00:30:00.000Z"));

      const startTime = new Date("2026-02-15T23:00:00.000Z");
      const endTime = new Date("2026-02-16T01:00:00.000Z");

      renderWithTheme(<PastDateNotice startTime={startTime} endTime={endTime} />);

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });
  });

  describe("Different lesson statuses", () => {
    it("should show notice when lesson has SCHEDULED status but is already completed", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const scheduledLesson: Lesson = {
        ...mockLesson,
        status: "SCHEDULED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={scheduledLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный./i
        )
      ).toBeInTheDocument();
    });

    it("should show notice when lesson has SCHEDULED status but is in progress", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const scheduledLesson: Lesson = {
        ...mockLesson,
        status: "SCHEDULED",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={scheduledLesson} />
      );

      expect(
        screen.getByText(
          /Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий./i
        )
      ).toBeInTheDocument();
    });

    it("should not show notice when lesson has matching status", () => {
      vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));

      const startTime = new Date("2026-02-15T10:00:00.000Z");
      const endTime = new Date("2026-02-15T11:30:00.000Z");
      const inProgressLesson: Lesson = {
        ...mockLesson,
        status: "IN_PROGRESS",
      };

      renderWithTheme(
        <PastDateNotice startTime={startTime} endTime={endTime} lesson={inProgressLesson} />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Helper functions", () => {
    describe("calculateLessonStatus", () => {
      it("should return COMPLETED when lesson has ended", () => {
        vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
        const startTime = new Date("2026-02-15T10:00:00.000Z");
        const endTime = new Date("2026-02-15T11:30:00.000Z");

        expect(calculateLessonStatus(startTime, endTime)).toBe("COMPLETED");
      });

      it("should return IN_PROGRESS when lesson is ongoing", () => {
        vi.setSystemTime(new Date("2026-02-15T10:30:00.000Z"));
        const startTime = new Date("2026-02-15T10:00:00.000Z");
        const endTime = new Date("2026-02-15T11:30:00.000Z");

        expect(calculateLessonStatus(startTime, endTime)).toBe("IN_PROGRESS");
      });

      it("should return SCHEDULED when lesson is in the future", () => {
        vi.setSystemTime(new Date("2026-02-15T09:00:00.000Z"));
        const startTime = new Date("2026-02-15T10:00:00.000Z");
        const endTime = new Date("2026-02-15T11:30:00.000Z");

        expect(calculateLessonStatus(startTime, endTime)).toBe("SCHEDULED");
      });
    });

    describe("shouldShowNotice error handling", () => {
      it("should handle errors gracefully and return default state", () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
          //
        });

        // Mock getTime to throw an error
        const invalidStartDate = new Date("2026-02-15T10:00:00.000Z");
        vi.spyOn(invalidStartDate, "getTime").mockImplementation(() => {
          throw new Error("Test error");
        });

        const validDate = new Date("2026-02-15T11:00:00.000Z");

        const result = shouldShowNotice(invalidStartDate, validDate);

        expect(result).toEqual({ visible: false, message: "" });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
