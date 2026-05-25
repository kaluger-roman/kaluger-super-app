/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";
import type { User } from "@shared/types";

import { UserAvatar } from "../UserAvatar";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockUser: User = {
  id: "1",
  email: "test@test.com",
  name: "Test User",
  createdAt: new Date().toISOString(),
  isEmailVerified: true,
  taxEnabled: false,
};

describe("UserAvatar", () => {
  it("should render user initials", () => {
    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} />);

    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("should render user name on desktop", () => {
    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should not render user name on mobile", () => {
    renderWithTheme(<UserAvatar user={mockUser} isMobile={true} />);

    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} onClick={onClick} />);

    await user.click(screen.getByText("TU"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when no handler provided", async () => {
    const user = userEvent.setup();

    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} />);

    await user.click(screen.getByText("TU"));
    // Should not throw error
  });

  it("should handle single word name", () => {
    const singleNameUser = { ...mockUser, name: "John" };
    renderWithTheme(<UserAvatar user={singleNameUser} isMobile={false} />);

    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("should handle three word name and show only first two initials", () => {
    const threeNameUser = { ...mockUser, name: "John Paul Smith" };
    renderWithTheme(<UserAvatar user={threeNameUser} isMobile={false} />);

    expect(screen.getByText("JP")).toBeInTheDocument();
  });

  it("should expose role=button, tabIndex and aria-label when onClick is provided", () => {
    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} onClick={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /меню пользователя test user/i });
    expect(trigger).toHaveAttribute("tabindex", "0");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should invoke onClick via Enter keypress when focused", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} onClick={onClick} />);

    const trigger = screen.getByRole("button", { name: /меню пользователя/i });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should not expose button semantics when onClick is absent", () => {
    renderWithTheme(<UserAvatar user={mockUser} isMobile={false} />);

    expect(
      screen.queryByRole("button", { name: /меню пользователя/i })
    ).not.toBeInTheDocument();
  });
});
