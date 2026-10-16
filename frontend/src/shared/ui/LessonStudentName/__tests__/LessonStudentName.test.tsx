import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../../ui";
import { LessonStudentName } from "../LessonStudentName";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonStudentName", () => {
  it("should render student name without trial badge when student is present", () => {
    renderWithTheme(
      <LessonStudentName
        lesson={{
          student: { id: "s1", name: "Иван Иванов", archived: false },
          prospectName: null,
        }}
      />
    );

    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    expect(screen.queryByText("Пробный")).not.toBeInTheDocument();
  });

  it("should render prospect name with trial badge when student is absent", () => {
    renderWithTheme(
      <LessonStudentName lesson={{ student: undefined, prospectName: "Пётр (новый)" }} />
    );

    expect(screen.getByText("Пётр (новый)")).toBeInTheDocument();
    expect(screen.getByText("Пробный")).toBeInTheDocument();
  });

  it("should render archived badge when student is archived", () => {
    renderWithTheme(
      <LessonStudentName
        lesson={{
          student: { id: "s1", name: "Иван Иванов", archived: true },
          prospectName: null,
        }}
      />
    );

    expect(screen.getByText("Архив")).toBeInTheDocument();
  });
});
