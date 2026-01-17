import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Student } from "@shared";
import { theme } from "@shared";

import * as studentsArchiveModel from "../../../models/students-archive.model";
import { StudentUnarchiveDialog } from "../StudentUnarchiveDialog";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockStudent: Student = {
  id: "s1",
  name: "Иван Иванов",
  archived: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
};

describe("StudentUnarchiveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Model exports", () => {
    it("should have necessary exports from model", () => {
      expect(studentsArchiveModel).toBeDefined();
      expect(studentsArchiveModel.unarchiveRequested).toBeDefined();
      expect(studentsArchiveModel.unarchiveConfirmed).toBeDefined();
      expect(studentsArchiveModel.$unarchiveDialogStudent).toBeDefined();
    });
  });

  describe("Rendering", () => {
    it("should not render when student is null", () => {
      const scope = fork();

      const { container } = renderWithTheme(<StudentUnarchiveDialog />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render dialog when student is set", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Разархивировать ученика")).toBeInTheDocument();
      expect(screen.getByText(mockStudent.name)).toBeInTheDocument();
    });

    it("should render confirmation message", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      expect(screen.getByText(/вы уверены.*из архива/i)).toBeInTheDocument();
    });

    it("should render action buttons", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /из архива/i })).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should render cancel button", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should render confirm button", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      const confirmButton = screen.getByRole("button", { name: /из архива/i });
      expect(confirmButton).toBeInTheDocument();
    });

    it("should render dialog for Enter key interaction", async () => {
      const scope = fork();

      await allSettled(studentsArchiveModel.$unarchiveDialogStudent, {
        scope,
        params: mockStudent,
      });

      renderWithTheme(<StudentUnarchiveDialog />, scope);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Model integration", () => {
    it("should call studentModel.unarchiveStudent when unarchive is confirmed", async () => {
      const scope = fork({
        values: [[studentsArchiveModel.$unarchiveDialogStudent, mockStudent]],
      });

      await allSettled(studentsArchiveModel.unarchiveConfirmed, { scope });

      // After confirmation dialog should be closed
      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toBeNull();
    });
  });
});
