import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { PastDateNotice } from "../PastDateNotice";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockLesson: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:30:00.000Z",
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

describe("PastDateNotice", () => {
  describe("Rendering", () => {
    it("should not render for future dates", () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 25 * 60 * 60 * 1000);

      const { container } = renderWithTheme(
        <PastDateNotice startTime={futureStart} endTime={futureEnd} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should render for past dates without lesson", () => {
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 47 * 60 * 60 * 1000);

      renderWithTheme(<PastDateNotice startTime={pastStart} endTime={pastEnd} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should render for past dates with new lesson", () => {
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 47 * 60 * 60 * 1000);

      renderWithTheme(
        <PastDateNotice startTime={pastStart} endTime={pastEnd} lesson={undefined} />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should render for completed lesson with past date", () => {
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 47 * 60 * 60 * 1000);
      const completedLesson = { ...mockLesson, status: "COMPLETED" as const };

      const { container } = renderWithTheme(
        <PastDateNotice startTime={pastStart} endTime={pastEnd} lesson={completedLesson} />
      );

      // Completed lesson with past date should not show notice
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for completed lesson with future date", () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const completedLesson = { ...mockLesson, status: "COMPLETED" as const };

      const { container } = renderWithTheme(
        <PastDateNotice startTime={futureStart} endTime={futureEnd} lesson={completedLesson} />
      );

      // Future dates should not show notice
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for cancelled lesson with future date", () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      const { container } = renderWithTheme(
        <PastDateNotice startTime={futureStart} endTime={futureEnd} lesson={cancelledLesson} />
      );

      // Future dates should not show notice
      expect(container).toBeEmptyDOMElement();
    });

    it("should render appropriate message for past lesson", () => {
      const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000);

      renderWithTheme(<PastDateNotice startTime={pastStart} endTime={pastEnd} />);

      expect(
        screen.getByText(/согласно указанной дате после сохранения статус будет 'завершён'/i)
      ).toBeInTheDocument();
    });

    it("should render appropriate message for in-progress lesson", () => {
      const pastStart = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 1 * 60 * 60 * 1000);

      renderWithTheme(<PastDateNotice startTime={pastStart} endTime={futureEnd} />);

      expect(
        screen.getByText(/согласно указанной дате после сохранения статус будет 'идёт сейчас'/i)
      ).toBeInTheDocument();
    });

    it("should render appropriate message for scheduled lesson with past start", () => {
      const pastStart = new Date(Date.now() - 30 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 30 * 60 * 1000);

      renderWithTheme(<PastDateNotice startTime={pastStart} endTime={futureEnd} />);

      expect(
        screen.getByText(/согласно указанной дате после сохранения статус будет/i)
      ).toBeInTheDocument();
    });
  });

  describe("Alert severity", () => {
    it("should render info alert", () => {
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 47 * 60 * 60 * 1000);

      renderWithTheme(<PastDateNotice startTime={pastStart} endTime={pastEnd} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-standardInfo");
    });
  });

  describe("Memoization", () => {
    it("should memoize message calculation", () => {
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 47 * 60 * 60 * 1000);

      const { rerender } = renderWithTheme(
        <PastDateNotice startTime={pastStart} endTime={pastEnd} />
      );

      const firstMessage = screen.getByRole("alert").textContent;

      rerender(
        <ThemeProvider theme={theme}>
          <PastDateNotice startTime={pastStart} endTime={pastEnd} />
        </ThemeProvider>
      );

      const secondMessage = screen.getByRole("alert").textContent;
      expect(firstMessage).toBe(secondMessage);
    });
  });
});
