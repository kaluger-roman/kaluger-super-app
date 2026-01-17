import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Student } from "@shared";
import { theme } from "@shared";

import { studentsArchiveModel } from "../../../../models";
import { StudentFormActions } from "../StudentFormActions";

const renderWithProviders = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockActiveStudent: Student = {
  id: "1",
  name: "Иван Петров",
  phone: "+79991234567",
  archived: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockArchivedStudent: Student = {
  ...mockActiveStudent,
  archived: true,
  archivedAt: "2024-01-15T00:00:00Z",
  archiveReason: "COMPLETED_STUDIES",
};

describe("StudentFormActions", () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnDelete.mockClear();
  });

  describe("Button visibility", () => {
    it("should show save and cancel buttons when creating new student", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /добавить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /в архив/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /из архива/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /удалить/i })).not.toBeInTheDocument();
    });

    it("should show archive, delete, save, and cancel buttons for active student", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /в архив/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /сохранить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /из архива/i })).not.toBeInTheDocument();
    });

    it("should show unarchive, delete, save, and cancel buttons for archived student", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockArchivedStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /из архива/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /сохранить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /в архив/i })).not.toBeInTheDocument();
    });

    it("should show save text instead of add for existing student", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /сохранить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /добавить/i })).not.toBeInTheDocument();
    });
  });

  describe("Button interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <StudentFormActions
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /отмена/i }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /удалить/i }));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should call archiveRequested when archive button is clicked", async () => {
      const user = userEvent.setup();
      const scope = fork();

      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />,
        scope
      );

      await user.click(screen.getByRole("button", { name: /в архив/i }));

      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockActiveStudent);
    });

    it("should call unarchiveRequested when unarchive button is clicked", async () => {
      const user = userEvent.setup();
      const scope = fork();

      renderWithProviders(
        <StudentFormActions
          student={mockArchivedStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />,
        scope
      );

      await user.click(screen.getByRole("button", { name: /из архива/i }));

      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toEqual(
        mockArchivedStudent
      );
    });
  });

  describe("Loading state", () => {
    it("should disable all buttons when isLoading is true", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={true}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /в архив/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /сохранить/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /отмена/i })).toBeDisabled();
    });

    it("should show circular progress in save button when loading", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={true}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByRole("button", { name: /добавить/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton.querySelector(".MuiCircularProgress-root")).toBeInTheDocument();
    });

    it("should show save icon when not loading", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByRole("button", { name: /добавить/i });
      expect(saveButton).not.toBeDisabled();
      expect(saveButton.querySelector(".MuiCircularProgress-root")).not.toBeInTheDocument();
    });

    it("should not allow interaction with cancel button during loading", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={true}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      expect(cancelButton).toBeDisabled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should not allow interaction with delete button during loading", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={true}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      expect(deleteButton).toBeDisabled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should not allow interaction with archive button during loading", () => {
      const scope = fork();

      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={true}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />,
        scope
      );

      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      expect(archiveButton).toBeDisabled();
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();
    });
  });

  describe("Submit button type", () => {
    it("should have type submit for save button", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByRole("button", { name: /добавить/i });
      expect(saveButton).toHaveAttribute("type", "submit");
    });

    it("should not have type submit for other buttons", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole("button", { name: /в архив/i })).not.toHaveAttribute(
        "type",
        "submit"
      );
      expect(screen.getByRole("button", { name: /удалить/i })).not.toHaveAttribute(
        "type",
        "submit"
      );
      expect(screen.getByRole("button", { name: /отмена/i })).not.toHaveAttribute("type", "submit");
    });
  });

  describe("Mobile layout", () => {
    it("should apply fullWidth to all buttons when isMobile is true", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      const saveButton = screen.getByRole("button", { name: /сохранить/i });
      const cancelButton = screen.getByRole("button", { name: /отмена/i });

      expect(archiveButton).toHaveClass("MuiButton-fullWidth");
      expect(deleteButton).toHaveClass("MuiButton-fullWidth");
      expect(saveButton).toHaveClass("MuiButton-fullWidth");
      expect(cancelButton).toHaveClass("MuiButton-fullWidth");
    });

    it("should not apply fullWidth to buttons when isMobile is false", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      const saveButton = screen.getByRole("button", { name: /сохранить/i });
      const cancelButton = screen.getByRole("button", { name: /отмена/i });

      expect(archiveButton).not.toHaveClass("MuiButton-fullWidth");
      expect(deleteButton).not.toHaveClass("MuiButton-fullWidth");
      expect(saveButton).not.toHaveClass("MuiButton-fullWidth");
      expect(cancelButton).not.toHaveClass("MuiButton-fullWidth");
    });

    it("should maintain button functionality on mobile", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /отмена/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: /удалить/i }));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button variants and colors", () => {
    it("should apply correct variants to buttons for new student", () => {
      renderWithProviders(
        <StudentFormActions
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByRole("button", { name: /добавить/i });
      const cancelButton = screen.getByRole("button", { name: /отмена/i });

      expect(saveButton).toHaveClass("MuiButton-contained");
      expect(cancelButton).toHaveClass("MuiButton-text");
    });

    it("should apply correct variants and colors for existing student", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      const saveButton = screen.getByRole("button", { name: /сохранить/i });

      expect(archiveButton).toHaveClass("MuiButton-outlined");
      expect(archiveButton).toHaveClass("MuiButton-colorWarning");
      expect(deleteButton).toHaveClass("MuiButton-outlined");
      expect(deleteButton).toHaveClass("MuiButton-colorError");
      expect(saveButton).toHaveClass("MuiButton-contained");
    });

    it("should apply correct color to unarchive button", () => {
      renderWithProviders(
        <StudentFormActions
          student={mockArchivedStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const unarchiveButton = screen.getByRole("button", { name: /из архива/i });

      expect(unarchiveButton).toHaveClass("MuiButton-outlined");
      expect(unarchiveButton).toHaveClass("MuiButton-colorPrimary");
    });
  });

  describe("Integration with effector", () => {
    it("should update store state when archive button is clicked multiple times", async () => {
      const user = userEvent.setup();
      const scope = fork();

      renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />,
        scope
      );

      await user.click(screen.getByRole("button", { name: /в архив/i }));
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockActiveStudent);

      await allSettled(studentsArchiveModel.archiveDialogClosed, { scope });
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toBeNull();

      await user.click(screen.getByRole("button", { name: /в архив/i }));
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockActiveStudent);
    });

    it("should work correctly when switching between students", async () => {
      const user = userEvent.setup();
      const scope = fork();

      const { rerender } = renderWithProviders(
        <StudentFormActions
          student={mockActiveStudent}
          isLoading={false}
          isMobile={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />,
        scope
      );

      await user.click(screen.getByRole("button", { name: /в архив/i }));
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockActiveStudent);

      rerender(
        <Provider value={scope}>
          <ThemeProvider theme={theme}>
            <StudentFormActions
              student={mockArchivedStudent}
              isLoading={false}
              isMobile={false}
              onClose={mockOnClose}
              onDelete={mockOnDelete}
            />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByRole("button", { name: /из архива/i })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /из архива/i }));
      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toEqual(
        mockArchivedStudent
      );
    });
  });
});
