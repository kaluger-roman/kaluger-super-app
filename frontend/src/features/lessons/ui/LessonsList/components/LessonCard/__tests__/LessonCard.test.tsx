import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { LessonCard } from "../LessonCard";

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

describe("LessonCard", () => {
  describe("Rendering", () => {
    it("should render prospect name with trial badge for lesson without student", () => {
      const prospectLesson: Lesson = {
        ...mockLesson,
        studentId: null,
        student: undefined,
        prospectName: "Пётр (пробный)",
        prospectPhone: "+79990000000",
        prospectContactMethod: "MAX",
        price: 0,
      };
      renderWithTheme(<LessonCard lesson={prospectLesson} />);

      expect(screen.getByText("Пётр (пробный)")).toBeInTheDocument();
      expect(screen.getByText("Пробный")).toBeInTheDocument();
      expect(screen.getByText(/Бесплатно/)).toBeInTheDocument();
    });

    it("should render lesson details", () => {
      renderWithTheme(<LessonCard lesson={mockLesson} />);

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return element?.textContent === "💰 2000 ₽" || false;
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/математика/i)).toBeInTheDocument();
      expect(screen.getByText(/егэ/i)).toBeInTheDocument();
    });

    it("should render free lesson when price is 0", () => {
      const freeLesson = { ...mockLesson, price: 0 };

      renderWithTheme(<LessonCard lesson={freeLesson} />);

      expect(
        screen.getByText((content, element) => {
          return element?.textContent === "💰 Бесплатно" || false;
        })
      ).toBeInTheDocument();
    });

    it("should render status chip", () => {
      renderWithTheme(<LessonCard lesson={mockLesson} />);

      expect(screen.getByText("Запланирован")).toBeInTheDocument();
    });

    it("should render recurring badge when lesson is recurring", () => {
      const recurringLesson = { ...mockLesson, isRecurring: true };

      renderWithTheme(<LessonCard lesson={recurringLesson} />);

      expect(screen.getByText(/регулярный/i)).toBeInTheDocument();
    });

    it("should render payment date when lesson is paid", () => {
      const paidLesson = { ...mockLesson, isPaid: true, paymentDate: "2026-02-15T10:00:00.000Z" };

      renderWithTheme(<LessonCard lesson={paidLesson} />);

      expect(screen.getByText(/оплачено/i)).toBeInTheDocument();
    });

    it("should not render payment date when lesson is not paid", () => {
      renderWithTheme(<LessonCard lesson={mockLesson} />);

      expect(screen.queryByText(/оплачено/i)).not.toBeInTheDocument();
    });

    it("should render menu button when onMenuClick provided", () => {
      const mockOnMenuClick = vi.fn();

      renderWithTheme(<LessonCard lesson={mockLesson} onMenuClick={mockOnMenuClick} />);

      expect(screen.getByTestId("MoreVertIcon")).toBeInTheDocument();
    });

    it("should not render menu button when onMenuClick not provided", () => {
      renderWithTheme(<LessonCard lesson={mockLesson} />);

      expect(screen.queryByTestId("MoreVertIcon")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onCardClick when card is clicked", async () => {
      const mockOnCardClick = vi.fn();

      renderWithTheme(<LessonCard lesson={mockLesson} onCardClick={mockOnCardClick} />);

      const studentName = screen.getByText("Иван Иванов");
      const card = studentName.closest(".MuiCard-root");
      expect(card).toBeInTheDocument();
      if (!card) return;

      await userEvent.click(card);
      expect(mockOnCardClick).toHaveBeenCalledWith(mockLesson);
    });

    it("should call onMenuClick when menu button is clicked", async () => {
      const mockOnMenuClick = vi.fn();

      renderWithTheme(<LessonCard lesson={mockLesson} onMenuClick={mockOnMenuClick} />);

      const menuIcon = screen.getByTestId("MoreVertIcon");
      const menuButton = menuIcon.parentElement;
      expect(menuButton).toBeInTheDocument();
      if (!menuButton) return;

      await userEvent.click(menuButton);

      expect(mockOnMenuClick).toHaveBeenCalled();
    });

    it("should not call onCardClick when card clicked without handler", async () => {
      const mockOnCardClick = vi.fn();

      renderWithTheme(<LessonCard lesson={mockLesson} />);

      const studentName = screen.getByText("Иван Иванов");
      const card = studentName.closest(".MuiCard-root");
      expect(card).toBeInTheDocument();
      if (!card) return;

      await userEvent.click(card);
      expect(mockOnCardClick).not.toHaveBeenCalled();
    });
  });

  describe("Status colors", () => {
    it("should render completed lesson with success color", () => {
      const completedLesson = { ...mockLesson, status: "COMPLETED" as const };

      renderWithTheme(<LessonCard lesson={completedLesson} />);

      expect(screen.getByText("Завершен")).toBeInTheDocument();
    });

    it("should render cancelled lesson with error color", () => {
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      renderWithTheme(<LessonCard lesson={cancelledLesson} />);

      expect(screen.getByText("Отменен")).toBeInTheDocument();
    });

    it("should render in-progress lesson", () => {
      const inProgressLesson = { ...mockLesson, status: "IN_PROGRESS" as const };

      renderWithTheme(<LessonCard lesson={inProgressLesson} />);

      expect(screen.getByText("В процессе")).toBeInTheDocument();
    });
  });

  describe("Memoization", () => {
    it("should not re-render when parent re-renders with identical props (React.memo)", () => {
      const renderSpy = vi.fn();
      const Probe = ({ lesson }: { lesson: Lesson }) => {
        renderSpy();
        return <LessonCard lesson={lesson} />;
      };

      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <Probe lesson={mockLesson} />
        </ThemeProvider>
      );

      const firstChild = screen.getByText("Иван Иванов");

      rerender(
        <ThemeProvider theme={theme}>
          <Probe lesson={mockLesson} />
        </ThemeProvider>
      );

      const secondChild = screen.getByText("Иван Иванов");
      expect(secondChild).toBe(firstChild);
      expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Notes", () => {
    it("should render the notes block when the lesson has a non-empty note", () => {
      const lessonWithNotes = { ...mockLesson, notes: "Разобрать домашнее задание" };

      renderWithTheme(<LessonCard lesson={lessonWithNotes} />);

      expect(screen.getByText(/Разобрать домашнее задание/)).toBeInTheDocument();
    });

    it("should not render the notes block when the lesson has no note", () => {
      renderWithTheme(<LessonCard lesson={mockLesson} />);

      expect(screen.queryByText(/📝/)).not.toBeInTheDocument();
    });

    it("should not render the notes block when the note is whitespace-only", () => {
      const lessonWithBlankNotes = { ...mockLesson, notes: "   \n\t  " };

      renderWithTheme(<LessonCard lesson={lessonWithBlankNotes} />);

      expect(screen.queryByText(/📝/)).not.toBeInTheDocument();
    });
  });

  describe("Student archived", () => {
    it("should render archived badge for archived student", () => {
      if (!mockLesson.student) return;

      const lessonWithArchivedStudent = {
        ...mockLesson,
        student: {
          id: mockLesson.student.id,
          name: mockLesson.student.name,
          phone: mockLesson.student.phone,
          contactMethod: mockLesson.student.contactMethod,
          archived: true,
        },
      };

      renderWithTheme(<LessonCard lesson={lessonWithArchivedStudent} />);

      expect(screen.getByText("Архив")).toBeInTheDocument();
    });
  });
});
