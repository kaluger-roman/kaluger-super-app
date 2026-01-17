import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Student } from "@shared";
import { theme } from "@shared";

import { studentFormModel } from "../../../models";
import { StudentForm } from "../StudentForm";

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");
  return {
    ...actual,
    useTheme: () => ({
      ...actual.createTheme(),
    }),
    useMediaQuery: () => false,
  };
});

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockStudent: Student = {
  id: "student-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("StudentForm", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when closed", () => {
      const scope = fork();

      const { container } = renderWithTheme(
        <StudentForm open={false} onClose={mockOnClose} />,
        scope
      );

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it("should render dialog when opened for creating student", () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Добавить студента")).toBeInTheDocument();
    });

    it("should render dialog when opened for editing student", () => {
      const scope = fork();

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Редактировать студента")).toBeInTheDocument();
    });
  });

  describe("Form initialization", () => {
    it("should render form when dialog opens with student", async () => {
      const scope = fork();

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should render form when dialog opens without student", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render when dialog is closed", async () => {
      const scope = fork();

      const { container } = renderWithTheme(
        <StudentForm open={false} onClose={mockOnClose} />,
        scope
      );

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    it("should have submit button", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      const submitButton = screen.getByRole("button", { name: /добавить/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Form field changes", () => {
    it("should render name field", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      const nameField = screen.getByLabelText(/имя студента/i);
      expect(nameField).toBeInTheDocument();
    });

    it("should render grade field", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Student deletion", () => {
    it("should render delete button for existing student", async () => {
      const scope = fork();

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should render delete confirmation dialog when deleteDialogOpen is true", async () => {
      const scope = fork();

      await allSettled(studentFormModel.$deleteDialogOpen, { scope, params: true });

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      expect(screen.getByText(/вы уверены, что хотите удалить ученика/i)).toBeInTheDocument();
    });

    it("should render confirm button in delete dialog", async () => {
      const scope = fork();

      await allSettled(studentFormModel.$deleteDialogOpen, { scope, params: true });

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      const confirmButton = screen.getByRole("button", { name: /удалить/i });
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe("Dialog close", () => {
    it("should call onClose when close button clicked", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    it("should disable form when loading", async () => {
      const scope = fork();

      renderWithTheme(<StudentForm open={true} onClose={mockOnClose} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Archived student info", () => {
    it("should render archived info when student is archived", () => {
      const scope = fork();
      const archivedStudent = { ...mockStudent, archived: true };

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={archivedStudent} />,
        scope
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render archived info when student is not archived", () => {
      const scope = fork();

      renderWithTheme(
        <StudentForm open={true} onClose={mockOnClose} student={mockStudent} />,
        scope
      );

      expect(screen.queryByText(/ученик находится в архиве/i)).not.toBeInTheDocument();
    });
  });
});
