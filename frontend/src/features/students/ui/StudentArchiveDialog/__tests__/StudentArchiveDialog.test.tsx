import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Student } from "@shared";
import { theme } from "@shared";

import * as studentsArchiveModel from "../../../models/students-archive.model";
import { StudentArchiveDialog } from "../StudentArchiveDialog";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockStudent: Student = {
  id: "s1",
  name: "Иван Иванов",
  archived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
};

describe("StudentArchiveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Model exports", () => {
    it("should have necessary exports from model", () => {
      expect(studentsArchiveModel).toBeDefined();
      expect(studentsArchiveModel.archiveRequested).toBeDefined();
      expect(studentsArchiveModel.unarchiveRequested).toBeDefined();
      expect(studentsArchiveModel.archiveConfirmed).toBeDefined();
      expect(studentsArchiveModel.unarchiveConfirmed).toBeDefined();
      expect(studentsArchiveModel.$archiveDialogStudent).toBeDefined();
      expect(studentsArchiveModel.$archiveReason).toBeDefined();
      expect(studentsArchiveModel.$archiveComment).toBeDefined();
    });
  });

  describe("Rendering", () => {
    it("should not render when student is null", () => {
      const scope = fork();

      const { container } = renderWithTheme(<StudentArchiveDialog />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when student is set", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Архивировать ученика")).toBeInTheDocument();
      expect(screen.getByText(mockStudent.name)).toBeInTheDocument();
    });

    it("should render warning about deleting future lessons", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      expect(
        screen.getByText(/при архивации ученика будут удалены все его будущие уроки/i)
      ).toBeInTheDocument();
    });

    it("should render reason select field", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      expect(screen.getByLabelText(/причина архивирования/i)).toBeInTheDocument();
    });

    it("should render comment text field", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      expect(screen.getByLabelText(/комментарий/i)).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should render cancel button", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should render confirm button", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const confirmButton = screen.getByRole("button", { name: /в архив/i });
      expect(confirmButton).toBeInTheDocument();
    });

    it("should render reason field and options", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const reasonField = screen.getByLabelText(/причина архивирования/i);
      expect(reasonField).toBeInTheDocument();
    });

    it("should render comment field", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const commentField = screen.getByLabelText(/комментарий/i);
      expect(commentField).toBeInTheDocument();
    });

    it("should render dialog for Enter key interaction", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should render dialog for Shift+Enter interaction", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$archiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentArchiveDialog />, scope);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });
});
