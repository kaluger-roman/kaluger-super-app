import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { WeeklyView } from "../WeeklyView";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockLesson: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  price: 2000,
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "student-1",
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
};

const mockLesson2: Lesson = {
  ...mockLesson,
  id: "lesson-2",
  startTime: "2026-02-16T14:00:00.000Z",
  endTime: "2026-02-16T15:30:00.000Z",
  student: {
    id: "student-2",
    name: "Петр Петров",
    phone: "+79991234568",
    contactMethod: "TELEGRAM",
    archived: false,
  },
};

describe("WeeklyView", () => {
  const mockOnCardClick = vi.fn();
  const mockOnMenuClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render lessons grouped by day", () => {
      renderWithTheme(
        <WeeklyView
          lessons={[mockLesson, mockLesson2]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
    });

    it("should render empty state when no lessons", () => {
      renderWithTheme(
        <WeeklyView
          lessons={[]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("На этой неделе уроков нет")).toBeInTheDocument();
      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });

    it("should group lessons by day", () => {
      renderWithTheme(
        <WeeklyView
          lessons={[mockLesson, mockLesson2]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      const dayHeaders = screen.getAllByRole("heading", { level: 6 });
      expect(dayHeaders.length).toBeGreaterThan(0);
    });
  });

  describe("Interactions", () => {
    it("should pass callbacks to lesson cards", async () => {
      renderWithTheme(
        <WeeklyView
          lessons={[mockLesson]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      const studentName = screen.getByText("Иван Иванов");
      const card = studentName.closest(".MuiCard-root");
      expect(card).toBeInTheDocument();
      if (!card) return;

      await userEvent.click(card);
      expect(mockOnCardClick).toHaveBeenCalledWith(mockLesson);
    });
  });

  describe("Multiple lessons per day", () => {
    it("should render multiple lessons on same day", () => {
      const sameDayLesson = {
        ...mockLesson2,
        startTime: "2026-02-15T14:00:00.000Z",
        endTime: "2026-02-15T15:30:00.000Z",
      };

      renderWithTheme(
        <WeeklyView
          lessons={[mockLesson, sameDayLesson]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
    });

    it("should sort lessons by time within same day", () => {
      const laterLesson = {
        ...mockLesson,
        id: "lesson-3",
        startTime: "2026-02-15T16:00:00.000Z",
        endTime: "2026-02-15T17:30:00.000Z",
      };

      renderWithTheme(
        <WeeklyView
          lessons={[laterLesson, mockLesson]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      const cards = screen.getAllByText(/иван иванов/i);
      expect(cards.length).toBe(2);
    });

    it("should not merge lessons from different years sharing same day/month (regression: dayKey without year)", () => {
      // Regression for bug-hunt 2026-05-09 #8: groupLessonsByDay built dayKey
      // without year, so e.g. 5 May 2025 and 5 May 2026 collapsed into one
      // group with a single header.
      const lessonY1: Lesson = {
        ...mockLesson,
        id: "y1",
        startTime: "2025-05-05T10:00:00.000Z",
        endTime: "2025-05-05T11:00:00.000Z",
        student: {
          ...mockLesson.student!,
          id: "s-y1",
          name: "Студент 2025",
        },
      };
      const lessonY2: Lesson = {
        ...mockLesson,
        id: "y2",
        startTime: "2026-05-05T10:00:00.000Z",
        endTime: "2026-05-05T11:00:00.000Z",
        student: {
          ...mockLesson.student!,
          id: "s-y2",
          name: "Студент 2026",
        },
      };

      renderWithTheme(
        <WeeklyView
          lessons={[lessonY1, lessonY2]}
          type="scheduled"
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      // Two separate day headers, not one — the year now disambiguates.
      // Each header is rendered as a Typography variant="h6"; assert by text
      // since LessonCard uses additional h6 elements for student names.
      const headersFor2025 = screen.getAllByText(/2025\s*г\.?/);
      const headersFor2026 = screen.getAllByText(/2026\s*г\.?/);
      expect(headersFor2025.length).toBeGreaterThan(0);
      expect(headersFor2026.length).toBeGreaterThan(0);
      expect(screen.getByText("Студент 2025")).toBeInTheDocument();
      expect(screen.getByText("Студент 2026")).toBeInTheDocument();
    });
  });
});
