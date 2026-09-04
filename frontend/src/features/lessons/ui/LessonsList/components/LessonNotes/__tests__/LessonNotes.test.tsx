import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { theme } from "@shared";

import { LessonNotes } from "../LessonNotes";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight"
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight"
);

const stubOverflow = ({ overflowing }: { overflowing: boolean }) => {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 40,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => (overflowing ? 120 : 40),
  });
};

const restoreMetrics = () => {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
  }
};

describe("LessonNotes", () => {
  afterEach(() => {
    restoreMetrics();
  });

  describe("Short note (fits without clamping)", () => {
    beforeEach(() => {
      stubOverflow({ overflowing: false });
    });

    it("should render the note text in full", () => {
      renderWithTheme(<LessonNotes notes="Короткая заметка" />);

      expect(screen.getByText(/Короткая заметка/)).toBeInTheDocument();
    });

    it("should not render the expand control when the note fits", () => {
      renderWithTheme(<LessonNotes notes="Короткая заметка" />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Long note (clamped)", () => {
    beforeEach(() => {
      stubOverflow({ overflowing: true });
    });

    it("should render the expand control when the note is clamped", () => {
      renderWithTheme(<LessonNotes notes="Очень длинная заметка" />);

      expect(screen.getByRole("button", { name: "Развернуть заметку" })).toBeInTheDocument();
    });

    it("should expand the note on click and reveal the collapse control", async () => {
      renderWithTheme(<LessonNotes notes={"Абзац один\nАбзац два\nАбзац три"} />);

      await userEvent.click(screen.getByRole("button", { name: "Развернуть заметку" }));

      expect(screen.getByRole("button", { name: "Свернуть заметку" })).toBeInTheDocument();
      expect(screen.getByText(/Абзац один/)).toBeInTheDocument();
    });

    it("should collapse the note back on a second click", async () => {
      renderWithTheme(<LessonNotes notes="Очень длинная заметка" />);

      await userEvent.click(screen.getByRole("button", { name: "Развернуть заметку" }));
      await userEvent.click(screen.getByRole("button", { name: "Свернуть заметку" }));

      expect(screen.getByRole("button", { name: "Развернуть заметку" })).toBeInTheDocument();
    });

    it("should stop propagation and not trigger a parent onClick when toggled", async () => {
      const onParentClick = vi.fn();

      renderWithTheme(
        <div onClick={onParentClick}>
          <LessonNotes notes="Очень длинная заметка" />
        </div>
      );

      await userEvent.click(screen.getByRole("button", { name: "Развернуть заметку" }));

      expect(onParentClick).not.toHaveBeenCalled();
    });

    it("should expose accessible expanded state that flips on toggle", async () => {
      renderWithTheme(<LessonNotes notes="Очень длинная заметка" />);

      const toggle = screen.getByRole("button", { name: "Развернуть заметку" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(toggle);

      expect(
        screen.getByRole("button", { name: "Свернуть заметку" })
      ).toHaveAttribute("aria-expanded", "true");
    });

    it("should keep expand state independent for each card", async () => {
      renderWithTheme(
        <div>
          <div data-testid="card-a">
            <LessonNotes notes="Заметка A длинная" />
          </div>
          <div data-testid="card-b">
            <LessonNotes notes="Заметка B длинная" />
          </div>
        </div>
      );

      const cardA = within(screen.getByTestId("card-a"));
      const cardB = within(screen.getByTestId("card-b"));

      await userEvent.click(cardA.getByRole("button", { name: "Развернуть заметку" }));

      expect(cardA.getByRole("button", { name: "Свернуть заметку" })).toBeInTheDocument();
      expect(cardB.getByRole("button", { name: "Развернуть заметку" })).toBeInTheDocument();
    });

    it("should render a very long unbroken word without breaking (overflow-wrap applied)", () => {
      const url = `https://example.com/${"a".repeat(400)}`;

      renderWithTheme(<LessonNotes notes={url} />);

      expect(screen.getByText(new RegExp("https://example.com"))).toBeInTheDocument();
    });
  });
});
