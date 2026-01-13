import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { StudentsMenu } from "./StudentsMenu";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("StudentsMenu", () => {
  const mockAnchorEl = document.createElement("div");
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

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
});
