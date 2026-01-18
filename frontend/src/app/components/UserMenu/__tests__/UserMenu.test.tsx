/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { theme } from "@shared";

import { UserMenu } from "../UserMenu";

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </BrowserRouter>
  );

describe("UserMenu", () => {
  it("should not render when anchorEl is null", () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(<UserMenu anchorEl={null} onClose={onClose} />);

    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();
  });

  it("should render menu when anchorEl is provided", () => {
    const onClose = vi.fn();
    const anchorEl = document.createElement("div");

    renderWithProviders(<UserMenu anchorEl={anchorEl} onClose={onClose} />);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Мои данные")).toBeInTheDocument();
  });

  it("should navigate to profile page when clicking profile menu item", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const anchorEl = document.createElement("div");

    renderWithProviders(<UserMenu anchorEl={anchorEl} onClose={onClose} />);

    await user.click(screen.getByText("Мои данные"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close menu when onClose is called", () => {
    const onClose = vi.fn();
    const anchorEl = document.createElement("div");

    const { rerender } = renderWithProviders(<UserMenu anchorEl={anchorEl} onClose={onClose} />);

    expect(screen.getByRole("menu")).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <UserMenu anchorEl={null} onClose={onClose} />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
