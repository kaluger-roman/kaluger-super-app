import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import { LessonCell } from "../LessonCell";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonCell", () => {
  const mockLesson: Lesson = {
    id: "1",
    subject: "PHYSICS",
    lessonType: "EGE",
    startTime: "2026-01-15T10:00:00.000Z",
    endTime: "2026-01-15T11:00:00.000Z",
    price: 1500,
    isPaid: false,
    status: "SCHEDULED",
    studentId: "student-1",
    student: {
      id: "student-1",
      name: "Иван Иванов",
      phone: "+79991234567",
      contactMethod: "WHATSAPP",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("should render student name", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  });

  it("should render subject and lesson type", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);
    expect(screen.getByText(/Физика.*ЕГЭ/)).toBeInTheDocument();
  });

  it("should render price when provided", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);
    expect(screen.getByText("1500₽")).toBeInTheDocument();
  });

  it("should render unpaid indicator when not paid", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);
    expect(screen.getByText("Не оплачен")).toBeInTheDocument();
  });

  it("should not render unpaid indicator when paid", () => {
    const onClick = vi.fn();
    const paidLesson = { ...mockLesson, isPaid: true };
    renderWithTheme(<LessonCell lesson={paidLesson} onClick={onClick} />);
    expect(screen.queryByText("Не оплачен")).not.toBeInTheDocument();
  });

  it("should not render price section when no price", () => {
    const onClick = vi.fn();
    const lessonWithoutPrice = { ...mockLesson, price: undefined };
    renderWithTheme(<LessonCell lesson={lessonWithoutPrice} onClick={onClick} />);
    expect(screen.queryByText(/₽/)).not.toBeInTheDocument();
  });

  it("should render status label", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);
    expect(screen.getByText("Запланирован")).toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);

    await userEvent.click(screen.getByText("Иван Иванов"));

    expect(onClick).toHaveBeenCalledWith(mockLesson);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render in compact mode", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} compact />);

    expect(screen.getByText(/1500₽ Иван Иванов/)).toBeInTheDocument();
    expect(screen.queryByText("Запланирован")).not.toBeInTheDocument();
  });

  it("should render compact mode without price", () => {
    const onClick = vi.fn();
    const lessonWithoutPrice = { ...mockLesson, price: undefined };
    renderWithTheme(<LessonCell lesson={lessonWithoutPrice} onClick={onClick} compact />);

    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  });

  it("should render time range", () => {
    const onClick = vi.fn();
    renderWithTheme(<LessonCell lesson={mockLesson} onClick={onClick} />);

    // Time format should be HH:mm-HH:mm
    const timeText = screen.getByText(/\d{2}:\d{2}-\d{2}:\d{2}/);
    expect(timeText).toBeInTheDocument();
  });

  it("should render completed status", () => {
    const onClick = vi.fn();
    const completedLesson = { ...mockLesson, status: "COMPLETED" as const };
    renderWithTheme(<LessonCell lesson={completedLesson} onClick={onClick} />);

    expect(screen.getByText("Завершен")).toBeInTheDocument();
  });

  it("should render cancelled status", () => {
    const onClick = vi.fn();
    const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };
    renderWithTheme(<LessonCell lesson={cancelledLesson} onClick={onClick} />);

    expect(screen.getByText("Отменен")).toBeInTheDocument();
  });

  it("should render in-progress status", () => {
    const onClick = vi.fn();
    const inProgressLesson = { ...mockLesson, status: "IN_PROGRESS" as const };
    renderWithTheme(<LessonCell lesson={inProgressLesson} onClick={onClick} />);

    expect(screen.getByText("В процессе")).toBeInTheDocument();
  });

  it("should render mathematics subject", () => {
    const onClick = vi.fn();
    const mathLesson = { ...mockLesson, subject: "MATHEMATICS" as const };
    renderWithTheme(<LessonCell lesson={mathLesson} onClick={onClick} />);

    expect(screen.getByText(/Математика/)).toBeInTheDocument();
  });

  it("should render OGE lesson type", () => {
    const onClick = vi.fn();
    const ogeLesson = { ...mockLesson, lessonType: "OGE" as const };
    renderWithTheme(<LessonCell lesson={ogeLesson} onClick={onClick} />);

    expect(screen.getByText(/ОГЭ/)).toBeInTheDocument();
  });

  it("should render OLYMPICS lesson type", () => {
    const onClick = vi.fn();
    const olympicsLesson = { ...mockLesson, lessonType: "OLYMPICS" as const };
    renderWithTheme(<LessonCell lesson={olympicsLesson} onClick={onClick} />);

    expect(screen.getByText(/Олимпиады/)).toBeInTheDocument();
  });

  it("should render SCHOOL lesson type", () => {
    const onClick = vi.fn();
    const schoolLesson = { ...mockLesson, lessonType: "SCHOOL" as const };
    renderWithTheme(<LessonCell lesson={schoolLesson} onClick={onClick} />);

    expect(screen.getByText(/Школа/)).toBeInTheDocument();
  });
});
