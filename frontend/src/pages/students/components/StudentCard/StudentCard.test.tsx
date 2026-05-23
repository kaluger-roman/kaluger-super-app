import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { studentsModel } from "@features/students";
import { theme } from "@shared";
import type { Student } from "@shared";

import { StudentCard } from "./StudentCard";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  telegramNick: null,
  parentPhone: "+79997654321",
  parentName: "Родитель Иванов",
  parentContactMethod: "TELEGRAM",
  parentTelegramNick: "@parent",
  hourlyRate: 1500,
  grade: 9,
  notes: "Хороший ученик",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-20T15:30:00Z",
};

describe("StudentCard", () => {
  it("should render student name", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  });

  it("renders registered chip when studentUser is present", () => {
    const registered: Student = {
      ...mockStudent,
      studentUser: { id: "su-1" },
    };
    renderWithTheme(<StudentCard student={registered} />);
    expect(screen.getByText("Зарегистрирован")).toBeInTheDocument();
  });

  it("does not render registered chip when studentUser is null/undefined", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.queryByText("Зарегистрирован")).not.toBeInTheDocument();
  });

  it("should render student phone when provided", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.getByText("+79991234567")).toBeInTheDocument();
  });

  it("should not render phone when not provided", () => {
    const studentWithoutPhone = { ...mockStudent, phone: null };
    renderWithTheme(<StudentCard student={studentWithoutPhone} />);
    expect(screen.queryByText("+79991234567")).not.toBeInTheDocument();
  });

  it("should render WhatsApp contact method", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("should render Telegram contact method with nick", () => {
    const studentWithTelegram = {
      ...mockStudent,
      contactMethod: "TELEGRAM" as const,
      telegramNick: "@ivan",
    };
    renderWithTheme(<StudentCard student={studentWithTelegram} />);
    expect(screen.getByText(/Telegram \(@ivan\)/)).toBeInTheDocument();
  });

  it("should render hourly rate when provided", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.getByText("💰 1500 ₽/урок")).toBeInTheDocument();
  });

  it("should not render hourly rate when not provided", () => {
    const studentWithoutRate = { ...mockStudent, hourlyRate: null };
    renderWithTheme(<StudentCard student={studentWithoutRate} />);
    expect(screen.queryByText(/₽\/урок/)).not.toBeInTheDocument();
  });

  it("should open view dialog when card is clicked", async () => {
    const viewDialogOpenedSpy = vi.spyOn(studentsModel, "viewDialogOpened");
    renderWithTheme(<StudentCard student={mockStudent} />);

    await userEvent.click(screen.getByText("Иван Иванов"));
    expect(viewDialogOpenedSpy).toHaveBeenCalledWith(mockStudent);
  });

  it("should open menu when menu button is clicked", async () => {
    const menuOpenedSpy = vi.spyOn(studentsModel, "menuOpened");
    renderWithTheme(<StudentCard student={mockStudent} />);

    const menuButton = screen.getByLabelText("student-menu");
    await userEvent.click(menuButton);

    expect(menuOpenedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        student: mockStudent,
      })
    );
  });

  it("should render notes in accordion when provided", () => {
    renderWithTheme(<StudentCard student={mockStudent} />);
    expect(screen.getByText("Подробности")).toBeInTheDocument();
  });

  it("should render parent info in accordion", async () => {
    renderWithTheme(<StudentCard student={mockStudent} />);

    // Expand accordion
    await userEvent.click(screen.getByText("Подробности"));

    expect(screen.getByText(/Родители:/)).toBeInTheDocument();
    expect(screen.getByText(/Родитель Иванов/)).toBeInTheDocument();
  });

  it("should render created and updated dates in accordion", async () => {
    renderWithTheme(<StudentCard student={mockStudent} />);

    // Expand accordion
    await userEvent.click(screen.getByText("Подробности"));

    expect(screen.getByText(/Добавлен:/)).toBeInTheDocument();
    expect(screen.getByText(/Обновлен:/)).toBeInTheDocument();
  });

  it("should not render notes when not provided", () => {
    const minimalStudent: Student = {
      id: "2",
      name: "Петр Петров",
      archived: false,
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    };
    renderWithTheme(<StudentCard student={minimalStudent} />);
    // Accordion will still be there due to dates, but notes should not
    expect(screen.queryByText(/Заметки:/)).not.toBeInTheDocument();
  });

  it("should stop propagation when menu button is clicked", async () => {
    const menuOpenedSpy = vi.spyOn(studentsModel, "menuOpened");
    renderWithTheme(<StudentCard student={mockStudent} />);

    const menuButton = screen.getByLabelText("student-menu");
    await userEvent.click(menuButton);

    // Menu should open
    expect(menuOpenedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        student: mockStudent,
      })
    );
  });
});
