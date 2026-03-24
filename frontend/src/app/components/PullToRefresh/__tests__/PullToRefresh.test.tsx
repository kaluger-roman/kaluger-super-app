import { ThemeProvider } from "@mui/material";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "@shared";

import { PullToRefresh } from "../PullToRefresh";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return { ...actual };
});

const mockIsInStandaloneMode = vi.fn(() => false);

vi.mock("@shared/lib/platform.helpers", () => ({
  isIos: vi.fn(() => false),
  isInStandaloneMode: () => mockIsInStandaloneMode(),
}));

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("PullToRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  it("should render children in browser mode without wrapper", () => {
    mockIsInStandaloneMode.mockReturnValue(false);

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    expect(screen.getByText("Контент")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("should render children in standalone mode with touch wrapper", () => {
    mockIsInStandaloneMode.mockReturnValue(true);

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    expect(screen.getByText("Контент")).toBeInTheDocument();
  });

  it("should show spinner during pull down in standalone mode", () => {
    mockIsInStandaloneMode.mockReturnValue(true);

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    const wrapper = screen.getByText("Контент").parentElement!;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 50 }] });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should not show spinner when scrolled down", () => {
    mockIsInStandaloneMode.mockReturnValue(true);
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    const wrapper = screen.getByText("Контент").parentElement!;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 100 }] });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("should reset pull distance on touch end below threshold", () => {
    mockIsInStandaloneMode.mockReturnValue(true);

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    const wrapper = screen.getByText("Контент").parentElement!;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 30 }] });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    fireEvent.touchEnd(wrapper);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("should trigger reload when pull exceeds threshold", () => {
    mockIsInStandaloneMode.mockReturnValue(true);
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    const wrapper = screen.getByText("Контент").parentElement!;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(wrapper);

    expect(reloadMock).toHaveBeenCalled();
  });

  it("should not react to upward swipe", () => {
    mockIsInStandaloneMode.mockReturnValue(true);

    renderWithTheme(
      <PullToRefresh>
        <span>Контент</span>
      </PullToRefresh>
    );

    const wrapper = screen.getByText("Контент").parentElement!;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 50 }] });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
