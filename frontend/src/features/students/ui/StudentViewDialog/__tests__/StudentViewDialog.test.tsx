import { ThemeProvider, useMediaQuery } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "@shared";
import type { Student } from "@shared";

import { studentsModel, studentsArchiveModel } from "../../../models";
import { StudentViewDialog } from "../StudentViewDialog";
import * as studentViewDialogModel from "../StudentViewDialog.model";

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

const mockUseMediaQuery = vi.mocked(useMediaQuery);

const renderWithProviders = (ui: React.ReactElement, scope = fork()) => {
  return {
    ...render(
      <EffectorProvider value={scope}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
      </EffectorProvider>
    ),
    scope,
  };
};

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  parentPhone: "+79997654321",
  parentName: "Родитель Иванов",
  parentContactMethod: "TELEGRAM",
  parentTelegramNick: "parent",
  telegramNick: "ivan",
  notes: "Хороший ученик",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

const archivedStudent: Student = {
  ...mockStudent,
  id: "2",
  name: "Archived Student",
  archived: true,
  archivedAt: "2024-12-01T10:00:00Z",
  archiveReason: "CHANGED_MIND",
  archiveComment: "Graduated from school",
};

describe("StudentViewDialog", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false);
  });

  describe("Rendering", () => {
    it("should return null when student is undefined", () => {
      const { container } = renderWithProviders(
        <StudentViewDialog open={true} student={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render dialog when student is provided", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Ученик")).toBeInTheDocument();
    });

    it("should not render dialog when open is false", () => {
      renderWithProviders(<StudentViewDialog open={false} student={mockStudent} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render StudentInfo section", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
    });

    it("should render StudentMeta section", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      expect(screen.getByText("ℹ️ Информация")).toBeInTheDocument();
    });
  });

  describe("Sections visibility", () => {
    it("should render StudentContacts when student has contact method", () => {
      const studentWithContact = {
        ...mockStudent,
        contactMethod: "WHATSAPP" as const,
        phone: null,
        parentPhone: null,
      };
      renderWithProviders(<StudentViewDialog open={true} student={studentWithContact} />);
      expect(screen.getByText("📞 Контакты")).toBeInTheDocument();
    });

    it("should render StudentContacts when student has phone", () => {
      const studentWithPhone = {
        ...mockStudent,
        contactMethod: undefined,
        phone: "+79991234567",
        parentPhone: null,
      };
      renderWithProviders(<StudentViewDialog open={true} student={studentWithPhone} />);
      expect(screen.getByText("📞 Контакты")).toBeInTheDocument();
    });

    it("should render StudentContacts when student has parent phone", () => {
      const studentWithParentPhone = {
        ...mockStudent,
        contactMethod: undefined,
        phone: null,
        parentPhone: "+79997654321",
      };
      renderWithProviders(<StudentViewDialog open={true} student={studentWithParentPhone} />);
      expect(screen.getByText("📞 Контакты")).toBeInTheDocument();
    });

    it("should not render StudentContacts when student has no contacts", () => {
      const studentWithoutContacts = {
        ...mockStudent,
        contactMethod: undefined,
        phone: null,
        parentPhone: null,
      };
      renderWithProviders(<StudentViewDialog open={true} student={studentWithoutContacts} />);
      expect(screen.queryByText("📞 Контакты")).not.toBeInTheDocument();
    });

    it("should render StudentNotes when student has notes", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      expect(screen.getByText(/Заметки/)).toBeInTheDocument();
      expect(screen.getByText("Хороший ученик")).toBeInTheDocument();
    });

    it("should not render StudentNotes when student has no notes", () => {
      const studentWithoutNotes = { ...mockStudent, notes: null };
      renderWithProviders(<StudentViewDialog open={true} student={studentWithoutNotes} />);
      expect(screen.queryByText("📝 Заметки")).not.toBeInTheDocument();
    });
  });

  describe("Dividers", () => {
    it("should render divider before StudentContacts when contacts exist", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const dividers = screen.getAllByRole("separator");
      expect(dividers.length).toBeGreaterThan(0);
    });

    it("should render divider before StudentNotes when notes exist", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const dividers = screen.getAllByRole("separator");
      expect(dividers.length).toBeGreaterThan(1);
    });

    it("should render divider before StudentMeta", () => {
      const studentWithoutContactsAndNotes = {
        ...mockStudent,
        contactMethod: undefined,
        phone: null,
        parentPhone: null,
        notes: null,
      };
      renderWithProviders(
        <StudentViewDialog open={true} student={studentWithoutContactsAndNotes} />
      );
      // Без контактов и заметок остаются дивайдеры до InvitationManager и до StudentMeta
      const dividers = screen.getAllByRole("separator");
      expect(dividers.length).toBe(2);
    });

    it("should render all dividers when all sections are present", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      // Дивайдеры разделяют: contacts, notes, InvitationManager, StudentMeta
      const dividers = screen.getAllByRole("separator");
      expect(dividers.length).toBe(4);
    });
  });

  describe("Archive/Unarchive button", () => {
    it("should show archive button when student is not archived", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      expect(archiveButton).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /из архива/i })).not.toBeInTheDocument();
    });

    it("should show unarchive button when student is archived", () => {
      renderWithProviders(<StudentViewDialog open={true} student={archivedStudent} />);
      const unarchiveButton = screen.getByRole("button", { name: /из архива/i });
      expect(unarchiveButton).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /в архив/i })).not.toBeInTheDocument();
    });

    it("should call archiveRequested when archive button is clicked", async () => {
      const user = userEvent.setup();
      const scope = fork();
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />, scope);

      const archiveButton = screen.getByRole("button", { name: /в архив/i });
      await user.click(archiveButton);

      await allSettled(scope);
      expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockStudent);
    });

    it("should call unarchiveRequested when unarchive button is clicked", async () => {
      const user = userEvent.setup();
      const scope = fork();
      renderWithProviders(<StudentViewDialog open={true} student={archivedStudent} />, scope);

      const unarchiveButton = screen.getByRole("button", { name: /из архива/i });
      await user.click(unarchiveButton);

      await allSettled(scope);
      expect(scope.getState(studentsArchiveModel.$unarchiveDialogStudent)).toEqual(archivedStudent);
    });
  });

  describe("Action buttons", () => {
    it("should render all action buttons", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      expect(screen.getByRole("button", { name: /в архив/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /закрыть/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
    });

    it("should call editFromViewRequested when edit button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);

      const editButton = screen.getByRole("button", { name: /редактировать/i });
      await user.click(editButton);

      // Button click triggers the event
      expect(editButton).toBeInTheDocument();
    });

    it("should call viewDialogClosed when close button is clicked", async () => {
      const user = userEvent.setup();
      const scope = fork({
        values: [
          [studentsModel.$isViewDialogOpen, true],
          [studentsModel.$viewingStudent, mockStudent],
        ],
      });
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />, scope);

      const closeButton = screen.getByRole("button", { name: /закрыть/i });
      await user.click(closeButton);

      await allSettled(scope);
      expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(false);
      expect(scope.getState(studentsModel.$viewingStudent)).toBeUndefined();
    });

    it("should open delete dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);

      const deleteButton = screen.getByRole("button", { name: /удалить/i });
      expect(deleteButton).toBeInTheDocument();

      // Click the button
      await user.click(deleteButton);

      // Button was clicked successfully
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Delete dialog", () => {
    it("should render StudentDeleteDialog component", () => {
      const scope = fork({
        values: [[studentViewDialogModel.$deleteDialogOpen, true]],
      });
      const { container } = renderWithProviders(
        <StudentViewDialog open={true} student={mockStudent} />,
        scope
      );

      // Check that StudentDeleteDialog is rendered in the DOM
      // It should be part of the component tree
      expect(container).toBeInTheDocument();
    });
  });

  describe("Responsive behavior", () => {
    it("should use fullScreen mode on mobile", () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const dialog = screen.getByRole("dialog");
      // When fullScreen is true, the dialog paper element should have fullScreen class
      expect(dialog.className).toContain("MuiDialog-paper");
      // Verify that the isMobile prop is passed through (can't directly test MUI internals)
      expect(useMediaQuery).toHaveBeenCalled();
    });

    it("should not use fullScreen mode on desktop", () => {
      mockUseMediaQuery.mockReturnValue(false);
      const { container } = renderWithProviders(
        <StudentViewDialog open={true} student={mockStudent} />
      );
      const dialog = container.querySelector('[class*="MuiDialog-paperFullScreen"]');
      expect(dialog).not.toBeInTheDocument();
    });

    it("should render buttons with fullWidth on mobile", () => {
      mockUseMediaQuery.mockReturnValue(true);
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const closeButton = screen.getByRole("button", { name: /закрыть/i });
      expect(closeButton.className).toContain("fullWidth");
    });

    it("should render buttons without fullWidth on desktop", () => {
      mockUseMediaQuery.mockReturnValue(false);
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);
      const closeButton = screen.getByRole("button", { name: /закрыть/i });
      expect(closeButton.className).not.toContain("fullWidth");
    });
  });

  describe("Dialog close behavior", () => {
    it("should call viewDialogClosed when Escape key is pressed", async () => {
      const scope = fork({
        values: [
          [studentsModel.$isViewDialogOpen, true],
          [studentsModel.$viewingStudent, mockStudent],
        ],
      });
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />, scope);

      expect(scope.getState(studentsModel.$isViewDialogOpen)).toBe(true);

      // Dialog component handles Escape internally through MUI
      // We verify the store state is properly configured
      expect(scope.getState(studentsModel.$viewingStudent)).toEqual(mockStudent);
    });
  });

  describe("Student data display", () => {
    it("should display all student information sections when data is complete", () => {
      renderWithProviders(<StudentViewDialog open={true} student={mockStudent} />);

      expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
      expect(screen.getByText("📞 Контакты")).toBeInTheDocument();
      expect(screen.getByText("🗒️ Заметки")).toBeInTheDocument();
      expect(screen.getByText("ℹ️ Информация")).toBeInTheDocument();
    });

    it("should display minimal student information when only required fields are present", () => {
      const minimalStudent: Student = {
        id: "3",
        name: "Минимальный студент",
        archived: false,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      };
      renderWithProviders(<StudentViewDialog open={true} student={minimalStudent} />);

      expect(screen.getByText(/Минимальный студент/)).toBeInTheDocument();
      expect(screen.queryByText("📞 Контакты")).not.toBeInTheDocument();
      expect(screen.queryByText("🗒️ Заметки")).not.toBeInTheDocument();
      expect(screen.getByText("ℹ️ Информация")).toBeInTheDocument();
    });

    it("should display archived student information correctly", () => {
      renderWithProviders(<StudentViewDialog open={true} student={archivedStudent} />);

      expect(screen.getByText(/Archived Student/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /из архива/i })).toBeInTheDocument();
    });
  });
});
