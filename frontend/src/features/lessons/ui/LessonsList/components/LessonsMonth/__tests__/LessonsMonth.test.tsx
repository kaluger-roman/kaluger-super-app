import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { LessonsMonth } from "../LessonsMonth";

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

describe("LessonsMonth", () => {
  const mockOnCardClick = vi.fn();
  const mockOnMenuClick = vi.fn();
  const mockOnToggle = vi.fn();

  const mockMonthData = {
    "Понедельник, 15 февраля": [mockLesson],
    "Вторник, 16 февраля": [mockLesson2],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render month title", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.getByText(/февраль 2026/i)).toBeInTheDocument();
    });

    it("should render expand icon when collapsed", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={true}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });

    it("should render lessons when expanded", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
    });

    it("should render all days in month", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.getByText("Понедельник, 15 февраля")).toBeInTheDocument();
      expect(screen.getByText("Вторник, 16 февраля")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onToggle when month header clicked", async () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      const monthHeader = screen.getByText(/февраль 2026/i);
      await userEvent.click(monthHeader);

      expect(mockOnToggle).toHaveBeenCalled();
    });

    it("should pass callbacks to day components", async () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
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

  describe("Collapse behavior", () => {
    it("should render lessons initially when not collapsed", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should not render lesson cards when collapsed", () => {
      renderWithTheme(
        <LessonsMonth
          month="Февраль 2026"
          monthData={mockMonthData}
          isCollapsed={true}
          onToggle={mockOnToggle}
          onCardClick={mockOnCardClick}
          onMenuClick={mockOnMenuClick}
          type="scheduled"
        />
      );

      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });
  });
});
