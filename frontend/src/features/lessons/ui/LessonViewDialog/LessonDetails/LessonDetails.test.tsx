import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import { LessonDetails } from "./LessonDetails";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonDetails", () => {
  const mockLesson: Lesson = {
    id: "1",
    subject: "PHYSICS",
    lessonType: "EGE",
    description: "Test description",
    startTime: "2026-01-15T10:00:00.000Z",
    endTime: "2026-01-15T11:00:00.000Z",
    price: 1500,
    isPaid: false,
    status: "SCHEDULED",
    homework: "Do exercises 1-10",
    notes: "Important notes",
    studentId: "student-1",
    student: {
      archived: false,
      id: "student-1",
      name: "Иван Иванов",
      phone: "+79991234567",
      contactMethod: "WHATSAPP",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("should render student name", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("👤")).toBeInTheDocument();
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  });

  it("should render subject and lesson type", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Физика.*ЕГЭ/)).toBeInTheDocument();
  });

  it("should render price when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/1500 ₽/)).toBeInTheDocument();
  });

  it("should render free when no price", () => {
    const lessonWithoutPrice = { ...mockLesson, price: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutPrice} />);
    expect(screen.getByText(/Бесплатно/)).toBeInTheDocument();
  });

  it("should render start time", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Начало:/)).toBeInTheDocument();
  });

  it("should render end time", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Окончание:/)).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📝 Описание")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("should not render description section when not provided", () => {
    const lessonWithoutDescription = { ...mockLesson, description: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutDescription} />);
    expect(screen.queryByText("📝 Описание")).not.toBeInTheDocument();
  });

  it("should render homework when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📖 Домашнее задание")).toBeInTheDocument();
    expect(screen.getByText("Do exercises 1-10")).toBeInTheDocument();
  });

  it("should not render homework section when not provided", () => {
    const lessonWithoutHomework = { ...mockLesson, homework: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutHomework} />);
    expect(screen.queryByText("📖 Домашнее задание")).not.toBeInTheDocument();
  });

  it("should render notes when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("🗒️ Заметки")).toBeInTheDocument();
    expect(screen.getByText("Important notes")).toBeInTheDocument();
  });

  it("should not render notes section when not provided", () => {
    const lessonWithoutNotes = { ...mockLesson, notes: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutNotes} />);
    expect(screen.queryByText("🗒️ Заметки")).not.toBeInTheDocument();
  });

  it("should render grade when provided", () => {
    const lessonWithGrade = { ...mockLesson, grade: 5 };
    renderWithTheme(<LessonDetails lesson={lessonWithGrade} />);
    expect(screen.getByText("⭐ Оценка")).toBeInTheDocument();
  });

  it("should not render grade section when not provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.queryByText("⭐ Оценка")).not.toBeInTheDocument();
  });

  it("should render time section", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📅 Время")).toBeInTheDocument();
  });

  it("should render mathematics subject correctly", () => {
    const mathLesson = { ...mockLesson, subject: "MATHEMATICS" as const };
    renderWithTheme(<LessonDetails lesson={mathLesson} />);
    expect(screen.getByText(/Математика/)).toBeInTheDocument();
  });

  it("should render different lesson types", () => {
    const ogeLesson = { ...mockLesson, lessonType: "OGE" as const };
    renderWithTheme(<LessonDetails lesson={ogeLesson} />);
    expect(screen.getByText(/ОГЭ/)).toBeInTheDocument();
  });

  it("should render recurring lesson indicator when applicable", () => {
    const recurringLesson = { ...mockLesson, isRecurring: true };
    renderWithTheme(<LessonDetails lesson={recurringLesson} />);
    // Component should show some indication of recurring status
  });
});
