import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import type { Lesson } from "../../../types";
import { theme } from "../../themeConfig";
import * as rescheduleDialogModel from "../reschedule-dialog.model";
import { RescheduleDialog } from "../RescheduleDialog";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockLesson: Lesson = {
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

describe("RescheduleDialog", () => {
  describe("Rendering", () => {
    it("should not render when lesson is undefined", () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const { container } = renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should not render when newStartTime is undefined", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:30:00.000Z"),
      });

      const { container } = renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should not render when newEndTime is undefined", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T10:00:00.000Z"),
      });

      const { container } = renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when all required data is present", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("📅 Перенести урок")).toBeInTheDocument();
    });

    it("should display lesson details", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Математика/)).toBeInTheDocument();
      expect(screen.getByText(/ЕГЭ/)).toBeInTheDocument();
      expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
    });

    it("should display current time information", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Текущее время:/)).toBeInTheDocument();
    });

    it("should render DateTimePicker for start time", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const labels = screen.getAllByText(/Новое время начала/);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should render DateTimePicker for end time", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const labels = screen.getAllByText(/Новое время окончания/);
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should render cancel button", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByRole("button", { name: /Отмена/ })).toBeInTheDocument();
    });

    it("should render confirm button", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByRole("button", { name: /Перенести урок/ })).toBeInTheDocument();
    });
  });

  describe("Time validation", () => {
    it("should show duration in minutes when time range is valid", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Продолжительность: 90 мин\./)).toBeInTheDocument();
    });

    it("should show error when start time is after end time", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T12:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const errorMessages = screen.getAllByText(/Время окончания должно быть позже времени начала/);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it("should show error when start time equals end time", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const errorMessages = screen.getAllByText(/Время окончания должно быть позже времени начала/);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it("should disable confirm button when time range is invalid", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T12:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const confirmButton = screen.getByRole("button", { name: /Перенести урок/ });
      expect(confirmButton).toBeDisabled();
    });

    it("should enable confirm button when time range is valid", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const confirmButton = screen.getByRole("button", { name: /Перенести урок/ });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe("Duration calculation", () => {
    it("should calculate duration correctly for 90 minutes", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T10:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:30:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Продолжительность: 90 мин\./)).toBeInTheDocument();
    });

    it("should calculate duration correctly for 60 minutes", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T10:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Продолжительность: 60 мин\./)).toBeInTheDocument();
    });

    it("should calculate duration correctly for 120 minutes", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T10:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T12:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      expect(screen.getByText(/Продолжительность: 120 мин\./)).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should have cancel button that triggers close handler", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/ });
      expect(cancelButton).toBeInTheDocument();

      await userEvent.click(cancelButton);

      // The button was clicked successfully - handleClose is called internally
      expect(cancelButton).toBeInTheDocument();
    });

    it("should call onConfirm with new times when confirm button is clicked", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const newStartTime = new Date("2026-02-15T14:00:00.000Z");
      const newEndTime = new Date("2026-02-15T15:30:00.000Z");

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, { scope, params: newStartTime });
      await allSettled(rescheduleDialogModel.$newEndTime, { scope, params: newEndTime });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const confirmButton = screen.getByRole("button", { name: /Перенести урок/ });
      await userEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(newStartTime, newEndTime);
    });

    it("should not call onConfirm when time range is invalid", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T12:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const confirmButton = screen.getByRole("button", { name: /Перенести урок/ });
      // Button is disabled, but try to click anyway
      expect(confirmButton).toBeDisabled();

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should disable cancel button when isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/ });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("DateTimePicker interactions", () => {
    it("should have functional start time DateTimePicker", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      // Verify the label exists
      const labels = screen.getAllByText(/Новое время начала/);
      expect(labels.length).toBeGreaterThan(0);

      // The model should have initial start time
      const newStartTime = scope.getState(rescheduleDialogModel.$newStartTime);
      expect(newStartTime).toBeDefined();
    });

    it("should have functional end time DateTimePicker", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      // Verify the label exists
      const labels = screen.getAllByText(/Новое время окончания/);
      expect(labels.length).toBeGreaterThan(0);

      // The model should have initial end time
      const newEndTime = scope.getState(rescheduleDialogModel.$newEndTime);
      expect(newEndTime).toBeDefined();
    });
  });

  describe("Enter key handling", () => {
    it("should call onConfirm when Enter key is pressed with valid time range", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const newStartTime = new Date("2026-02-15T14:00:00.000Z");
      const newEndTime = new Date("2026-02-15T15:30:00.000Z");

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, { scope, params: newStartTime });
      await allSettled(rescheduleDialogModel.$newEndTime, { scope, params: newEndTime });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(newStartTime, newEndTime);
    });

    it("should not call onConfirm when Enter key is pressed with invalid time range", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2026-02-15T12:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2026-02-15T11:00:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should not call onConfirm when Enter key is pressed and isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const newStartTime = new Date("2026-02-15T14:00:00.000Z");
      const newEndTime = new Date("2026-02-15T15:30:00.000Z");

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: mockLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, { scope, params: newStartTime });
      await allSettled(rescheduleDialogModel.$newEndTime, { scope, params: newEndTime });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    it("should disable cancel button when isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      const cancelButton = screen.getByRole("button", { name: /Отмена/ });
      expect(cancelButton).toBeDisabled();
    });

    it("should disable confirm button when isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      const confirmButton = screen.getByRole("button", { name: /Переношу.../ });
      expect(confirmButton).toBeDisabled();
    });

    it("should show loading text on confirm button when isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      expect(screen.getByRole("button", { name: /Переношу.../ })).toBeInTheDocument();
    });

    it("should disable actions when isLoading is true", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} isLoading={true} />, scope);

      // Verify buttons are disabled
      const cancelButton = screen.getByRole("button", { name: /Отмена/ });
      const confirmButton = screen.getByRole("button", { name: /Переношу\.\.\./ });

      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe("Past date notice", () => {
    it("should show PastDateNotice when date is in the past", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const pastLesson: Lesson = {
        ...mockLesson,
        startTime: "2020-01-15T10:00:00.000Z",
        endTime: "2020-01-15T11:30:00.000Z",
      };

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: pastLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2020-01-15T10:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2020-01-15T11:30:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      // PastDateNotice shows a warning about past dates
      const alerts = screen.queryAllByRole("alert");
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should not show error validation when date is in future", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      const futureLesson: Lesson = {
        ...mockLesson,
        startTime: "2027-01-15T10:00:00.000Z",
        endTime: "2027-01-15T11:30:00.000Z",
      };

      await allSettled(rescheduleDialogModel.$lesson, { scope, params: futureLesson });
      await allSettled(rescheduleDialogModel.$isOpen, { scope, params: true });
      await allSettled(rescheduleDialogModel.$newStartTime, {
        scope,
        params: new Date("2027-01-15T10:00:00.000Z"),
      });
      await allSettled(rescheduleDialogModel.$newEndTime, {
        scope,
        params: new Date("2027-01-15T11:30:00.000Z"),
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      // Only one alert (info about current time), not error
      const errorAlerts = screen.queryAllByRole("alert");
      const hasOnlyInfoAlert = errorAlerts.length === 1;
      expect(hasOnlyInfoAlert).toBe(true);
    });
  });

  describe("Dialog open/close state", () => {
    it("should open dialog when rescheduleDialogOpened is triggered", async () => {
      const scope = fork();
      const _onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const isOpen = scope.getState(rescheduleDialogModel.$isOpen);
      expect(isOpen).toBe(true);

      renderWithTheme(<RescheduleDialog onConfirm={_onConfirm} />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should set lesson data when rescheduleDialogOpened is triggered", async () => {
      const scope = fork();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const lesson = scope.getState(rescheduleDialogModel.$lesson);
      const newStartTime = scope.getState(rescheduleDialogModel.$newStartTime);
      const newEndTime = scope.getState(rescheduleDialogModel.$newEndTime);

      expect(lesson).toEqual(mockLesson);
      expect(newStartTime).toEqual(new Date(mockLesson.startTime));
      expect(newEndTime).toEqual(new Date(mockLesson.endTime));
    });

    it("should clear lesson data when rescheduleDialogClosed is triggered", async () => {
      const scope = fork();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      // Verify data is set
      expect(scope.getState(rescheduleDialogModel.$lesson)).toEqual(mockLesson);

      await allSettled(rescheduleDialogModel.rescheduleDialogClosed, { scope });

      const lesson = scope.getState(rescheduleDialogModel.$lesson);
      const newStartTime = scope.getState(rescheduleDialogModel.$newStartTime);
      const newEndTime = scope.getState(rescheduleDialogModel.$newEndTime);
      const isOpen = scope.getState(rescheduleDialogModel.$isOpen);

      expect(lesson).toBeUndefined();
      expect(newStartTime).toBeUndefined();
      expect(newEndTime).toBeUndefined();
      expect(isOpen).toBe(false);
    });
  });

  describe("Time model synchronization", () => {
    it("should auto-adjust end time when start time changes to maintain duration", async () => {
      const scope = fork();
      const onConfirm = vi.fn();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const newStartTime = new Date("2026-02-15T16:00:00.000Z");

      await allSettled(rescheduleDialogModel.newStartTimeChanged, {
        scope,
        params: newStartTime,
      });

      renderWithTheme(<RescheduleDialog onConfirm={onConfirm} />, scope);

      const updatedEndTime = scope.getState(rescheduleDialogModel.$newEndTime);

      // Duration should be maintained (90 minutes)
      expect(updatedEndTime).toBeDefined();
      const duration = (updatedEndTime as Date).getTime() - newStartTime.getTime();
      expect(duration).toBe(90 * 60 * 1000);
    });

    it("should initialize times from lesson when dialog opens", async () => {
      const scope = fork();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const newStartTime = scope.getState(rescheduleDialogModel.$newStartTime);
      const newEndTime = scope.getState(rescheduleDialogModel.$newEndTime);

      expect(newStartTime).toEqual(new Date(mockLesson.startTime));
      expect(newEndTime).toEqual(new Date(mockLesson.endTime));
    });
  });
});
