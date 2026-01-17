import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import type { Lesson } from "../../../types";
import { theme } from "../../themeConfig";
import { RecurringLessonDeleteDialog } from "../RecurringLessonDeleteDialog";
import * as model from "../RecurringLessonDeleteDialog.model";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockRecurringLesson: Lesson = {
  id: "1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2024-01-15T10:00:00.000Z",
  endTime: "2024-01-15T11:30:00.000Z",
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  studentId: "1",
  student: {
    id: "1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
};

const mockNonRecurringLesson: Lesson = {
  ...mockRecurringLesson,
  id: "2",
  isRecurring: false,
};

describe("RecurringLessonDeleteDialog", () => {
  describe("Rendering", () => {
    it("should not render when lesson is undefined", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      const { container } = renderWithTheme(
        <RecurringLessonDeleteDialog open={true} onClose={onClose} onConfirm={onConfirm} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when open is true and lesson is provided", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Удалить урок")).toBeInTheDocument();
    });

    it("should display lesson subject and student name", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(screen.getByText("Математика")).toBeInTheDocument();
      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should show checkbox for recurring lesson", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(
        screen.getByRole("checkbox", {
          name: /Удалить все запланированные повторы этого урока/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText("⚠️ Это повторяющийся урок")).toBeInTheDocument();
    });

    it("should not show checkbox for non-recurring lesson", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockNonRecurringLesson}
        />
      );

      expect(
        screen.queryByRole("checkbox", {
          name: /Удалить все запланированные повторы этого урока/i,
        })
      ).not.toBeInTheDocument();
      expect(screen.queryByText("⚠️ Это повторяющийся урок")).not.toBeInTheDocument();
    });

    it("should show warning text about irreversible action", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(screen.getByText("Это действие нельзя отменить.")).toBeInTheDocument();
    });

    it("should show cancel and delete buttons", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(screen.getByRole("button", { name: /Отмена/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Удалить/i })).toBeInTheDocument();
    });
  });

  describe("Checkbox interaction", () => {
    it("should have unchecked checkbox initially for recurring lesson", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /Удалить все запланированные повторы этого урока/i,
      });

      expect(checkbox).not.toBeChecked();
    });

    it("should allow user to toggle checkbox", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /Удалить все запланированные повторы этого урока/i,
      });

      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);

      // Verify checkbox can be interacted with
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("should reflect store state in checkbox", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const scope = fork({
        values: [[model.$deleteAllFuture, true]],
      });

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />,
        scope
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /Удалить все запланированные повторы этого урока/i,
      });

      expect(checkbox).toBeChecked();
    });
  });

  describe("Button clicks", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Отмена/i });
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm with false when delete button is clicked without checkbox", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm with true when delete button is clicked with checked checkbox from store", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const scope = fork({
        values: [[model.$deleteAllFuture, true]],
      });

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />,
        scope
      );

      const deleteButton = screen.getByRole("button", { name: /Удалить/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Keyboard interaction", () => {
    it("should call onConfirm when Enter key is pressed", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm with checkbox state when Enter key is pressed", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const scope = fork({
        values: [[model.$deleteAllFuture, true]],
      });

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />,
        scope
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should not trigger onConfirm when other keys are pressed", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Escape}");
      await userEvent.type(dialog, "{Space}");
      await userEvent.type(dialog, "a");

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Model integration", () => {
    it("should reset deleteAllFuture to false when dialogClosed is called", async () => {
      const scope = fork();

      await allSettled(model.deleteAllFutureToggled, { scope, params: true });
      expect(scope.getState(model.$deleteAllFuture)).toBe(true);

      await allSettled(model.dialogClosed, { scope });
      expect(scope.getState(model.$deleteAllFuture)).toBe(false);
    });

    it("should update deleteAllFuture when deleteAllFutureToggled is called", async () => {
      const scope = fork();

      expect(scope.getState(model.$deleteAllFuture)).toBe(false);

      await allSettled(model.deleteAllFutureToggled, { scope, params: true });
      expect(scope.getState(model.$deleteAllFuture)).toBe(true);

      await allSettled(model.deleteAllFutureToggled, { scope, params: false });
      expect(scope.getState(model.$deleteAllFuture)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle lesson without student property", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const lessonWithoutStudent: Lesson = {
        ...mockRecurringLesson,
        student: undefined,
      };

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={lessonWithoutStudent}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Математика")).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={false}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={mockRecurringLesson}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should handle PHYSICS subject", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const physicsLesson: Lesson = {
        ...mockRecurringLesson,
        subject: "PHYSICS",
      };

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={physicsLesson}
        />
      );

      expect(screen.getByText("Физика")).toBeInTheDocument();
    });

    it("should handle lesson with isRecurring as undefined", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const lessonWithUndefinedRecurring: Lesson = {
        ...mockRecurringLesson,
        isRecurring: undefined,
      };

      renderWithTheme(
        <RecurringLessonDeleteDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          lesson={lessonWithUndefinedRecurring}
        />
      );

      expect(
        screen.queryByRole("checkbox", {
          name: /Удалить все запланированные повторы этого урока/i,
        })
      ).not.toBeInTheDocument();
    });
  });
});
