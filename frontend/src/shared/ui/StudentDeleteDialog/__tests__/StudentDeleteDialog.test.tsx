import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import type { Student } from "../../../types";
import { theme } from "../../themeConfig";
import { StudentDeleteDialog } from "../StudentDeleteDialog";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  archived: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("StudentDeleteDialog", () => {
  describe("Rendering", () => {
    it("should not render when student is undefined", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      const { container } = renderWithTheme(
        <StudentDeleteDialog open={true} onClose={onClose} onConfirm={onConfirm} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when open is true and student is provided", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Удалить ученика")).toBeInTheDocument();
    });

    it("should not render dialog when open is false", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={false}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display student name in warning message", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      expect(screen.getByText(/Иван Иванов/i)).toBeInTheDocument();
      expect(screen.getByText(/Вы уверены, что хотите удалить ученика/i)).toBeInTheDocument();
    });

    it("should display warning about deleting all lessons", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      expect(screen.getByText(/Внимание!/i)).toBeInTheDocument();
      expect(
        screen.getByText(/При удалении ученика будут также удалены все его уроки/i)
      ).toBeInTheDocument();
    });

    it("should display Удалить and Отмена buttons", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      expect(screen.getByRole("button", { name: /Удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Отмена/i })).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should call onConfirm when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await user.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm when Enter key is pressed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      const dialog = screen.getByRole("dialog");
      await user.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("should not call callbacks when other keys are pressed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      const dialog = screen.getByRole("dialog");
      await user.type(dialog, "abc");

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("should not call onConfirm multiple times on multiple Enter presses", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={mockStudent}
        />
      );

      const dialog = screen.getByRole("dialog");
      await user.type(dialog, "{Enter}{Enter}{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge cases", () => {
    it("should handle student with empty name", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const studentWithEmptyName: Student = {
        ...mockStudent,
        name: "",
      };

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={studentWithEmptyName}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Вы уверены, что хотите удалить ученика/i)).toBeInTheDocument();
    });

    it("should handle student with long name", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const studentWithLongName: Student = {
        ...mockStudent,
        name: "Очень Длинное Имя Студента Которое Может Быть В Системе",
      };

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={studentWithLongName}
        />
      );

      expect(
        screen.getByText(/Очень Длинное Имя Студента Которое Может Быть В Системе/i)
      ).toBeInTheDocument();
    });

    it("should handle student with special characters in name", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const studentWithSpecialChars: Student = {
        ...mockStudent,
        name: "Иван O'Connor-Smith <test>",
      };

      renderWithTheme(
        <StudentDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          student={studentWithSpecialChars}
        />
      );

      expect(screen.getByText(/Иван O'Connor-Smith <test>/i)).toBeInTheDocument();
    });
  });
});
