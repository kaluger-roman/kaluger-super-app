import { ThemeProvider, Typography } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Student } from "../../../types";
import { theme } from "../../../ui";
import { StudentName } from "../StudentName";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentName", () => {
  const activeStudent: Pick<Student, "name" | "archived"> = {
    name: "Иван Иванов",
    archived: false,
  };

  const archivedStudent: Pick<Student, "name" | "archived"> = {
    name: "Петр Петров",
    archived: true,
  };

  describe("without component prop", () => {
    it("should render student name", () => {
      renderWithTheme(<StudentName student={activeStudent} />);
      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should render archive badge for archived student", () => {
      renderWithTheme(<StudentName student={archivedStudent} />);
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
      expect(screen.getByText("Архив")).toBeInTheDocument();
    });

    it("should not render archive badge for active student", () => {
      renderWithTheme(<StudentName student={activeStudent} />);
      expect(screen.queryByText("Архив")).not.toBeInTheDocument();
    });

    it("should not render archive badge when showArchived is false", () => {
      renderWithTheme(<StudentName student={archivedStudent} showArchived={false} />);
      expect(screen.getByText("Петр Петров")).toBeInTheDocument();
      expect(screen.queryByText("Архив")).not.toBeInTheDocument();
    });

    it("should render nothing when student is null", () => {
      renderWithTheme(<StudentName student={null} />);
      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });

    it("should render nothing when student is undefined", () => {
      renderWithTheme(<StudentName student={undefined} />);
      expect(screen.queryByText("Иван Иванов")).not.toBeInTheDocument();
    });
  });

  describe("with different typography variants", () => {
    it("should render with body1 variant", () => {
      renderWithTheme(<StudentName student={activeStudent} variant="body1" />);
      const element = screen.getByText("Иван Иванов");
      expect(element.className).toContain("MuiTypography-body1");
    });

    it("should render with h6 variant", () => {
      renderWithTheme(<StudentName student={activeStudent} variant="h6" />);
      const element = screen.getByText("Иван Иванов");
      expect(element.className).toContain("MuiTypography-h6");
    });

    it("should render with caption variant", () => {
      renderWithTheme(<StudentName student={activeStudent} variant="caption" />);
      const element = screen.getByText("Иван Иванов");
      expect(element.className).toContain("MuiTypography-caption");
    });
  });

  describe("with component prop", () => {
    it("should render custom component", () => {
      renderWithTheme(
        <StudentName
          student={activeStudent}
          component={<Typography variant="h5">Custom Component</Typography>}
        />
      );
      expect(screen.getByText("Custom Component")).toBeInTheDocument();
    });

    it("should render archive badge with custom component for archived student", () => {
      renderWithTheme(
        <StudentName
          student={archivedStudent}
          component={<Typography variant="h5">Custom Component</Typography>}
        />
      );
      expect(screen.getByText("Custom Component")).toBeInTheDocument();
      expect(screen.getByText("Архив")).toBeInTheDocument();
    });

    it("should not render archive badge when showArchived is false with custom component", () => {
      renderWithTheme(
        <StudentName
          student={archivedStudent}
          showArchived={false}
          component={<Typography variant="h5">Custom Component</Typography>}
        />
      );
      expect(screen.getByText("Custom Component")).toBeInTheDocument();
      expect(screen.queryByText("Архив")).not.toBeInTheDocument();
    });

    it("should render nothing when student is null with component prop", () => {
      renderWithTheme(
        <StudentName
          student={null}
          component={<Typography variant="h5">Custom Component</Typography>}
        />
      );
      expect(screen.queryByText("Custom Component")).not.toBeInTheDocument();
    });
  });

  describe("archive badge styling", () => {
    it("should render archive badge as a chip", () => {
      renderWithTheme(<StudentName student={archivedStudent} />);
      const badge = screen.getByText("Архив");
      expect(badge).toHaveClass("MuiChip-label");
    });
  });
});
