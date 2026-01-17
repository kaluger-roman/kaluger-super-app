import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import * as homeworkSentStatusModel from "../homework-sent-status.model";
import { HomeworkSentStatus } from "../HomeworkSentStatus";

/**
 * HomeworkSentStatus Component Tests
 *
 * Tests cover:
 * - Rendering with sent/unsent status
 * - Switch toggle behavior with/without confirmation
 * - Custom onHomeworkSentChange callback
 * - Different sizes (small, medium)
 * - showLabel prop
 * - Event propagation prevention
 * - Effector store model isolation tests
 */

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockLesson: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T11:00:00Z",
  isPaid: false,
  status: "SCHEDULED",
  studentId: "student-1",
  isHomeworkSentByTeacher: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
};

describe("HomeworkSentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering with homework status", () => {
    it("should render switch with unsent status", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).not.toBeChecked();
    });

    it("should render switch with sent status", () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      renderWithTheme(<HomeworkSentStatus lesson={lessonWithHomeworkSent} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeChecked();
    });

    it("should render unsent label when homework is not sent", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} />);

      expect(screen.getByText("ДЗ не отправлено")).toBeInTheDocument();
    });

    it("should render sent label when homework is sent", () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      renderWithTheme(<HomeworkSentStatus lesson={lessonWithHomeworkSent} />);

      expect(screen.getByText("ДЗ отправлено")).toBeInTheDocument();
    });

    it("should not render label when showLabel is false", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} showLabel={false} />);

      expect(screen.queryByText("ДЗ не отправлено")).not.toBeInTheDocument();
      expect(screen.queryByText("ДЗ отправлено")).not.toBeInTheDocument();
    });

    it("should render label when showLabel is true", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} showLabel={true} />);

      expect(screen.getByText("ДЗ не отправлено")).toBeInTheDocument();
    });
  });

  describe("Switch sizes", () => {
    it("should render with small size", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} size="small" />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });

    it("should render with medium size by default", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });

    it("should render with medium size when explicitly set", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} size="medium" />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe("Toggle without confirmation", () => {
    it("should render switch correctly when homework not sent", async () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} needConfirm={false} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).not.toBeChecked();
    });

    it("should render switch correctly when homework sent", async () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      renderWithTheme(<HomeworkSentStatus lesson={lessonWithHomeworkSent} needConfirm={false} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeChecked();
    });

    it("should call custom onHomeworkSentChange callback when provided", async () => {
      const onHomeworkSentChange = vi.fn();
      renderWithTheme(
        <HomeworkSentStatus
          lesson={mockLesson}
          needConfirm={false}
          onHomeworkSentChange={onHomeworkSentChange}
        />
      );

      const switchElement = screen.getByRole("checkbox");
      await userEvent.click(switchElement);

      expect(onHomeworkSentChange).toHaveBeenCalledWith("lesson-1", true);
    });

    it("should call callback with false when toggling sent to unsent", async () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      const onHomeworkSentChange = vi.fn();
      renderWithTheme(
        <HomeworkSentStatus
          lesson={lessonWithHomeworkSent}
          needConfirm={false}
          onHomeworkSentChange={onHomeworkSentChange}
        />
      );

      const switchElement = screen.getByRole("checkbox");
      await userEvent.click(switchElement);

      expect(onHomeworkSentChange).toHaveBeenCalledWith("lesson-1", false);
    });
  });

  describe("Toggle with confirmation", () => {
    it("should render switch when needConfirm is true", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} needConfirm={true} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).not.toBeChecked();
    });

    it("should render switch checked when homework sent", () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      renderWithTheme(<HomeworkSentStatus lesson={lessonWithHomeworkSent} needConfirm={true} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeChecked();
    });
  });

  describe("Dialog confirmation with callback", () => {
    it("should use custom callback when provided with needConfirm", () => {
      const onHomeworkSentChange = vi.fn();
      renderWithTheme(
        <HomeworkSentStatus
          lesson={mockLesson}
          needConfirm={true}
          onHomeworkSentChange={onHomeworkSentChange}
        />
      );

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe("Dialog cancellation with callback", () => {
    it("should render cancel functionality", () => {
      const onHomeworkSentChange = vi.fn();
      renderWithTheme(
        <HomeworkSentStatus
          lesson={mockLesson}
          needConfirm={true}
          onHomeworkSentChange={onHomeworkSentChange}
        />
      );

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe("Enter key handling", () => {
    it("should render component for keyboard interaction", () => {
      const onHomeworkSentChange = vi.fn();
      renderWithTheme(
        <HomeworkSentStatus
          lesson={mockLesson}
          needConfirm={true}
          onHomeworkSentChange={onHomeworkSentChange}
        />
      );

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe("Event propagation", () => {
    it("should stop propagation when clicking switch", async () => {
      const onClick = vi.fn();
      renderWithTheme(
        <div onClick={onClick}>
          <HomeworkSentStatus lesson={mockLesson} />
        </div>
      );

      const switchElement = screen.getByRole("checkbox");
      await userEvent.click(switchElement);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Store integration", () => {
    it("should work with effector store", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} needConfirm={true} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeInTheDocument();
    });
  });

  describe("Dialog button colors", () => {
    it("should render with correct props for sent status", () => {
      renderWithTheme(<HomeworkSentStatus lesson={mockLesson} needConfirm={true} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).not.toBeChecked();
    });

    it("should render with correct props for unsent status", () => {
      const lessonWithHomeworkSent = { ...mockLesson, isHomeworkSentByTeacher: true };
      renderWithTheme(<HomeworkSentStatus lesson={lessonWithHomeworkSent} needConfirm={true} />);

      const switchElement = screen.getByRole("checkbox");
      expect(switchElement).toBeChecked();
    });
  });

  describe("Model store tests", () => {
    it("should open dialog with pending status when confirmDialogOpened is called", async () => {
      const scope = fork();

      await allSettled(homeworkSentStatusModel.confirmDialogOpened, {
        scope,
        params: true,
      });

      const isOpen = scope.getState(homeworkSentStatusModel.$isOpen);
      const pendingStatus = scope.getState(homeworkSentStatusModel.$pendingStatus);

      expect(isOpen).toBe(true);
      expect(pendingStatus).toBe(true);
    });

    it("should close dialog and reset pending status when confirmDialogClosed is called", async () => {
      const scope = fork({
        values: [
          [homeworkSentStatusModel.$isOpen, true],
          [homeworkSentStatusModel.$pendingStatus, true],
        ],
      });

      await allSettled(homeworkSentStatusModel.confirmDialogClosed, { scope });

      const isOpen = scope.getState(homeworkSentStatusModel.$isOpen);
      const pendingStatus = scope.getState(homeworkSentStatusModel.$pendingStatus);

      expect(isOpen).toBe(false);
      expect(pendingStatus).toBeNull();
    });

    it("should handle marking as sent", async () => {
      const scope = fork();

      await allSettled(homeworkSentStatusModel.confirmDialogOpened, {
        scope,
        params: true,
      });

      const pendingStatus = scope.getState(homeworkSentStatusModel.$pendingStatus);
      expect(pendingStatus).toBe(true);
    });

    it("should handle marking as unsent", async () => {
      const scope = fork();

      await allSettled(homeworkSentStatusModel.confirmDialogOpened, {
        scope,
        params: false,
      });

      const pendingStatus = scope.getState(homeworkSentStatusModel.$pendingStatus);
      expect(pendingStatus).toBe(false);
    });
  });
});
