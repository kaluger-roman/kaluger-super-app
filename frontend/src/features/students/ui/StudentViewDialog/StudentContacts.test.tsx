import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Student } from "@shared";

import { StudentContacts } from "./StudentContacts";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentContacts", () => {
  const mockStudent: Student = {
    id: "1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    parentPhone: "+79997654321",
    parentName: "Родитель Иванов",
    parentContactMethod: "TELEGRAM",
    parentTelegramNick: "parent",
    telegramNick: "ivan",
    archived: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  it("should render section title", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText("📞 Контакты")).toBeInTheDocument();
  });

  it("should render student phone when provided", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/Телефон: \+79991234567/)).toBeInTheDocument();
  });

  it("should not render student phone when not provided", () => {
    const studentWithoutPhone = { ...mockStudent, phone: null };
    renderWithTheme(<StudentContacts student={studentWithoutPhone} />);
    expect(screen.queryByText(/Телефон:/)).not.toBeInTheDocument();
  });

  it("should render WhatsApp contact method", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument();
  });

  it("should render Telegram contact method with nick", () => {
    const studentWithTelegram = {
      ...mockStudent,
      contactMethod: "TELEGRAM" as const,
      telegramNick: "ivan",
    };
    renderWithTheme(<StudentContacts student={studentWithTelegram} />);
    expect(screen.getByText(/Telegram \(ivan\)/)).toBeInTheDocument();
  });

  it("should render parent phone when provided", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/\+79997654321/)).toBeInTheDocument();
  });

  it("should render parent name when provided", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/Родитель Иванов/)).toBeInTheDocument();
  });

  it("should render parent contact method", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/Родители:.*Telegram/)).toBeInTheDocument();
  });

  it("should render parent telegram nick when provided", () => {
    renderWithTheme(<StudentContacts student={mockStudent} />);
    expect(screen.getByText(/Telegram \(родители\): @parent/)).toBeInTheDocument();
  });

  it("should not render parent telegram nick when parent uses WhatsApp", () => {
    const studentWithWhatsAppParent = {
      ...mockStudent,
      parentContactMethod: "WHATSAPP" as const,
    };
    renderWithTheme(<StudentContacts student={studentWithWhatsAppParent} />);
    expect(screen.queryByText(/Telegram \(родители\)/)).not.toBeInTheDocument();
  });

  it("should render parent info without name when name not provided", () => {
    const studentWithoutParentName = { ...mockStudent, parentName: null };
    renderWithTheme(<StudentContacts student={studentWithoutParentName} />);
    expect(screen.getByText(/Родители:.*\+79997654321/)).toBeInTheDocument();
    expect(screen.queryByText(/Родитель Иванов/)).not.toBeInTheDocument();
  });

  it("should not render parent section when parent phone not provided", () => {
    const studentWithoutParent = { ...mockStudent, parentPhone: null };
    renderWithTheme(<StudentContacts student={studentWithoutParent} />);
    expect(screen.queryByText(/Родители:/)).not.toBeInTheDocument();
  });
});
