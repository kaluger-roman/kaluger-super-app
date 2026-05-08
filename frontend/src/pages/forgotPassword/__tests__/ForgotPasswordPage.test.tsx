/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { theme } from "@shared";

import { ForgotPasswordPage } from "../ForgotPasswordPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const renderPage = () =>
  render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <ForgotPasswordPage />
      </ThemeProvider>
    </BrowserRouter>,
  );

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("should render stub heading and description", () => {
    renderPage();

    expect(screen.getByText("Восстановление пароля")).toBeInTheDocument();
    expect(screen.getByText(/находится в разработке/i)).toBeInTheDocument();
  });

  it("should navigate back when clicking the back button", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
