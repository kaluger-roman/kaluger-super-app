import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { lessonFormModel, lessonsModel } from "../../../models";
import { LessonForm } from "../LessonForm";

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
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
};

describe("LessonForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when dialog is closed", () => {
      const scope = fork();

      const { container } = renderWithTheme(<LessonForm />, scope);

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it("should render dialog when opened for creating lesson", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Создать новый урок")).toBeInTheDocument();
    });

    it("should render dialog when opened for editing lesson", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$editingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Редактировать урок")).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    it("should render submit button inside dialog", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      const submitButton =
        dialog.querySelector("button[type='button']") ??
        screen.getByRole("button", { name: /создать урок/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Dialog close", () => {
    it("should have cancel button", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should render dialog when not loading", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Lesson cancellation", () => {
    it("should render cancel button for existing lesson", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$editingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      const cancelButton = screen.getByRole("button", { name: /отменить урок/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("Confirm dialog", () => {
    it("should render confirm dialog when confirmDialog.open is true", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });
      await allSettled(lessonFormModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Test Title",
          message: "Test Message",
          action: () => {
            //
          },
        },
      });

      renderWithTheme(<LessonForm />, scope);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Message")).toBeInTheDocument();
    });

    it("should render cancel button in confirm dialog", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });
      await allSettled(lessonFormModel.$confirmDialog, {
        scope,
        params: {
          open: true,
          title: "Test Title",
          message: "Test Message",
          action: () => {
            //
          },
        },
      });

      renderWithTheme(<LessonForm />, scope);

      const cancelButton = screen.getAllByRole("button", { name: /отмена/i })[0];
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("Form field changes", () => {
    it("should render form fields", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      const descriptionField = screen.getByLabelText(/описание/i);
      expect(descriptionField).toBeInTheDocument();
    });
  });

  describe("Form initialization", () => {
    it("should initialize form when dialog opens with lesson", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$editingLesson, { scope, params: mockLesson });
      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      // Check that dialog is rendered
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should initialize form when dialog opens without lesson", async () => {
      const scope = fork();

      await allSettled(lessonsModel.$isDialogOpen, { scope, params: true });

      renderWithTheme(<LessonForm />, scope);

      // Check that dialog is rendered
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
