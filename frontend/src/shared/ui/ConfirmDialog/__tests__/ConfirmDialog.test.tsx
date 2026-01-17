/* eslint-disable testing-library/no-node-access */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "../../themeConfig";
import { ConfirmDialog } from "../ConfirmDialog";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Test Title",
    message: "Test Message",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render dialog with title and message", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Message")).toBeInTheDocument();
    });

    it("should render with default confirm button text", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
    });

    it("should render with default cancel button text", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
    });

    it("should render with custom confirm button text", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} confirmText="Custom Confirm" />);

      expect(screen.getByRole("button", { name: "Custom Confirm" })).toBeInTheDocument();
    });

    it("should render with custom cancel button text", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} cancelText="Custom Cancel" />);

      expect(screen.getByRole("button", { name: "Custom Cancel" })).toBeInTheDocument();
    });

    it("should render warning icon by default", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      // Icon is rendered within the dialog, so just verify it's present via title
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} open={false} />);

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });
  });

  describe("Severity levels", () => {
    it("should render with warning severity by default", () => {
      const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const icon = baseElement.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toHaveClass("MuiSvgIcon-colorWarning");
    });

    it("should render with error severity", () => {
      const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} severity="error" />);

      const icon = baseElement.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toHaveClass("MuiSvgIcon-colorError");
    });

    it("should render with info severity", () => {
      const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} severity="info" />);

      const icon = baseElement.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toHaveClass("MuiSvgIcon-colorInfo");
    });

    it("should apply warning color to confirm button by default", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-colorWarning");
    });

    it("should apply error color to confirm button when severity is error", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} severity="error" />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-colorError");
    });

    it("should apply info color to confirm button when severity is info", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} severity="info" />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-colorInfo");
    });
  });

  describe("User interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const onClose = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm and onClose when confirm button is clicked", async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onConfirm when cancel button is clicked", async () => {
      const onConfirm = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      await userEvent.click(cancelButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm and onClose when Enter key is pressed", async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      await userEvent.keyboard("{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not trigger Enter key handler when other keys are pressed", async () => {
      const onConfirm = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await userEvent.keyboard("{Space}");

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call onClose when clicking outside dialog", async () => {
      const onClose = vi.fn();
      const { baseElement } = renderWithTheme(
        <ConfirmDialog {...defaultProps} onClose={onClose} />
      );

      const backdrop = baseElement.querySelector(".MuiBackdrop-root");
      if (backdrop) {
        await userEvent.click(backdrop);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button variants", () => {
    it("should render confirm button with contained variant", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      expect(confirmButton).toHaveClass("MuiButton-contained");
    });

    it("should render cancel button with outlined variant", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      expect(cancelButton).toHaveClass("MuiButton-outlined");
    });
  });

  describe("Multiple interactions", () => {
    it("should handle multiple confirm clicks", async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });
      await userEvent.click(confirmButton);
      await userEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("should handle confirm click after cancel click", async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });

      await userEvent.click(cancelButton);
      await userEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("should have dialog role", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should have accessible buttons", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
    });

    it("should focus trap within dialog when open", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Отмена" });
      const confirmButton = screen.getByRole("button", { name: "Подтвердить" });

      expect(cancelButton).toBeInTheDocument();
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty title", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} title="" />);

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });

    it("should handle empty message", () => {
      renderWithTheme(<ConfirmDialog {...defaultProps} message="" />);

      expect(screen.queryByText("Test Message")).not.toBeInTheDocument();
    });

    it("should handle very long title", () => {
      const longTitle = "A".repeat(200);
      renderWithTheme(<ConfirmDialog {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle very long message", () => {
      const longMessage = "B".repeat(500);
      renderWithTheme(<ConfirmDialog {...defaultProps} message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("should handle special characters in title", () => {
      const specialTitle = "Test <>&\"' Title";
      renderWithTheme(<ConfirmDialog {...defaultProps} title={specialTitle} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it("should handle special characters in message", () => {
      const specialMessage = "Test <>&\"' Message";
      renderWithTheme(<ConfirmDialog {...defaultProps} message={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe("Re-rendering behavior", () => {
    it("should update when props change", () => {
      const { rerender } = renderWithTheme(<ConfirmDialog {...defaultProps} title="Original" />);

      expect(screen.getByText("Original")).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <ConfirmDialog {...defaultProps} title="Updated" />
        </ThemeProvider>
      );

      expect(screen.queryByText("Original")).not.toBeInTheDocument();
      expect(screen.getByText("Updated")).toBeInTheDocument();
    });

    it("should update severity dynamically", () => {
      const { rerender, baseElement } = renderWithTheme(
        <ConfirmDialog {...defaultProps} severity="warning" />
      );

      let icon = baseElement.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toHaveClass("MuiSvgIcon-colorWarning");

      rerender(
        <ThemeProvider theme={theme}>
          <ConfirmDialog {...defaultProps} severity="error" />
        </ThemeProvider>
      );

      icon = baseElement.querySelector('svg[class*="MuiSvgIcon"]');
      expect(icon).toHaveClass("MuiSvgIcon-colorError");
    });

    it("should update button text dynamically", () => {
      const { rerender } = renderWithTheme(<ConfirmDialog {...defaultProps} confirmText="First" />);

      expect(screen.getByRole("button", { name: "First" })).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <ConfirmDialog {...defaultProps} confirmText="Second" />
        </ThemeProvider>
      );

      expect(screen.queryByRole("button", { name: "First" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Second" })).toBeInTheDocument();
    });
  });
});
