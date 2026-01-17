import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { LessonsDay } from "../LessonsDay";

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
  startTime: "2026-02-15T14:00:00.000Z",
  endTime: "2026-02-15T15:30:00.000Z",
  student: {
    id: "student-2",
    name: "Петр Петров",
    phone: "+79991234568",
    contactMethod: "TELEGRAM",
    archived: false,
  },
};

describe("LessonsDay", () => {
  const mockOnCardClick = vi.fn();
  const mockOnMenuClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render day title", () => {
      renderWithTheme(
        <LessonsDay
          day="Понедельник, 15 февраля"
          lessons={[mockLesson]}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Понедельник, 15 февраля")).toBeInTheDocument();
    });

    it("should render single lesson", () => {
      renderWithTheme(
        <LessonsDay
          day="Понедельник, 15 февраля"
          lessons={[mockLesson]}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should render multiple lessons", () => {
      renderWithTheme(
        <LessonsDay
          day="Понедельник, 15 февраля"
          lessons={[mockLesson, mockLesson2]}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
    });

    it("should render empty day with no lessons", () => {
      renderWithTheme(
        <LessonsDay
          day="Понедельник, 15 февраля"
          lessons={[]}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
        />
      );

      expect(screen.getByText("Понедельник, 15 февраля")).toBeInTheDocument();
      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should pass callbacks to lesson cards", async () => {
      renderWithTheme(
        <LessonsDay
          day="Понедельник, 15 февраля"
          lessons={[mockLesson]}
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
});
