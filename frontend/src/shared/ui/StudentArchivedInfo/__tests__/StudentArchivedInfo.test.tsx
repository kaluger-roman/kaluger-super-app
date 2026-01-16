import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../../ui";
import { StudentArchivedInfo } from "../StudentArchivedInfo";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentArchivedInfo", () => {
  describe("default variant", () => {
    it("should render archived date", () => {
      renderWithTheme(<StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" />);
      expect(screen.getByText(/В архиве с:/)).toBeInTheDocument();
      expect(screen.getByText(/15 января 2024 г./)).toBeInTheDocument();
    });

    it("should render archive reason when provided", () => {
      renderWithTheme(
        <StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" archiveReason="COMPLETED_STUDIES" />
      );
      expect(screen.getByText(/Причина:/)).toBeInTheDocument();
      expect(screen.getByText(/Закончил обучение/)).toBeInTheDocument();
    });

    it("should render archive comment when provided", () => {
      renderWithTheme(
        <StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" archiveComment="Test comment" />
      );
      expect(screen.getByText("Test comment")).toBeInTheDocument();
    });

    it("should not render reason section when not provided", () => {
      renderWithTheme(<StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" />);
      expect(screen.queryByText(/Причина:/)).not.toBeInTheDocument();
    });

    it("should not render comment when not provided", () => {
      renderWithTheme(<StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" />);
      expect(screen.queryByText("Test comment")).not.toBeInTheDocument();
    });

    it("should render all fields when all provided", () => {
      renderWithTheme(
        <StudentArchivedInfo
          archivedAt="2024-01-15T10:00:00Z"
          archiveReason="FOUND_ANOTHER_TUTOR"
          archiveComment="Found a better tutor"
        />
      );
      expect(screen.getByText(/В архиве с:/)).toBeInTheDocument();
      expect(screen.getByText(/Нашел другого преподавателя/)).toBeInTheDocument();
      expect(screen.getByText("Found a better tutor")).toBeInTheDocument();
    });
  });

  describe("compact variant", () => {
    it("should render archived date in compact mode", () => {
      renderWithTheme(<StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" variant="compact" />);
      expect(screen.getByText(/📦 В архиве с:/)).toBeInTheDocument();
      expect(screen.getByText(/15 января 2024 г./)).toBeInTheDocument();
    });

    it("should render reason inline in compact mode", () => {
      renderWithTheme(
        <StudentArchivedInfo
          archivedAt="2024-01-15T10:00:00Z"
          archiveReason="CHANGED_MIND"
          variant="compact"
        />
      );
      expect(screen.getByText(/Передумал заниматься предметом/)).toBeInTheDocument();
    });

    it("should not render comment in compact mode", () => {
      renderWithTheme(
        <StudentArchivedInfo
          archivedAt="2024-01-15T10:00:00Z"
          archiveComment="Test comment"
          variant="compact"
        />
      );
      expect(screen.queryByText("Test comment")).not.toBeInTheDocument();
    });

    it("should render reason with emoji in compact mode", () => {
      renderWithTheme(
        <StudentArchivedInfo
          archivedAt="2024-01-15T10:00:00Z"
          archiveReason="POOR_EFFORT"
          variant="compact"
        />
      );
      const text = screen.getByText(/📦 В архиве с:/);
      expect(text.textContent).toContain("Плохо старался на занятиях");
    });
  });

  describe("different archive reasons", () => {
    const reasons = [
      { value: "COMPLETED_STUDIES", label: "Закончил обучение" },
      { value: "FOUND_ANOTHER_TUTOR", label: "Нашел другого преподавателя" },
      { value: "CHANGED_MIND", label: "Передумал заниматься предметом" },
      { value: "POOR_EFFORT", label: "Плохо старался на занятиях" },
      { value: "MISSED_LESSONS", label: "Пропускал занятия" },
    ] as const;

    reasons.forEach(({ value, label }) => {
      it(`should render ${value} reason correctly`, () => {
        renderWithTheme(
          <StudentArchivedInfo archivedAt="2024-01-15T10:00:00Z" archiveReason={value} />
        );
        expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
      });
    });
  });
});
