import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { theme } from "../../theme";
import { RecurringLessonBadge } from "../RecurringLessonBadge";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("RecurringLessonBadge", () => {
  describe("chip variant", () => {
    it("should render chip with label and icon by default", () => {
      renderWithTheme(<RecurringLessonBadge />);

      expect(screen.getByText("Регулярный")).toBeInTheDocument();
      expect(screen.getByTestId("RepeatIcon")).toBeInTheDocument();
    });

    it("should render chip variant when explicitly specified", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" />);

      expect(screen.getByText("Регулярный")).toBeInTheDocument();
      expect(screen.getByTestId("RepeatIcon")).toBeInTheDocument();
    });

    it("should render small size by default", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" />);

      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-sizeSmall");
    });

    it("should render medium size when specified", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" size="medium" />);

      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-sizeMedium");
    });

    it("should have primary color", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" />);

      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-colorPrimary");
    });

    it("should have outlined variant", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" />);

      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-outlined");
    });
  });

  describe("icon variant", () => {
    it("should render icon without label", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" />);

      expect(screen.queryByText("Регулярный")).not.toBeInTheDocument();
      expect(screen.getByTestId("RepeatIcon")).toBeInTheDocument();
    });

    it("should show tooltip on hover", async () => {
      const user = userEvent.setup();
      renderWithTheme(<RecurringLessonBadge variant="icon" />);

      const icon = screen.getByTestId("RepeatIcon");
      await user.hover(icon);

      expect(await screen.findByText("Повторяющийся урок")).toBeInTheDocument();
    });

    it("should render small size by default", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" />);

      const icon = screen.getByTestId("RepeatIcon");
      expect(icon).toBeInTheDocument();
    });

    it("should render medium size when specified", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" size="medium" />);

      const icon = screen.getByTestId("RepeatIcon");
      expect(icon).toBeInTheDocument();
    });

    it("should have primary color", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" />);

      const icon = screen.getByTestId("RepeatIcon");
      expect(icon).toHaveClass("MuiSvgIcon-colorPrimary");
    });
  });

  describe("default props", () => {
    it("should use chip variant by default", () => {
      renderWithTheme(<RecurringLessonBadge />);

      expect(screen.getByText("Регулярный")).toBeInTheDocument();
    });

    it("should use small size by default", () => {
      renderWithTheme(<RecurringLessonBadge />);

      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-sizeSmall");
    });

    it("should use small size with icon variant by default", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" />);

      const icon = screen.getByTestId("RepeatIcon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("rendering combinations", () => {
    it("should render chip with small size", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" size="small" />);

      expect(screen.getByText("Регулярный")).toBeInTheDocument();
      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-sizeSmall");
    });

    it("should render chip with medium size", () => {
      renderWithTheme(<RecurringLessonBadge variant="chip" size="medium" />);

      expect(screen.getByText("Регулярный")).toBeInTheDocument();
      const chip = screen.getByText("Регулярный").parentElement;
      expect(chip).toHaveClass("MuiChip-sizeMedium");
    });

    it("should render icon with small size", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" size="small" />);

      expect(screen.queryByText("Регулярный")).not.toBeInTheDocument();
      expect(screen.getByTestId("RepeatIcon")).toBeInTheDocument();
    });

    it("should render icon with medium size", () => {
      renderWithTheme(<RecurringLessonBadge variant="icon" size="medium" />);

      expect(screen.queryByText("Регулярный")).not.toBeInTheDocument();
      expect(screen.getByTestId("RepeatIcon")).toBeInTheDocument();
    });
  });
});
