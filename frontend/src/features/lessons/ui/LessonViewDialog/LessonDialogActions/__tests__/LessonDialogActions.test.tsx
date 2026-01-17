import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";

import { theme } from "../../../../../../shared/ui/themeConfig";
import { lessonsModel } from "../../../../models";
import { LessonDialogActions } from "../LessonDialogActions";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
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
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
  ...overrides,
});

describe("LessonDialogActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Button visibility based on lesson status", () => {
    it("should show reschedule and cancel buttons for SCHEDULED lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show reschedule and cancel buttons for COMPLETED lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "COMPLETED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show reschedule and cancel buttons for IN_PROGRESS lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "IN_PROGRESS" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show reschedule and cancel buttons for RESCHEDULED lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "RESCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show restore button and hide reschedule/cancel buttons for CANCELLED lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /восстановить/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /перенести/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /отменить/i })).not.toBeInTheDocument();
    });

    it("should always show delete, edit, and close buttons regardless of status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
    });

    it("should show delete, edit, and close buttons for CANCELLED lesson", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
    });
  });

  describe("Button clicks calling correct actions", () => {
    it("should call rescheduleDialogOpened with lesson when reschedule button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const rescheduleButton = screen.getByRole("button", { name: /перенести/i });
      await userEvent.click(rescheduleButton);

      expect(scope.getState(lessonsModel.$isRescheduleDialogOpen)).toBe(true);
      expect(scope.getState(lessonsModel.$reschedulingLesson)).toEqual(lesson);
    });

    it("should call openCancelConfirmForLesson with lesson when cancel button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const cancelButton = screen.getByRole("button", { name: /отменить/i });
      await userEvent.click(cancelButton);

      await allSettled(lessonsModel.openCancelConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });

    it("should call openRestoreConfirmForLesson with lesson when restore button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const restoreButton = screen.getByRole("button", { name: /восстановить/i });
      await userEvent.click(restoreButton);

      await allSettled(lessonsModel.openRestoreConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });

    it("should call openDeleteConfirmForLesson with lesson when delete button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      await userEvent.click(deleteButton);

      await allSettled(lessonsModel.openDeleteConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });

    it("should call editFromViewRequested when edit button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      await allSettled(lessonsModel.$viewingLesson, { scope, params: lesson });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const editButton = screen.getByRole("button", { name: /редактировать/i });
      await userEvent.click(editButton);

      expect(scope.getState(lessonsModel.$isDialogOpen)).toBe(true);
      expect(scope.getState(lessonsModel.$editingLesson)).toEqual(lesson);
    });

    it("should call viewDialogClosed when close button is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      await allSettled(lessonsModel.$isViewDialogOpen, { scope, params: true });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const closeButton = screen.getByRole("button", { name: /закрыть/i });
      await userEvent.click(closeButton);

      await allSettled(lessonsModel.viewDialogClosed, { scope });

      expect(scope.getState(lessonsModel.$isViewDialogOpen)).toBe(false);
    });
  });

  describe("Mobile and desktop modes", () => {
    it("should render all buttons in mobile mode", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={true} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
    });

    it("should render all buttons in desktop mode", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
    });
  });

  describe("Action callbacks with correct lesson parameter", () => {
    it("should pass correct lesson to rescheduleDialogOpened", async () => {
      const scope = fork();
      const lesson = createMockLesson({ id: "test-lesson-123", status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const rescheduleButton = screen.getByRole("button", { name: /перенести/i });
      await userEvent.click(rescheduleButton);

      await allSettled(lessonsModel.rescheduleDialogOpened, { scope, params: lesson });

      expect(scope.getState(lessonsModel.$reschedulingLesson)).toEqual(lesson);
    });

    it("should pass correct lesson to openCancelConfirmForLesson", async () => {
      const scope = fork();
      const lesson = createMockLesson({ id: "test-lesson-456", status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const cancelButton = screen.getByRole("button", { name: /отменить/i });
      await userEvent.click(cancelButton);

      await allSettled(lessonsModel.openCancelConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });

    it("should pass correct lesson to openRestoreConfirmForLesson", async () => {
      const scope = fork();
      const lesson = createMockLesson({ id: "test-lesson-789", status: "CANCELLED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const restoreButton = screen.getByRole("button", { name: /восстановить/i });
      await userEvent.click(restoreButton);

      await allSettled(lessonsModel.openRestoreConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });

    it("should pass correct lesson to openDeleteConfirmForLesson", async () => {
      const scope = fork();
      const lesson = createMockLesson({ id: "test-lesson-delete", status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      await userEvent.click(deleteButton);

      await allSettled(lessonsModel.openDeleteConfirmForLesson, { scope, params: lesson });

      const confirmDialog = scope.getState(lessonsModel.$confirmDialog);
      expect(confirmDialog.open).toBe(true);
    });
  });

  describe("Multiple lesson statuses comprehensive test", () => {
    it("should show correct buttons for SCHEDULED status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show correct buttons for COMPLETED status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "COMPLETED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show correct buttons for CANCELLED status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /восстановить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /перенести/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /отменить/i })).not.toBeInTheDocument();
    });

    it("should show correct buttons for RESCHEDULED status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "RESCHEDULED" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });

    it("should show correct buttons for IN_PROGRESS status", () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "IN_PROGRESS" });

      renderWithTheme(<LessonDialogActions lesson={lesson} isMobile={false} />, scope);

      expect(screen.getByRole("button", { name: /перенести/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /отменить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /восстановить/i })).not.toBeInTheDocument();
    });
  });
});
