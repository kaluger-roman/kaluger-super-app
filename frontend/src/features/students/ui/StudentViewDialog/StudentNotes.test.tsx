import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { StudentNotes } from "./StudentNotes";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentNotes", () => {
  it("should render section title", () => {
    renderWithTheme(<StudentNotes notes="Заметка" />);
    expect(screen.getByText("🗒️ Заметки")).toBeInTheDocument();
  });

  it("should render notes content", () => {
    renderWithTheme(<StudentNotes notes="Хороший ученик" />);
    expect(screen.getByText("Хороший ученик")).toBeInTheDocument();
  });

  it("should render multiline notes", () => {
    const notes = "Хороший ученик\nНужно повторить тему\nСледующий урок в пятницу";
    renderWithTheme(<StudentNotes notes={notes} />);
    expect(screen.getByText(/Хороший ученик/)).toBeInTheDocument();
  });

  it("should render empty notes", () => {
    renderWithTheme(<StudentNotes notes="" />);
    expect(screen.getByText("🗒️ Заметки")).toBeInTheDocument();
  });
});
