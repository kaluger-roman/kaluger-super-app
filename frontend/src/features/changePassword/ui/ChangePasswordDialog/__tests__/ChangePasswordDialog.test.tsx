/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { theme } from "@shared";

import { changePasswordModel } from "../../../models";
import { ChangePasswordDialog } from "../ChangePasswordDialog";

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

const renderWithProviders = (scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ChangePasswordDialog />
        </BrowserRouter>
      </ThemeProvider>
    </EffectorProvider>,
  );

describe("ChangePasswordDialog — forgot password link", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("should always show forgot password link, regardless of error state", () => {
    const noErrorScope = fork({
      values: [
        [changePasswordModel.$isDialogOpen, true],
        [changePasswordModel.$error, null],
      ],
    });

    const { unmount } = renderWithProviders(noErrorScope);
    expect(screen.getByText("Забыли пароль?")).toBeInTheDocument();
    unmount();

    const errorScope = fork({
      values: [
        [changePasswordModel.$isDialogOpen, true],
        [changePasswordModel.$error, "Пароли не совпадают"],
      ],
    });

    renderWithProviders(errorScope);
    expect(screen.getByText("Забыли пароль?")).toBeInTheDocument();
  });

  it("should navigate to /forgot-password on link click", async () => {
    const user = userEvent.setup();
    const scope = fork({
      values: [[changePasswordModel.$isDialogOpen, true]],
    });

    renderWithProviders(scope);

    await user.click(screen.getByText("Забыли пароль?"));

    expect(navigateMock).toHaveBeenCalledWith("/forgot-password");
  });
});
