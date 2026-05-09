/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { authApi, theme } from "@shared";

import { ResetPasswordPage } from "../ResetPasswordPage";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      verifyResetToken: vi.fn(),
      resetPassword: vi.fn(),
    },
  };
});

const renderPage = (search: string) =>
  render(
    <EffectorProvider value={fork()}>
      <MemoryRouter initialEntries={[`/reset-password${search}`]}>
        <ThemeProvider theme={theme}>
          <ResetPasswordPage />
        </ThemeProvider>
      </MemoryRouter>
    </EffectorProvider>,
  );

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show invalid-link message when token is missing from URL", () => {
    renderPage("");

    expect(screen.getByText(/Ссылка некорректна/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Запросить новую ссылку" })).toBeInTheDocument();
  });

  it("should pass token from URL to ResetPasswordForm and trigger verifyResetToken", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });

    renderPage("?token=abc123");

    await waitFor(() => {
      expect(authApi.verifyResetToken).toHaveBeenCalledWith({ token: "abc123" });
    });
    expect(screen.getByRole("heading", { name: "Установка нового пароля" })).toBeInTheDocument();
  });
});
