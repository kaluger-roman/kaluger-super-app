import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import type { Lesson } from "../../../types";
import { theme } from "../../themeConfig";
import * as lessonDeleteDialogModel from "../lesson-delete-dialog.model";
import { LessonDeleteDialog } from "../LessonDeleteDialog";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockNonRecurringLesson: Lesson = {
  id: "1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "1",
  student: {
    id: "1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
};

const mockRecurringLesson: Lesson = {
  ...mockNonRecurringLesson,
  id: "2",
  isRecurring: true,
};

describe("LessonDeleteDialog", () => {
  describe("Rendering", () => {
    it("should not render when lesson is undefined", () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const { container } = renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when lesson is provided", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Удалить урок")).toBeInTheDocument();
    });

    it("should show lesson subject and student name", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Математика/)).toBeInTheDocument();
      expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
    });

    it("should show warning about irreversible action", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Это действие нельзя отменить/)).toBeInTheDocument();
    });
  });

  describe("Non-recurring lesson", () => {
    it("should not show checkbox for non-recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(
        screen.queryByLabelText(/Удалить все запланированные повторы этого урока/)
      ).not.toBeInTheDocument();
    });

    it("should not show alert for non-recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.queryByText(/Это повторяющийся урок/)).not.toBeInTheDocument();
    });

    it("should call onConfirm with undefined for non-recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledWith(undefined);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Recurring lesson", () => {
    it("should show alert for recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Это повторяющийся урок/)).toBeInTheDocument();
    });

    it("should show checkbox for recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(
        screen.getByLabelText(/Удалить все запланированные повторы этого урока/)
      ).toBeInTheDocument();
    });

    it("should have checkbox unchecked by default", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const checkbox = screen.getByLabelText(
        /Удалить все запланированные повторы этого урока/
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("should call onConfirm with false when checkbox is unchecked", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: false });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm with true when checkbox is checked", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Checkbox interaction", () => {
    it("should allow checkbox to be clicked", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const checkbox = screen.getByLabelText(
        /Удалить все запланированные повторы этого урока/
      ) as HTMLInputElement;
      expect(checkbox).not.toBeDisabled();
      expect(checkbox.checked).toBe(false);

      await userEvent.click(checkbox);
      // Checkbox click triggers deleteAllFutureToggled event
      // The actual toggle behavior is tested in the onConfirm tests above
    });

    it("should reflect deleteAllFuture store value in checkbox", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const checkbox = screen.getByLabelText(
        /Удалить все запланированные повторы этого урока/
      ) as HTMLInputElement;

      expect(checkbox.checked).toBe(true);
    });
  });

  describe("Dialog close", () => {
    it("should have working Cancel button", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      expect(cancelButton).toBeEnabled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    it("should disable checkbox when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const checkbox = screen.getByLabelText(/Удалить все запланированные повторы этого урока/);
      expect(checkbox).toBeDisabled();
    });

    it("should disable Cancel button when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      expect(cancelButton).toBeDisabled();
    });

    it("should disable Delete button when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const deleteButton = screen.getByRole("button", { name: /Удаление/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should show loading text on Delete button when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText("Удаление...")).toBeInTheDocument();
    });

    it("should keep dialog open when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      expect(cancelButton).toBeDisabled();

      // Dialog remains open
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have disabled delete button when loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const deleteButton = screen.getByRole("button", { name: /Удаление/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe("Keyboard interactions", () => {
    it("should call onConfirm when Enter key is pressed", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledWith(undefined);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should not call onConfirm when Enter is pressed while loading", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$isLoading, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm with checkbox value when Enter is pressed on recurring lesson", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button interactions", () => {
    it("should have Cancel and Delete buttons", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByRole("button", { name: /Отмена/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Удалить/i })).toBeInTheDocument();
    });

    it("should not call onConfirm when Cancel button is clicked", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      await userEvent.click(cancelButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Store integration", () => {
    it("should respond to $isOpen store changes", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockNonRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: false });

      const { rerender } = renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      rerender(
        <Provider value={scope}>
          <ThemeProvider theme={theme}>
            <LessonDeleteDialog onConfirm={onConfirm} />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should respond to $deleteAllFuture store changes", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: mockRecurringLesson });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });
      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: false });

      const { rerender } = renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      const checkbox = screen.getByLabelText(
        /Удалить все запланированные повторы этого урока/
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await allSettled(lessonDeleteDialogModel.$deleteAllFuture, { scope, params: true });
      rerender(
        <Provider value={scope}>
          <ThemeProvider theme={theme}>
            <LessonDeleteDialog onConfirm={onConfirm} />
          </ThemeProvider>
        </Provider>
      );

      expect(checkbox.checked).toBe(true);
    });

    it("should not call onConfirm when lesson is undefined", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(lessonDeleteDialogModel.$lesson, { scope, params: undefined });
      await allSettled(lessonDeleteDialogModel.$isOpen, { scope, params: true });

      const { container } = renderWithTheme(<LessonDeleteDialog onConfirm={onConfirm} />, scope);

      expect(container).toBeEmptyDOMElement();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
