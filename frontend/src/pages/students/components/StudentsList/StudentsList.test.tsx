import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";
import type { Student } from "@shared";

import { StudentsList } from "./StudentsList";

vi.mock("../StudentCard", () => ({
  StudentCard: ({ student }: { student: Student }) => (
    <div data-testid={`student-card-${student.id}`}>{student.name}</div>
  ),
}));

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Иван 9 класс",
    grade: 9,
    archived: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Петр 9 класс",
    grade: 9,
    archived: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "3",
    name: "Мария 11 класс",
    grade: 11,
    archived: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "4",
    name: "Сергей без класса",
    grade: null,
    archived: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
];

describe("StudentsList", () => {
  it("should render all students grouped by grade", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    expect(screen.getByText("Иван 9 класс")).toBeInTheDocument();
    expect(screen.getByText("Петр 9 класс")).toBeInTheDocument();
    expect(screen.getByText("Мария 11 класс")).toBeInTheDocument();
    expect(screen.getByText("Сергей без класса")).toBeInTheDocument();
  });

  it("should group students by grade correctly", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    expect(screen.getByText("9 класс (2 учеников)")).toBeInTheDocument();
    expect(screen.getByText("11 класс (1 ученик)")).toBeInTheDocument();
    expect(screen.getByText("Без класса (1 ученик)")).toBeInTheDocument();
  });

  it("should display correct student count in singular form", () => {
    const singleStudent = [mockStudents[2]]; // Only one 11th grader
    renderWithTheme(<StudentsList students={singleStudent} />);

    expect(screen.getByText("11 класс (1 ученик)")).toBeInTheDocument();
  });

  it("should display correct student count in plural form", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    expect(screen.getByText("9 класс (2 учеников)")).toBeInTheDocument();
  });

  it("should render accordions as expanded by default", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    // All students should be visible without clicking
    expect(screen.getByTestId("student-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-4")).toBeInTheDocument();
  });

  it("should collapse and expand accordion on click", async () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    const gradeHeader = screen.getByText("9 класс (2 учеников)");

    // Collapse
    await userEvent.click(gradeHeader);
    expect(screen.queryByTestId("student-card-1")).not.toBeVisible();

    // Expand
    await userEvent.click(gradeHeader);
    expect(screen.getByTestId("student-card-1")).toBeVisible();
  });

  it("should render empty list when no students provided", () => {
    renderWithTheme(<StudentsList students={[]} />);
    expect(screen.queryByTestId(/student-card-/)).not.toBeInTheDocument();
  });

  it("should sort grades in ascending order", () => {
    const studentsWithMixedGrades: Student[] = [
      {
        id: "1",
        name: "Student 1",
        grade: 11,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        archived: false,
      },
      {
        id: "2",
        name: "Student 2",
        grade: 5,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        archived: false,
      },
      {
        id: "3",
        name: "Student 3",
        grade: 9,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        archived: false,
      },
    ];

    renderWithTheme(<StudentsList students={studentsWithMixedGrades} />);

    const grades = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => text?.includes("класс"));

    expect(grades[0]).toContain("5 класс");
    expect(grades[1]).toContain("9 класс");
    expect(grades[2]).toContain("11 класс");
  });

  it("should place students without grade at the end", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    const grades = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => text?.includes("класс"));

    const lastGrade = grades[grades.length - 1];
    expect(lastGrade).toContain("Без класса");
  });

  it("should render each student in a StudentCard component", () => {
    renderWithTheme(<StudentsList students={mockStudents} />);

    expect(screen.getByTestId("student-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("student-card-4")).toBeInTheDocument();
  });
});
