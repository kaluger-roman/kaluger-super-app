import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Student } from "@shared";

import { StudentInfo } from "./StudentInfo";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentInfo", () => {
  const mockStudent: Student = {
    id: "1",
    name: "Иван Иванов",
    grade: 9,
    hourlyRate: 1500,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  it("should render student name", () => {
    renderWithTheme(<StudentInfo student={mockStudent} />);
    expect(screen.getByText("👤 Иван Иванов")).toBeInTheDocument();
  });

  it("should render grade when provided", () => {
    renderWithTheme(<StudentInfo student={mockStudent} />);
    expect(screen.getByText("🎓 9 класс")).toBeInTheDocument();
  });

  it("should not render grade when not provided", () => {
    const studentWithoutGrade = { ...mockStudent, grade: null };
    renderWithTheme(<StudentInfo student={studentWithoutGrade} />);
    expect(screen.queryByText(/класс/)).not.toBeInTheDocument();
  });

  it("should render hourly rate when provided", () => {
    renderWithTheme(<StudentInfo student={mockStudent} />);
    expect(screen.getByText("💰 1500 ₽/урок")).toBeInTheDocument();
  });

  it("should not render hourly rate when not provided", () => {
    const studentWithoutRate = { ...mockStudent, hourlyRate: null };
    renderWithTheme(<StudentInfo student={studentWithoutRate} />);
    expect(screen.queryByText(/₽\/урок/)).not.toBeInTheDocument();
  });

  it("should render all fields when all provided", () => {
    renderWithTheme(<StudentInfo student={mockStudent} />);
    expect(screen.getByText("👤 Иван Иванов")).toBeInTheDocument();
    expect(screen.getByText("🎓 9 класс")).toBeInTheDocument();
    expect(screen.getByText("💰 1500 ₽/урок")).toBeInTheDocument();
  });

  it("should render only name when no optional fields", () => {
    const minimalStudent: Student = {
      id: "1",
      name: "Петр Петров",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    };
    renderWithTheme(<StudentInfo student={minimalStudent} />);
    expect(screen.getByText("👤 Петр Петров")).toBeInTheDocument();
    expect(screen.queryByText(/класс/)).not.toBeInTheDocument();
    expect(screen.queryByText(/₽\/урок/)).not.toBeInTheDocument();
  });
});
