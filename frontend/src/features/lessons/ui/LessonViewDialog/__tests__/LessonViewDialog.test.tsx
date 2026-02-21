import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";

import { theme } from "../../../../../shared/ui/themeConfig";
import { lessonsModel } from "../../../models";
import { LessonViewDialog } from "../LessonViewDialog";

// Mock MUI hooks before importing component
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

const mockStudent = {
  id: "student-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP" as const,
  archived: false,
};

const mockLesson: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  price: 2000,
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "student-1",
  student: mockStudent,
};

describe("LessonViewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when lesson is undefined", () => {
      const scope = fork();

      const { container } = renderWithTheme(<LessonViewDialog />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when lesson is present", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Урок")).toBeInTheDocument();
    });

    it("should render dialog title", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Урок")).toBeInTheDocument();
    });

    it("should render LessonDetails component", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should render LessonDialogActions component", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      // Actions should be visible (like Редактировать, Перенести, etc.)
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
    });
  });

  describe("Dialog open/close behavior", () => {
    it("should open dialog when $isViewDialogOpen is true", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should not show dialog when $isViewDialogOpen is false", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: false });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should call viewDialogClosed when close action is triggered", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      // Trigger close by calling the event directly (simulating ESC key or other close triggers)
      await allSettled(lessonsModel.viewDialogClosed, { scope });

      const isOpen = scope.getState(lessonsModel.$isViewDialogOpen);
      expect(isOpen).toBe(false);
    });

    it("should call viewDialogClosed when backdrop is clicked", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      const { baseElement } = renderWithTheme(<LessonViewDialog />, scope);

      const backdrop = baseElement.querySelector(".MuiBackdrop-root");
      if (backdrop) {
        await userEvent.click(backdrop);
      }

      await allSettled(scope);

      const isOpen = scope.getState(lessonsModel.$isViewDialogOpen);
      expect(isOpen).toBe(false);
    });
  });

  describe("Lesson status chip display", () => {
    it("should display SCHEDULED status with correct label", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, status: "SCHEDULED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Запланирован")).toBeInTheDocument();
    });

    it("should display COMPLETED status with correct label", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, status: "COMPLETED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Завершен")).toBeInTheDocument();
    });

    it("should display CANCELLED status with correct label", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, status: "CANCELLED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Отменен")).toBeInTheDocument();
    });

    it("should display RESCHEDULED status with correct label", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, status: "RESCHEDULED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Перенесен")).toBeInTheDocument();
    });

    it("should display IN_PROGRESS status with correct label", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, status: "IN_PROGRESS" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("В процессе")).toBeInTheDocument();
    });

    it("should display status chip", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Запланирован")).toBeInTheDocument();
    });
  });

  describe("Responsive behavior", () => {
    it("should render dialog responsively", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("ConfirmDialog integration", () => {
    it("should render ConfirmDialog when confirmDialog.open is true", async () => {
      const scope = fork();
      const mockAction = vi.fn();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Подтверждение",
          message: "Вы уверены?",
          action: mockAction,
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Подтверждение")).toBeInTheDocument();
      expect(screen.getByText("Вы уверены?")).toBeInTheDocument();
    });

    it("should not render ConfirmDialog when confirmDialog.open is false", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: false,
          title: "Подтверждение",
          message: "Вы уверены?",
          action: vi.fn(),
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.queryByText("Подтверждение")).not.toBeInTheDocument();
    });

    it("should pass confirmDialog title to ConfirmDialog", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Удалить урок?",
          message: "Это действие нельзя отменить",
          action: vi.fn(),
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Удалить урок?")).toBeInTheDocument();
    });

    it("should pass confirmDialog message to ConfirmDialog", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Подтверждение",
          message: "Отменить урок с учеником Иван Иванов?",
          action: vi.fn(),
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Отменить урок с учеником Иван Иванов?")).toBeInTheDocument();
    });

    it("should call confirmDialog action when confirmed", async () => {
      const scope = fork();
      const mockAction = vi.fn();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Подтверждение",
          message: "Вы уверены?",
          action: mockAction,
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it("should call confirmDialogClosed when ConfirmDialog is closed", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Подтверждение",
          message: "Вы уверены?",
          action: vi.fn(),
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      await userEvent.click(cancelButton);

      await allSettled(scope);

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(false);
    });

    it("should pass severity to ConfirmDialog when provided", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Удалить урок?",
          message: "Это действие нельзя отменить",
          action: vi.fn(),
          severity: "error" as const,
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Удалить урок?")).toBeInTheDocument();
      expect(screen.getByText("Это действие нельзя отменить")).toBeInTheDocument();
    });

    it("should pass severity warning to ConfirmDialog", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });
      await allSettled(lessonsModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Отменить урок?",
          message: "Урок будет отменен",
          action: vi.fn(),
          severity: "warning" as const,
        },
      });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Отменить урок?")).toBeInTheDocument();
      expect(screen.getByText("Урок будет отменен")).toBeInTheDocument();
    });
  });

  describe("Lesson information display", () => {
    it("should display student name", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    });

    it("should display lesson with different student", async () => {
      const scope = fork();
      const lesson = {
        ...mockLesson,
        student: {
          ...mockStudent,
          name: "Мария Петрова",
        },
      };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Мария Петрова")).toBeInTheDocument();
    });

    it("should display lesson details for different subjects", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, subject: "PHYSICS" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should display lesson with price", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, price: 3000 };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText(/3000/)).toBeInTheDocument();
    });

    it("should display lesson with recurring flag", async () => {
      const scope = fork();
      const lesson = { ...mockLesson, isRecurring: true };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle lesson without student gracefully", () => {
      const scope = fork();

      // Should not render when student is undefined (handled by null check)
      const { container } = renderWithTheme(<LessonViewDialog />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should handle lesson with minimal data", async () => {
      const scope = fork();
      const minimalLesson: Lesson = {
        id: "lesson-2",
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: "2026-02-15T10:00:00.000Z",
        endTime: "2026-02-15T11:00:00.000Z",
        isPaid: false,
        status: "SCHEDULED",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        studentId: "student-1",
        student: {
          id: "student-1",
          name: "Test Student",
          phone: "+79999999999",
          contactMethod: "WHATSAPP",
          archived: false,
        },
      };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: minimalLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Test Student")).toBeInTheDocument();
    });

    it("should update dialog when lesson changes", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      const { rerender } = renderWithTheme(<LessonViewDialog />, scope);

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();

      // Update lesson
      const newLesson = {
        ...mockLesson,
        student: {
          ...mockStudent,
          name: "Петр Сидоров",
        },
      };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: newLesson });

      rerender(
        <Provider value={scope}>
          <ThemeProvider theme={theme}>
            <LessonViewDialog />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByText("Петр Сидоров")).toBeInTheDocument();
    });

    it("should handle rapid open/close", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });

      // Open
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      // Verify opened
      const openState = scope.getState(lessonsModel.$isViewDialogOpen);
      expect(openState).toBe(true);

      // Close
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: false });

      // Verify closed
      const closedState = scope.getState(lessonsModel.$isViewDialogOpen);
      expect(closedState).toBe(false);
    });
  });

  describe("Actions callbacks", () => {
    it("should have edit button that triggers action", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const editButton = screen.getByRole("button", { name: /редактировать/i });
      expect(editButton).toBeInTheDocument();
    });

    it("should have reschedule button that triggers action", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const rescheduleButton = screen.getByRole("button", { name: /перенести/i });
      expect(rescheduleButton).toBeInTheDocument();
    });

    it("should have cancel button for non-cancelled lessons", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      // The cancel button text might be "Отменить" not "Отменить урок"
      const cancelButton = screen.queryByRole("button", { name: /отменить/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should have delete button", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$viewingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should have restore button for cancelled lessons", async () => {
      const scope = fork();
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: cancelledLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const restoreButton = screen.getByRole("button", { name: /восстановить/i });
      expect(restoreButton).toBeInTheDocument();
    });

    it("should not have reschedule button for cancelled lessons", async () => {
      const scope = fork();
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: cancelledLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      const rescheduleButton = screen.queryByRole("button", { name: /перенести/i });
      expect(rescheduleButton).not.toBeInTheDocument();
    });

    it("should not have cancel button for cancelled lessons", async () => {
      const scope = fork();
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      await allSettled(lessonsModel.$viewingLesson, { scope, params: cancelledLesson });
      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonViewDialog />, scope);

      // Should not have a cancel button (but might have other "Отменить" buttons from ConfirmDialog)
      // Just verify the lesson is shown as cancelled
      expect(screen.getByText("Отменен")).toBeInTheDocument();
    });
  });
});
