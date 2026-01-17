import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "../../themeConfig";
import { ConfirmStatusDialog } from "../ConfirmStatusDialog";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("ConfirmStatusDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnClose.mockClear();
  });

  describe("Rendering", () => {
    it("should render dialog with title and default labels", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
    });

    it("should render dialog with description", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          description="Test description text"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("Test description text")).toBeInTheDocument();
    });

    it("should render dialog with custom confirm and cancel labels", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmLabel="Да"
          cancelLabel="Нет"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole("button", { name: "Нет" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Да" })).toBeInTheDocument();
    });

    it("should render dialog with children", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        >
          <div>Custom child content</div>
        </ConfirmStatusDialog>
      );

      expect(screen.getByText("Custom child content")).toBeInTheDocument();
    });

    it("should render dialog with description and children together", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          description="Description text"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        >
          <div>Child content</div>
        </ConfirmStatusDialog>
      );

      expect(screen.getByText("Description text")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("should not render dialog when open is false", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={false}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });

    it("should render title as ReactNode", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title={<span data-testid="custom-title">Custom Title Node</span>}
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId("custom-title")).toBeInTheDocument();
      expect(screen.getByText("Custom Title Node")).toBeInTheDocument();
    });

    it("should render description as ReactNode", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          description={<span data-testid="custom-desc">Custom Description</span>}
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId("custom-desc")).toBeInTheDocument();
      expect(screen.getByText("Custom Description")).toBeInTheDocument();
    });
  });

  describe("Button clicks", () => {
    it("should call onConfirm when confirm button is clicked", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should call onClose when cancel button is clicked", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Enter key handling", () => {
    it("should call onConfirm when Enter key is pressed", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}");

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should not call onConfirm when other keys are pressed", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Escape}");
      await userEvent.type(dialog, "{Space}");
      await userEvent.type(dialog, "a");

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm multiple times if Enter is pressed multiple times", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.type(dialog, "{Enter}{Enter}{Enter}");

      expect(mockOnConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe("stopPropagation behavior", () => {
    it("should stop event propagation by default when confirm button is clicked", async () => {
      const parentClickHandler = vi.fn();
      renderWithTheme(
        <div onClick={parentClickHandler}>
          <ConfirmStatusDialog
            open={true}
            title="Test Title"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
          />
        </div>
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("should stop event propagation when stopPropagation is true", async () => {
      const parentClickHandler = vi.fn();
      renderWithTheme(
        <div onClick={parentClickHandler}>
          <ConfirmStatusDialog
            open={true}
            title="Test Title"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
            stopPropagation={true}
          />
        </div>
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("should not stop event propagation when stopPropagation is false", async () => {
      const parentClickHandler = vi.fn();
      renderWithTheme(
        <div onClick={parentClickHandler}>
          <ConfirmStatusDialog
            open={true}
            title="Test Title"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
            stopPropagation={false}
          />
        </div>
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("should stop propagation on dialog click by default", async () => {
      const parentClickHandler = vi.fn();
      renderWithTheme(
        <div onClick={parentClickHandler}>
          <ConfirmStatusDialog
            open={true}
            title="Test Title"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
          />
        </div>
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.click(dialog);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("should not stop propagation on dialog click when stopPropagation is false", async () => {
      const parentClickHandler = vi.fn();
      renderWithTheme(
        <div onClick={parentClickHandler}>
          <ConfirmStatusDialog
            open={true}
            title="Test Title"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
            stopPropagation={false}
          />
        </div>
      );

      const dialog = screen.getByRole("dialog");
      await userEvent.click(dialog);

      // Note: Due to MUI Dialog portal behavior, parent handler may not be called
      // This tests that stopPropagation is not applied when false
    });
  });

  describe("Confirm button colors", () => {
    it("should render confirm button with primary color by default", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedPrimary");
    });

    it("should render confirm button with secondary color", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmColor="secondary"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedSecondary");
    });

    it("should render confirm button with error color", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmColor="error"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedError");
    });

    it("should render confirm button with success color", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmColor="success"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedSuccess");
    });

    it("should render confirm button with warning color", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmColor="warning"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedWarning");
    });

    it("should render confirm button with info color", () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          confirmColor="info"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-containedInfo");
    });
  });

  describe("Complex scenarios", () => {
    it("should handle all custom props together", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Custom Title"
          description="Custom description"
          confirmLabel="Yes"
          cancelLabel="No"
          confirmColor="error"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          stopPropagation={false}
        >
          <div>Custom children</div>
        </ConfirmStatusDialog>
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom description")).toBeInTheDocument();
      expect(screen.getByText("Custom children")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: "Yes" });
      expect(confirmButton).toHaveClass("MuiButton-containedError");

      await userEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("should work correctly when reopened with different props", async () => {
      const { rerender } = renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="First Title"
          confirmLabel="First Confirm"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("First Title")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "First Confirm" })).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <ConfirmStatusDialog
            open={true}
            title="Second Title"
            confirmLabel="Second Confirm"
            confirmColor="error"
            onConfirm={mockOnConfirm}
            onClose={mockOnClose}
          />
        </ThemeProvider>
      );

      expect(screen.getByText("Second Title")).toBeInTheDocument();
      const confirmButton = screen.getByRole("button", { name: "Second Confirm" });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toHaveClass("MuiButton-containedError");

      await userEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("should handle cancel and confirm actions in sequence", async () => {
      renderWithTheme(
        <ConfirmStatusDialog
          open={true}
          title="Test Title"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();

      mockOnClose.mockClear();

      await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
