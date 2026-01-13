import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { EmptyStudentsState } from "./EmptyStudentsState";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("EmptyStudentsState", () => {
  it("should render empty state title", () => {
    renderWithTheme(<EmptyStudentsState />);
    expect(screen.getByText("📚 У вас пока нет учеников")).toBeInTheDocument();
  });

  it("should render empty state description", () => {
    renderWithTheme(<EmptyStudentsState />);
    expect(screen.getByText('Добавьте первого ученика, нажав на кнопку "+"')).toBeInTheDocument();
  });

  it("should render title with correct variant", () => {
    renderWithTheme(<EmptyStudentsState />);
    const title = screen.getByText("📚 У вас пока нет учеников");
    expect(title.tagName).toBe("H5");
  });
});
