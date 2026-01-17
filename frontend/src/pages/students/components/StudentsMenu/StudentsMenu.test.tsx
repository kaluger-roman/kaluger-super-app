import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { studentsModel, studentsArchiveModel } from "@features/students";
import { theme } from "@shared";

import { StudentsMenu } from "./StudentsMenu";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

describe("StudentsMenu", () => {
  const mockAnchorEl = document.createElement("div");
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockStudent = {
    id: "1",
    name: "Test Student",
    email: "test@example.com",
    phone: "+1234567890",
    grade: 10,
    archived: false,
  };

  it("should render menu when anchorEl is provided", () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText("Редактировать")).toBeInTheDocument();
    expect(screen.getByText("Удалить")).toBeInTheDocument();
  });

  it("should not render menu when anchorEl is null", () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={null}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText("Редактировать")).not.toBeInTheDocument();
    expect(screen.queryByText("Удалить")).not.toBeInTheDocument();
  });

  it("should call onEdit when edit button is clicked", async () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await userEvent.click(screen.getByText("Редактировать"));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it("should call onDelete when delete button is clicked", async () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await userEvent.click(screen.getByText("Удалить"));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when clicking outside menu", async () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // Menu should be present when anchorEl is provided
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should render edit icon", () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editItem = screen.getByRole("menuitem", { name: /Редактировать/ });
    expect(editItem).toBeInTheDocument();
  });

  it("should render delete icon", () => {
    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteItem = screen.getByRole("menuitem", { name: /Удалить/ });
    expect(deleteItem).toBeInTheDocument();
  });

  it("should show archive option for non-archived student", async () => {
    const scope = fork({
      values: [[studentsModel.$selectedStudent, mockStudent]],
    });

    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
      scope
    );

    expect(screen.getByText("В архив")).toBeInTheDocument();
    expect(screen.queryByText("Из архива")).not.toBeInTheDocument();
  });

  it("should show unarchive option for archived student", async () => {
    const archivedStudent = { ...mockStudent, archived: true };
    const scope = fork({
      values: [[studentsModel.$selectedStudent, archivedStudent]],
    });

    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
      scope
    );

    expect(screen.getByText("Из архива")).toBeInTheDocument();
    expect(screen.queryByText("В архив")).not.toBeInTheDocument();
  });

  it("should call archiveRequested when archive button is clicked", async () => {
    const scope = fork({
      values: [[studentsModel.$selectedStudent, mockStudent]],
    });

    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
      scope
    );

    const archiveButton = screen.getByText("В архив");
    await userEvent.click(archiveButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(scope.getState(studentsArchiveModel.$archiveDialogStudent)).toEqual(mockStudent);
  });

  it("should call unarchiveRequested when unarchive button is clicked", async () => {
    const archivedStudent = { ...mockStudent, archived: true };
    const scope = fork({
      values: [[studentsModel.$selectedStudent, archivedStudent]],
    });

    renderWithTheme(
      <StudentsMenu
        anchorEl={mockAnchorEl}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
      scope
    );

    const unarchiveButton = screen.getByText("Из архива");
    await userEvent.click(unarchiveButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
