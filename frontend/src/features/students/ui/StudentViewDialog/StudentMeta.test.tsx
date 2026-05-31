import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { StudentMeta } from "./StudentMeta";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentMeta", () => {
  it("should render section title", () => {
    renderWithTheme(
      <StudentMeta createdAt="2024-01-15T10:00:00Z" updatedAt="2024-12-20T15:30:00Z" />
    );
    expect(screen.getByText("Информация")).toBeInTheDocument();
  });

  it("should render created date", () => {
    renderWithTheme(
      <StudentMeta createdAt="2024-01-15T10:00:00Z" updatedAt="2024-12-20T15:30:00Z" />
    );
    expect(screen.getByText(/Добавлен: 15 января 2024 г\./)).toBeInTheDocument();
  });

  it("should render updated date", () => {
    renderWithTheme(
      <StudentMeta createdAt="2024-01-15T10:00:00Z" updatedAt="2024-12-20T15:30:00Z" />
    );
    expect(screen.getByText(/Обновлен: 20 декабря 2024 г\./)).toBeInTheDocument();
  });

  it("should format dates correctly", () => {
    renderWithTheme(
      <StudentMeta createdAt="2023-03-05T10:00:00Z" updatedAt="2023-11-25T10:00:00Z" />
    );
    expect(screen.getByText(/Добавлен: 5 марта 2023 г\./)).toBeInTheDocument();
    expect(screen.getByText(/Обновлен: 25 ноября 2023 г\./)).toBeInTheDocument();
  });
});
